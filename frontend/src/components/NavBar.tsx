import React from 'react';
import { Search, Monitor, Terminal, Info } from 'lucide-react';

interface NavBarProps {
    inputPath: string;
    setInputPath: (path: string) => void;
    onQuickScan: () => void;
    onFullScan: () => void;
    lastSynced: string | null;
    onNavigate: (view: 'home' | 'about') => void;
}

export const NavBar: React.FC<NavBarProps> = ({ inputPath, setInputPath, onQuickScan, onFullScan, lastSynced, onNavigate }) => {
    return (
        <div className="nav-area frame" style={{ flexDirection: 'row', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
            {/* Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => onNavigate('home')}>
                    <img src="/NuxView.svg" alt="NuxView" style={{ width: '32px', height: '32px', filter: 'brightness(0) invert(1)' }} />
                    <div>
                        <h1 style={{
                            fontSize: '1.2rem',
                            margin: 0,
                            background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 700,
                            letterSpacing: '-0.02em'
                        }}>
                            NuxView
                        </h1>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            System Visualizer
                        </div>
                    </div>
                </div>

                <div style={{ width: '1px', height: '24px', background: 'var(--frame-border)' }} />

                <button className="btn-icon" title="About Page" onClick={() => onNavigate('about')}>
                    <Info size={18} />
                </button>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, maxWidth: '600px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input
                            value={inputPath}
                            onChange={(e) => setInputPath(e.target.value)}
                            className="input-modern"
                            placeholder="/path/to/scan"
                            style={{ width: '100%', paddingLeft: '36px' }}
                        />
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    </div>
                    <button className="btn-icon" onClick={onQuickScan} title="Quick Peek (Depth 1)">
                        <Terminal size={18} />
                    </button>
                </div>

                <button className="btn-modern" onClick={onFullScan}>
                    <Monitor size={16} />
                    <span>Full Scan</span>
                </button>
            </div>

            {/* System Info */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.75rem', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Connected</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                    {lastSynced ? `Synced: ${lastSynced}` : 'Waiting for scan...'}
                </div>
                <div style={{ color: 'var(--accent-color)', opacity: 0.8, marginTop: '2px', fontSize: '0.7rem' }}>
                    DEV: NAVEEN AKALANKA
                </div>
            </div>
        </div>
    );
};
