import { useState, useEffect, useMemo } from 'react';
import { getTree, scanPath } from './api';
import type { FileNode } from './api';
import { FileTree } from './components/FileTree';
import { Search, RefreshCw, FolderSearch, AlertCircle } from 'lucide-react';
import './index.css';

const filterTree = (node: FileNode, query: string): FileNode | null => {
  if (!query) return node;
  const lowerQuery = query.toLowerCase();

  let filteredChildren: FileNode[] = [];
  if (node.children) {
    filteredChildren = node.children
      .map(c => filterTree(c, query))
      .filter((c): c is FileNode => c !== null);
  }

  // If this node matches OR has matching children, return it (with filtered children)
  if (node.name.toLowerCase().includes(lowerQuery) || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }

  return null;
};

function App() {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
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
      // If "No scan yet", data might default to empty or a wrapper
      if (data.path) {
        setTree(data);
        setInputPath(data.path);
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
      // Don't show error on first load, maybe backend just started fresh or no scan yet
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!inputPath) return;
    setLoading(true);
    setError(null);
    try {
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

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    return filterTree(tree, search);
  }, [tree, search]);

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: '2rem', marginTop: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FolderSearch size={32} color="#38bdf8" />
          NuxView
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Linux Directory Explorer
          {lastScan && <span> • Last scan: {lastScan}</span>}
        </p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <input
              className="input"
              value={inputPath}
              onChange={e => setInputPath(e.target.value)}
              placeholder="/path/to/scan"
            />
          </div>
          <button className="btn" onClick={handleScan} disabled={loading} style={{ minWidth: '100px', justifyContent: 'center' }}>
            <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            className="input"
            style={{ paddingLeft: '2.5rem' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter folders..."
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Tree */}
      <div className="card" style={{ minHeight: '400px', overflowX: 'auto', padding: '1rem' }}>
        {filteredTree ? (
          <FileTree node={filteredTree} forceOpen={search.length > 0} />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem 0' }}>
            {tree ? 'No results matching filter.' : 'No directory scanned yet. Enter a path above to start.'}
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
