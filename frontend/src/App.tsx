import { useState } from 'react';
import { scanPath } from './api';
import type { FileNode } from './api';
import { VisualTree } from './components/VisualTree';
import { SidePanel } from './components/SidePanel';

function App() {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputPath, setInputPath] = useState('/');
  const [error, setError] = useState<string | null>(null);

  const performScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scanPath(inputPath);
      setTree(data);
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '100%', padding: '0', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="card" style={{ margin: '1rem', marginBottom: '0', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NuxView</h1>
            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>Interactive Linux File Explorer</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="/etc or /home..."
              style={{ width: '300px' }}
              onKeyDown={(e) => e.key === 'Enter' && performScan()}
            />
            <button className="button" onClick={performScan} disabled={loading}>
              {loading ? 'Scanning...' : 'Scan Path'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{ margin: '1rem', borderColor: '#ef4444', color: '#ef4444' }}>
          Error: {error}
        </div>
      )}

      {/* Main Content Area: Side Panel + Graph */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <SidePanel data={tree} />

        <div style={{ flex: 1, position: 'relative' }}>
          {tree ? (
            <VisualTree data={tree} />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <p>Enter a path above to start exploring</p>
              <p style={{ fontSize: '0.8rem' }}>Defaulting to root (/) for full system scan</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
         @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
         .side-tree-item:hover { background: rgba(255, 255, 255, 0.05); }
       `}</style>
    </div>
  );
}

export default App;
