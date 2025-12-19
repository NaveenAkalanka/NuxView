import { useState, useEffect, useRef } from 'react';
import { scanPath, getTree, startFullScan, getScanStatus } from './api';
import type { FileNode } from './api';
import { VisualTree } from './components/VisualTree';
import { SidePanel } from './components/SidePanel';
import { RefreshCcw, Search, Database } from 'lucide-react';

function App() {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [inputPath, setInputPath] = useState('/');
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);

  const checkScanningStatus = async () => {
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
        }
        // Always try to load if not scanning (ensures sync)
        loadCache();
      }
    } catch (e) { /* ignore */ }
  };

  const loadCache = async () => {
    try {
      const data = await getTree();
      if (data && data.root) {
        setTree(data.root);
        setLastSynced(data.timestamp);
        if (data.path) setInputPath(data.path);
      }
    } catch (err) { /* ignore */ }
  };

  useEffect(() => {
    checkScanningStatus();
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    }
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
  }

  return (
    <div className="container" style={{ maxWidth: '100%', padding: '0', height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

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
      <div className="card" style={{ margin: '1rem', marginBottom: '0', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NuxView</h1>
            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
              {lastSynced ? `Loaded from Cache • ${lastSynced}` : 'No local cache found.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div className="input-group" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '2px' }}>
              <input
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="/"
                style={{ background: 'transparent', border: 'none', color: 'white', padding: '6px 12px', width: '250px', outline: 'none' }}
              />
              <button onClick={quickScan} title="Quick Preview (Depth 1)" style={{ background: 'transparent', border: 'none', color: 'white', padding: '6px', cursor: 'pointer', opacity: 0.7 }}>
                <Search size={18} />
              </button>
            </div>
            <button className="button" onClick={handleFullScan} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary-color)' }}>
              <Database size={16} />
              Full System Scan
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ margin: '1rem', borderColor: '#ef4444', color: '#ef4444' }}>Error: {error}</div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', opacity: isScanning ? 0.3 : 1, transition: 'opacity 0.5s' }}>
        <SidePanel data={tree} />
        <div style={{ flex: 1, position: 'relative' }}>
          {tree ? (
            <VisualTree data={tree} />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <p>No system data loaded.</p>
              <button className="button" onClick={handleFullScan} style={{ marginTop: '1rem' }}>Run First Scan</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
         .spinning { animation: spin 2s linear infinite; }
         @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
       `}</style>
    </div>
  );
}

export default App;
