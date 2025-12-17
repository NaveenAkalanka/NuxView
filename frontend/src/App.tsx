import { useState, useEffect } from 'react';
import { getTree, scanPath } from './api';
import type { FileNode } from './api';
import { VisualTree } from './components/VisualTree';
import { RefreshCw, FolderSearch, AlertCircle } from 'lucide-react';
import './index.css';

function App() {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputPath, setInputPath] = useState('/home');
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    setLoading(true);
    try {
      const data = await getTree();
      if (data.path) {
        setTree(data);
        setInputPath(data.path);
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!inputPath) return;
    setLoading(true);
    setError(null);
    try {
      // Backend now defaults to deep scan (50 levels)
      const newTree = await scanPath(inputPath);
      setTree(newTree);
      setLastScan(new Date().toLocaleTimeString());
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Scan failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '100%', padding: '1rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <FolderSearch size={24} color="#38bdf8" />
            NuxView
          </h1>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Interactive Graph {lastScan && `• Scanned: ${lastScan}`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="input"
            value={inputPath}
            onChange={e => setInputPath(e.target.value)}
            placeholder="/path/to/scan"
            style={{ minWidth: '300px' }}
          />
          <button className="btn" onClick={handleScan} disabled={loading}>
            <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Graph View */}
      <div style={{ flex: 1, position: 'relative' }}>
        {tree ? (
          <VisualTree data={tree} />
        ) : (
          <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            No directory scanned yet. Enter a path above to start visualizing.
          </div>
        )}
      </div>

      <style>{`
         @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
       `}</style>
    </div>
  );
}

export default App;
