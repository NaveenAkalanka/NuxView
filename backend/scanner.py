import os
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional, Dict, Any, Set
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
                self.progress = min(99, int((self.scanned_dirs / self.total_dirs) * 100))

global_scan_status = ScanStatus()

def scan_directory_parallel(
    root_path: str, 
    max_depth: int = 50,
    excludes: Optional[List[str]] = None
) -> Optional[FileNode]:
    """
    Parallel directory scanner using a single ThreadPoolExecutor to prevent deadlocks.
    """
    root_path = os.path.abspath(root_path)
    exclude_set = set(DEFAULT_EXCLUDES)
    if excludes:
        exclude_set.update(excludes)

    global_scan_status.update(is_scanning=True, progress=0, scanned_dirs=0, total_dirs=1, error=None)

    # Use a single executor for the entire scan
    with ThreadPoolExecutor(max_workers=16) as executor:
        
        def _scan_immediate(path: str) -> List[str]:
            try:
                with os.scandir(path) as it:
                    return [entry.path for entry in it 
                            if entry.is_dir() and not entry.is_symlink() and entry.name not in exclude_set]
            except (PermissionError, OSError):
                return []

        # We'll use a recursive function but use the executor to offload work
        def _worker(current_path: str, current_depth: int) -> Optional[FileNode]:
            if current_depth > max_depth:
                return None

            name = os.path.basename(current_path) or current_path
            node = FileNode(name=name, path=current_path, children=[])

            sub_paths = _scan_immediate(current_path)
            if sub_paths:
                with global_scan_status._lock:
                    global_scan_status.total_dirs += len(sub_paths)

                # Parallelize only top levels to keep overhead low
                if current_depth < 2:
                    futures = [executor.submit(_worker, sp, current_depth + 1) for sp in sub_paths]
                    for f in as_completed(futures):
                        child = f.result()
                        if child:
                            node.children.append(child)
                else:
                    for sp in sub_paths:
                        child = _worker(sp, current_depth + 1)
                        if child:
                            node.children.append(child)

            with global_scan_status._lock:
                global_scan_status.scanned_dirs += 1
                if global_scan_status.total_dirs > 0:
                    global_scan_status.progress = min(99, int((global_scan_status.scanned_dirs / global_scan_status.total_dirs) * 100))
            
            return node

        try:
            root_node = _worker(root_path, 0)
            global_scan_status.update(is_scanning=False, progress=100)
            return root_node
        except Exception as e:
            logger.error(f"Parallel scan failed: {e}")
            global_scan_status.update(is_scanning=False, error=str(e))
            return None

def scan_directory(root_path, max_depth=5, excludes=None):
    return scan_directory_parallel(root_path, max_depth, excludes)
