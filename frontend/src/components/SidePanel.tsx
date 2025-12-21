import React, { useState } from 'react';
import { Folder, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { scanNode } from '../api';
import type { FileNode } from '../api';

import { useRef, useEffect } from 'react';
import { getFolderColor } from '../utils/theme';

interface TreeItemProps {
    node: FileNode;
    depth: number;
    selectedPath: string | null;
    onSelect: (path: string) => void;
    onContextMenu?: (x: number, y: number, path: string) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, depth, selectedPath, onSelect, onContextMenu }) => {
    // Start collapsed by default
    const [isOpen, setIsOpen] = useState(false);
    // Use existing children if provided (Level 1 in root)
    const [children, setChildren] = useState<FileNode[]>(node.children || []);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(node.children && node.children.length > 0);
    const itemRef = useRef<HTMLDivElement>(null);

    const isSelected = selectedPath === node.path;
    const color = getFolderColor(node.path, depth);

    useEffect(() => {
        if (isSelected && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            // Auto-expand parents? That requires parent-aware state or passing "expandParent" callback up.
            // For now, let's assume the user navigates, or we might need a context for global expand.
        }
    }, [isSelected]);

    // Extract load logic for reuse
    const loadChildren = async () => {
        setLoading(true);
        try {
            const refreshed = await scanNode(node.path);
            if (refreshed && refreshed.children) {
                setChildren(refreshed.children);
            }
            setHasLoaded(true);
        } catch (err) {
            console.error("Failed to load side panel node", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSelected && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isSelected]);

    // Auto-Expand Logic: If selectedPath is inside this folder, open it.
    useEffect(() => {
        if (selectedPath && selectedPath.startsWith(node.path) && selectedPath !== node.path) {
            if (!isOpen) {
                setIsOpen(true);
            }
            // Ensure children are loaded so nested items can also match
            if (!hasLoaded && !loading && children.length === 0) {
                loadChildren();
            }
        }
    }, [selectedPath, node.path, isOpen, hasLoaded, loading]);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(node.path);

        const nextState = !isOpen;
        setIsOpen(nextState);

        // If we have no children and haven't tried loading yet, fetch them
        if (nextState && !hasLoaded && children.length === 0) {
            await loadChildren();
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onContextMenu) {
            onContextMenu(e.clientX, e.clientY, node.path);
        }
    };

    return (
        <div style={{ marginLeft: depth > 0 ? '1rem' : 0 }}>
            <div
                ref={itemRef}
                onClick={handleClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    border: isSelected ? `1px solid ${color}` : '1px solid transparent',
                    userSelect: 'none'
                }}
                className="side-tree-item"
                onContextMenu={handleContextMenu}
            >
                {loading ? (
                    <Loader2 size={12} className="spinning" />
                ) : (
                    // Show chevron if it might have children or we haven't checked yet
                    (children.length > 0 || !hasLoaded) ? (
                        isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : (
                        <div style={{ width: 14 }} />
                    )
                )}
                <Folder size={14} style={{ color: color, opacity: isSelected ? 1 : 0.7 }} />
                <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', color: isSelected ? '#fff' : 'var(--text-secondary)' }}>
                    {node.name || '/'}
                </span>
            </div>
            {isOpen && (
                <div style={{ borderLeft: `1px solid ${color}33`, marginLeft: '0.4rem' }}>
                    {children.map((child) => (
                        <TreeItem key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} onContextMenu={onContextMenu} />
                    ))}
                    {hasLoaded && children.length === 0 && (
                        <div style={{ padding: '4px 20px', fontSize: '0.7rem', opacity: 0.3 }}>(Empty)</div>
                    )}
                </div>
            )}
        </div>
    );
};

export const SidePanel: React.FC<{
    data: FileNode | null,
    selectedPath: string | null,
    onSelect: (path: string) => void,
    onContextMenu?: (x: number, y: number, path: string) => void
}> = ({ data, selectedPath, onSelect, onContextMenu }) => {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: 'var(--card-bg)',
            overflowY: 'auto',
            overflowX: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Folder size={16} style={{ color: 'var(--primary-color)' }} />
                <h3 style={{ fontSize: '0.9rem', margin: 0, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Explorer
                </h3>
            </div>
            {!data ? (
                <div style={{ opacity: 0.4, fontSize: '0.8rem' }}>No data...</div>
            ) : (
                <TreeItem node={data} depth={0} selectedPath={selectedPath} onSelect={onSelect} onContextMenu={onContextMenu} />
            )}
        </div>
    );
};
