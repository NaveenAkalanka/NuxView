import os
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Dict, Any
from models import FileNode

logger = logging.getLogger("nuxview.scanner")

DEFAULT_EXCLUDES = {"proc", "sys", "dev", "run", "tmp", "var/lib/docker", "lost+found", ".git", "node_modules"}

class ScanStatus:
    def __init__(self):
        self.is_scanning = False
        self.progress = 0
        self.total_dirs = 0
        self.scanned_dirs = 0
        self.error = None
        self._lock = threading.Lock()

    def update(self, **kwargs):
        with self._lock:
            for k, v in kwargs.items():
                setattr(self, k, v)
            if self.total_dirs > 0:
                self.progress = int((self.scanned_dirs / self.total_dirs) * 100)

global_scan_status = ScanStatus()

def scan_directory_parallel(
    root_path: str, 
    max_depth: int = 50,
    excludes: Optional[List[str]] = None
) -> Optional[FileNode]:
    """
    Parallel directory scanner using ThreadPoolExecutor.
    """
    root_path = os.path.abspath(root_path)
    exclude_set = set(DEFAULT_EXCLUDES)
    if excludes:
        exclude_set.update(excludes)

    global_scan_status.update(is_scanning=True, progress=0, scanned_dirs=0, total_dirs=1, error=None)

    def _scan_immediate(path: str) -> List[str]:
        """Returns list of sub-directory paths."""
        try:
            with os.scandir(path) as it:
                return [entry.path for entry in it 
                        if entry.is_dir() and not entry.is_symlink() and entry.name not in exclude_set]
        except (PermissionError, OSError):
            return []

    # Map of path -> FileNode
    tree_map: Dict[str, FileNode] = {}
    tree_lock = threading.Lock()

    def _worker(path: str, depth: number):
        if depth > max_depth:
            return

        name = os.path.basename(path) or path
        node = FileNode(name=name, path=path, children=[])
        
        with tree_lock:
            tree_map[path] = node

        sub_paths = _scan_immediate(path)
        if sub_paths:
            with global_scan_status._lock:
                global_scan_status.total_dirs += len(sub_paths)

            # Parallelize children if depth is low (avoid too many tiny tasks)
            if depth < 3:
                with ThreadPoolExecutor(max_workers=8) as executor:
                    futures = [executor.submit(_worker, sp, depth + 1) for sp in sub_paths]
                    for f in futures:
                        child_node = f.result()
                        if child_node:
                            node.children.append(child_node)
            else:
                for sp in sub_paths:
                    child_node = _worker(sp, depth + 1)
                    if child_node:
                        node.children.append(child_node)

        with global_scan_status._lock:
            global_scan_status.scanned_dirs += 1
            if global_scan_status.total_dirs > 0:
                global_scan_status.progress = int((global_scan_status.scanned_dirs / global_scan_status.total_dirs) * 100)
        
        return node

    try:
        root_node = _worker(root_path, 0)
        global_scan_status.update(is_scanning=False, progress=100)
        return root_node
    except Exception as e:
        logger.error(f"Parallel scan failed: {e}")
        global_scan_status.update(is_scanning=False, error=str(e))
        return None

# Keep compatible signature for legacy calls if needed
def scan_directory(root_path, max_depth=5, excludes=None):
    return scan_directory_parallel(root_path, max_depth, excludes)
