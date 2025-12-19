import os
import subprocess
import logging
import threading
from typing import List, Optional, Dict, Any
from models import FileNode

logger = logging.getLogger("nuxview.scanner")

DEFAULT_EXCLUDES = ["/proc", "/sys", "/dev", "/run", "/tmp", "/var/lib/docker", "/lost+found"]

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

global_scan_status = ScanStatus()

def paths_to_tree(paths: List[str], root_path: str) -> Optional[FileNode]:
    """Converts a flat list of paths into a hierarchical FileNode structure."""
    if not paths:
        return None
    
    # Sort paths by length to ensure parents are processed before children
    paths = sorted(paths, key=len)
    
    nodes: Dict[str, FileNode] = {}
    root_node = None
    
    for path in paths:
        if not path: continue
        name = os.path.basename(path) or "/"
        node = FileNode(name=name, path=path, children=[])
        nodes[path] = node
        
        if path == root_path:
            root_node = node
            continue
            
        parent_path = os.path.dirname(path)
        if parent_path in nodes:
            if nodes[parent_path].children is None:
                nodes[parent_path].children = []
            nodes[parent_path].children.append(node)
            
    return root_node

def scan_with_find(root_path: str, max_depth: int = 50, excludes: Optional[List[str]] = None) -> Optional[FileNode]:
    """Scans the file system using the native Linux 'find' command for maximum speed."""
    root_path = os.path.abspath(root_path)
    global_scan_status.update(is_scanning=True, progress=0, error=None)
    
    exclude_args = []
    # Build exclusion arguments for find
    for ex in DEFAULT_EXCLUDES:
        exclude_args.extend(["-not", "-path", f"{ex.rstrip('/')}*"])
    if excludes:
        for ex in excludes:
            exclude_args.extend(["-not", "-path", f"*{ex}*"])

    command = [
        "find", root_path,
        "-maxdepth", str(max_depth),
        "-type", "d"
    ] + exclude_args

    logger.info(f"Executing shell scan: {' '.join(command)}")
    
    try:
        # Merge stderr into stdout to prevent buffer deadlocks
        # Also use -noleaf for minor speed boost on some FS, and skip hidden by default
        command = [
            "find", root_path,
            "-maxdepth", str(max_depth),
            "-type", "d"
        ] + exclude_args

        process = subprocess.Popen(
            command, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.DEVNULL, # Ignore permission denied spam
            text=True,
            bufsize=1 # Line buffered
        )
        
        paths = []
        global_scan_status.update(progress=10)
        
        # Read paths
        for line in process.stdout:
            p = line.strip()
            if p:
                paths.append(p)
                if len(paths) % 500 == 0:
                     # More granular progress: 10% to 85%
                     global_scan_status.update(progress=min(85, 10 + (len(paths) // 500)))
        
        process.wait()
        
        if not paths:
            logger.warning("Find command returned no paths.")
            global_scan_status.update(is_scanning=False, error="No directories found.")
            return None

        global_scan_status.update(progress=90)
        logger.info(f"Parsing {len(paths)} paths into tree...")
        tree = paths_to_tree(paths, root_path)
        global_scan_status.update(is_scanning=False, progress=100)
        return tree

    except Exception as e:
        logger.error(f"Shell scan threw exception: {e}")
        global_scan_status.update(is_scanning=False, error=str(e))
        return None

# Keep compatible signature
def scan_directory_parallel(root_path, max_depth=50, excludes=None):
    return scan_with_find(root_path, max_depth, excludes)

def scan_directory(root_path, max_depth=5, excludes=None):
    return scan_with_find(root_path, max_depth, excludes)
