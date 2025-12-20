import React, { useEffect, useRef, useState } from 'react';
import { Copy, Info, Search, Shield, FileText } from 'lucide-react';
import { getNodeDetails } from '../api';
import type { NodeDetails } from '../api';

interface ContextMenuProps {
    x: number;
    y: number;
    visible: boolean;
    path: string;
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, visible, path, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [details, setDetails] = useState<NodeDetails | null>(null);
    const [viewerMode, setViewerMode] = useState<'permissions' | 'metadata' | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (visible) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    const relativePath = path.split('/').pop() || path;

    const handleAction = async (action: string) => {
        switch (action) {
            case 'explain_relative':
                window.open(`https://www.google.com/search?q=what is directory ${encodeURIComponent(relativePath)} linux`, '_blank');
                onClose();
                break;
            case 'explain_full':
                window.open(`https://www.google.com/search?q=what is directory ${encodeURIComponent(path)} linux`, '_blank');
                onClose();
                break;
            case 'copy_relative':
                navigator.clipboard.writeText(relativePath);
                onClose();
                break;
            case 'copy_full':
                navigator.clipboard.writeText(path);
                onClose();
                break;
            case 'permissions':
                try {
                    const data = await getNodeDetails(path);
                    setDetails(data);
                    setViewerMode('permissions');
                } catch (e) { console.error(e); alert('Failed to fetch details'); onClose(); }
                break;
            case 'metadata':
                try {
                    const data = await getNodeDetails(path);
                    setDetails(data);
                    setViewerMode('metadata');
                } catch (e) { console.error(e); alert('Failed to fetch details'); onClose(); }
                break;
        }
    };

    if (viewerMode && details) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)'
            }} onClick={() => { setViewerMode(null); onClose(); }}>
                <div style={{
                    background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '1.5rem', width: '400px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    color: 'var(--text-primary)'
                }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {viewerMode === 'permissions' ? <Shield size={20} /> : <FileText size={20} />}
                        {viewerMode === 'permissions' ? 'Folder Permissions' : 'Folder Metadata'}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '0.9rem' }}>
                        <div style={{ opacity: 0.7 }}>Path:</div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{details.path}</div>

                        {viewerMode === 'permissions' ? (
                            <>
                                <div style={{ opacity: 0.7 }}>Owner:</div>
                                <div>{details.owner}</div>
                                <div style={{ opacity: 0.7 }}>Group:</div>
                                <div>{details.group}</div>
                                <div style={{ opacity: 0.7 }}>Permissions:</div>
                                <div style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>
                                    {details.permissions}
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ opacity: 0.7 }}>Size:</div>
                                <div>{details.size} bytes</div>
                                <div style={{ opacity: 0.7 }}>Created:</div>
                                <div>{details.created}</div>
                                <div style={{ opacity: 0.7 }}>Modified:</div>
                                <div>{details.modified}</div>
                                <div style={{ opacity: 0.7 }}>Accessed:</div>
                                <div>{details.accessed}</div>
                                <div style={{ opacity: 0.7 }}>Is Directory:</div>
                                <div>{details.is_dir ? 'Yes' : 'No'}</div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => { setViewerMode(null); onClose(); }}
                        className="button"
                        style={{ width: '100%', marginTop: '1.5rem' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: y,
                left: x,
                zIndex: 9999,
                background: 'var(--card-bg)', // Using theme vars
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '4px',
                minWidth: '220px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
            }}
        >
            <div style={{ padding: '8px 12px', fontSize: '0.8rem', opacity: 0.5, borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                {path}
            </div>

            <MenuItem icon={<Search size={14} />} label="Explain Relative Path" onClick={() => handleAction('explain_relative')} />
            <MenuItem icon={<Search size={14} />} label="Explain Path" onClick={() => handleAction('explain_full')} />
            <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
            <MenuItem icon={<Copy size={14} />} label="Copy Relative Path" onClick={() => handleAction('copy_relative')} />
            <MenuItem icon={<Copy size={14} />} label="Copy Path" onClick={() => handleAction('copy_full')} />
            <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
            <MenuItem icon={<Shield size={14} />} label="Show Folder Permissions" onClick={() => handleAction('permissions')} />
            <MenuItem icon={<Info size={14} />} label="View Folder Metadata" onClick={() => handleAction('metadata')} />
        </div>
    );
};

const MenuItem: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
    <div
        onClick={onClick}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            transition: 'background 0.2s'
        }}
    >
        <span style={{ opacity: 0.7 }}>{icon}</span>
        {label}
    </div>
);
