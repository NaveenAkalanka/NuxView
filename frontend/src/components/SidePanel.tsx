import React, { useState } from 'react';
import { Folder, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { scanNode } from '../api';
import type { FileNode } from '../api';

interface TreeItemProps {
    node: FileNode;
    depth: number;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, depth }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [children, setChildren] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const toggle = async () => {
        const nextState = !isOpen;
        setIsOpen(nextState);

        if (nextState && !hasLoaded) {
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
        }
    };

    return (
        <div style={{ marginLeft: depth > 0 ? '1rem' : 0 }}>
            <div
                onClick={toggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                }}
                className="side-tree-item"
            >
                {loading ? (
                    <Loader2 size={12} className="spinning" />
                ) : (
                    children.length > 0 || !hasLoaded ? (
                        isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : (
                        <div style={{ width: 14 }} />
                    )
                )}
                <Folder size={14} style={{ opacity: 0.7, color: 'var(--primary-color)' }} />
                <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.name || '/'}
                </span>
            </div>
            {isOpen && (
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: '0.4rem' }}>
                    {children.map((child) => (
                        <TreeItem key={child.path} node={child} depth={depth + 1} />
                    ))}
                    {hasLoaded && children.length === 0 && (
                        <div style={{ padding: '4px 20px', fontSize: '0.7rem', opacity: 0.3 }}>(Empty)</div>
                    )}
                </div>
            )}
        </div>
    );
};

export const SidePanel: React.FC<{ data: FileNode | null }> = ({ data }) => {
    return (
        <div style={{
            width: '300px',
            height: '100%',
            borderRight: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Directory Explorer
            </h3>
            {!data ? (
                <div style={{ opacity: 0.4, fontSize: '0.8rem' }}>No data...</div>
            ) : (
                <TreeItem node={data} depth={0} />
            )}
        </div>
    );
};
