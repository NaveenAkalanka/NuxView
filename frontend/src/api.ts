import axios from 'axios';

// In development, we point to localhost:4897 (or whatever port backend runs on).
// But for typical Vite dev, we might need proxy or hardcode.
// User requirement: CLI starts backend on 4897.
// In dev: Vite runs on 5173, backend on 8000 (usually) or 4897.
// I will assume backend on 4897.

const API_BASE = import.meta.env.DEV ? 'http://localhost:4897' : '';

export const api = axios.create({
  baseURL: API_BASE,
});

export interface FileNode {
  name: string;
  path: string;
  type: string;
  children?: FileNode[];
}

export const scanPath = async (path: string, maxDepth: number = 3, excludes: string[] = []) => {
  const res = await api.post<{ tree: FileNode }>('/api/scan', { path, max_depth: maxDepth, excludes });
  return res.data.tree;
};

export const scanNode = async (path: string, excludes: string[] = []) => {
  const res = await api.post<{ node: FileNode }>('/api/scan/node', { path, excludes });
  return res.data.node;
};

export const getTree = async () => {
  const res = await api.get<FileNode>('/api/tree');
  return res.data;
};

export const checkHealth = async () => {
  try {
    await api.get('/api/health');
    return true;
  } catch {
    return false;
  }
}
