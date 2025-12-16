import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import type { FileNode } from '../api';

interface FileTreeProps {
    node: FileNode;
    level?: number;
    forceOpen?: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({ node, level = 0, forceOpen = false }) => {
    const [isOpen, setIsOpen] = useState(forceOpen);
    const hasChildren = node.children && node.children.length > 0;

    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
        }
    }, [forceOpen]);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div>
            <div
                className="tree-row"
                style={{ paddingLeft: level === 0 ? '0.5rem' : '0.5rem' }}
                onClick={handleClick}
            >
                <span className="tree-toggle">
                    {hasChildren && (
                        isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                </span>

                <span className="tree-folder-icon">
                    {isOpen ? <FolderOpen size={16} /> : <Folder size={16} />}
                </span>

                <span className="tree-label">
                    {node.name}
                </span>
            </div>

            {isOpen && hasChildren && (
                <div className="tree-children">
                    {node.children!.map((child) => (
                        <FileTree
                            key={child.path}
                            node={child}
                            level={level + 1}
                            forceOpen={forceOpen}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
