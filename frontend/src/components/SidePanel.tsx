import React from 'react';
import { Folder, ChevronRight, ChevronDown } from 'lucide-react';
import type { FileNode } from '../api';

interface SidePanelProps {
    data: FileNode | null;
}

const TreeItem: React.FC<{ node: FileNode; depth: number }> = ({ node, depth }) => {
    const [isOpen, setIsOpen] = React.useState(depth < 2);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div style={{ marginLeft: depth > 0 ? '1rem' : 0 }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    cursor: hasChildren ? 'pointer' : 'default',
                    borderRadius: '4px',
                    hover: { background: 'rgba(255,255,255,0.05)' }
                } as any}
                className="side-tree-item"
            >
                {hasChildren ? (
                    isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                ) : (
                    <div style={{ width: 14 }} />
                )}
                <Folder size={14} style={{ opacity: 0.7 }} />
                <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.name || '/'}
                </span>
            </div>
            {isOpen && hasChildren && (
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: '0.4rem' }}>
                    {node.children!.map((child, i) => (
                        <TreeItem key={i} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const SidePanel: React.FC<SidePanelProps> = ({ data }) => {
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
