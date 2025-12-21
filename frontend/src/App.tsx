import { useState, useEffect, useRef, useCallback } from 'react';
import { scanPath, getTree, startFullScan, getScanStatus } from './api';
import type { FileNode } from './api';
import { VisualTree } from './components/VisualTree';
import { SidePanel } from './components/SidePanel';
import { ContextMenu } from './components/ContextMenu';
import { NavBar } from './components/NavBar';
import About from './components/About';
import { RefreshCcw } from 'lucide-react';

function App() {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [inputPath, setInputPath] = useState('/');
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'about'>('home');
  const [mobileTab, setMobileTab] = useState<'explorer' | 'graph'>('explorer');

  const [sidePanelWidth, setSidePanelWidth] = useState(320);
  const isResizing = useRef(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean, path: string }>({
    x: 0, y: 0, visible: false, path: ''
  });

  const pollTimer = useRef<number | null>(null);

  const loadCache = useCallback(async () => {
    try {
      const data = await getTree();
      if (data && data.root) {
        setTree(data.root);
        setLastSynced(data.timestamp);
        if (data.path) setInputPath(data.path);
      }
    } catch (err) { /* ignore */ }
  }, []);

  const checkScanningStatus = useCallback(async () => {
    try {
      const status = await getScanStatus();
      setIsScanning(status.is_scanning);
      setScanProgress(status.progress);

      if (status.error) {
        setError(`Scan Error: ${status.error}`);
        if (pollTimer.current) {
          window.clearInterval(pollTimer.current);
          pollTimer.current = null;
        }
        return;
      }

      if (status.is_scanning) {
        if (!pollTimer.current) {
          pollTimer.current = window.setInterval(checkScanningStatus, 1500);
        }
      } else {
        if (pollTimer.current) {
          window.clearInterval(pollTimer.current);
          pollTimer.current = null;
          loadCache();
        }
      }
    } catch (e) { /* ignore */ }
  }, [loadCache]);

  useEffect(() => {
    // Initial load
    loadCache();
    checkScanningStatus();

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      setSidePanelWidth(prev => {
        const newWidth = e.clientX;
        if (newWidth < 200) return 200;
        if (newWidth > 600) return 600;
        return newWidth;
      });
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  }, []);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection
  }, []);

  const handleFullScan = async () => {
    try {
      setError(null);
      await startFullScan(inputPath);
      setIsScanning(true);
      setScanProgress(0);
      pollTimer.current = window.setInterval(checkScanningStatus, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to start scan');
    }
  };

  const quickScan = async () => {
    setError(null);
    try {
      const data = await scanPath(inputPath, 1);
      setTree(data);
      setLastSynced("Live (Not Cached)");
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    }
  };

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  const handleContextMenu = useCallback((x: number, y: number, path: string) => {
    setContextMenu({ x, y, visible: true, path });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className="app-grid">

      {/* Scanning Overlay */}
      {isScanning && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div className="card" style={{ width: '400px', textAlign: 'center', padding: '2rem' }}>
            <RefreshCcw size={48} className="spinning" style={{ marginBottom: '1rem', color: 'var(--primary-color)' }} />
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Parallel System Scan</h2>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem' }}>Analyzing file system structure in the background. Tree view is locked until complete.</p>

            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div style={{ width: `${scanProgress}%`, height: '100%', background: 'linear-gradient(to right, #38bdf8, #818cf8)', transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span>Progress</span>
              <span>{scanProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {/* Navigation */}
      <NavBar
        inputPath={inputPath}
        setInputPath={setInputPath}
        onQuickScan={quickScan}
        onFullScan={handleFullScan}
        lastSynced={lastSynced}
        onNavigate={setCurrentView}
      />

      {error && (
        <div style={{ padding: '0 16px', color: 'var(--danger)', fontWeight: 500 }}>Error: {error}</div>
      )}

      {/* Main Content Grid */}
      {/* Main Content Grid */}
      {currentView === 'home' ? (
        <div
          className="content-grid"
          style={{
            opacity: isScanning ? 0.3 : 1,
            transition: 'opacity 0.5s',
            // Dynamic grid columns override for desktop
            gridTemplateColumns: window.innerWidth > 768 ? `${sidePanelWidth}px 4px 1fr` : '1fr'
          }}
        >

          {/* Mobile Tab Switcher */}
          <div className="mobile-only mobile-tab-bar">
            <button
              className={`mobile-tab-btn ${mobileTab === 'explorer' ? 'active' : ''}`}
              onClick={() => setMobileTab('explorer')}
            >
              Explorer
            </button>
            <button
              className={`mobile-tab-btn ${mobileTab === 'graph' ? 'active' : ''}`}
              onClick={() => setMobileTab('graph')}
            >
              Graph View
            </button>
          </div>

          <div className={`frame ${mobileTab === 'graph' ? 'mobile-hidden' : ''}`}>
            {tree ? (
              <SidePanel data={tree} selectedPath={selectedPath} onSelect={handleSelect} onContextMenu={handleContextMenu} />
            ) : (
              <div style={{ padding: '16px', opacity: 0.5, fontSize: '0.8rem' }}>No data loaded to explorer.</div>
            )}
          </div>

          {/* Resizer Handle (Desktop Only) */}
          <div
            className="resizer hide-on-mobile"
            onMouseDown={startResizing}
            style={{
              width: '4px',
              background: 'transparent',
              cursor: 'col-resize',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%' // Ensure full height
            }}
          >
            <div style={{ width: '1px', height: '32px', background: 'var(--border-color)' }} />
          </div>

          <div className={`frame ${mobileTab === 'explorer' ? 'mobile-hidden' : ''}`} style={{ position: 'relative' }}>
            {tree ? (
              <VisualTree data={tree} selectedPath={selectedPath} onSelect={handleSelect} onContextMenu={handleContextMenu} />
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <p>No system data loaded.</p>
                <button className="btn-modern" onClick={handleFullScan} style={{ marginTop: '1rem' }}>Run First Scan</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="frame" style={{ flex: 1, margin: '16px', overflow: 'hidden' }}>
          <About />
        </div>
      )}



      <style>{`
         .spinning { animation: spin 2s linear infinite; }
         @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
       `}</style>


      <ContextMenu
        {...contextMenu}
        onClose={closeContextMenu}
      />
    </div>
  );
}

export default App;
