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
        # Initial assumption: has_children=False until we find a child
        node = FileNode(name=name, path=path, children=[], has_children=False)
        nodes[path] = node
        
        if path == root_path:
            root_node = node
            continue
            
        parent_path = os.path.dirname(path)
        if parent_path in nodes:
            parent = nodes[parent_path]
            if parent.children is None:
                parent.children = []
            parent.children.append(node)
            parent.has_children = True # Mark parent as having children
            
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

def scan_with_python(root_path: str, max_depth: int = 1, excludes: Optional[List[str]] = None) -> Optional[FileNode]:
    """Native Python fallback using os.scandir (slower but works everywhere)."""
    root_path = os.path.abspath(root_path)
    if not os.path.isdir(root_path): return None
    
    name = os.path.basename(root_path) or "/"
    root = FileNode(name=name, path=root_path, type="directory", children=[], has_children=False)
    
    exclude_list = DEFAULT_EXCLUDES + (excludes or [])
    
    # helper for checking exclusions
    def is_excluded(p: str):
         return any(ex in p for ex in exclude_list)

    if max_depth <= 0:
        # Check if it has any subdirectories to set has_children flag (Peek 1 level deep)
        try:
            with os.scandir(root_path) as it:
                for entry in it:
                     if entry.is_dir() and not is_excluded(entry.path):
                         root.has_children = True
                         break
        except: pass
        return root
    
    try:
        with os.scandir(root_path) as it:
            for entry in it:
                if entry.is_dir():
                    path = entry.path
                    # Check exclusions
                    if is_excluded(path): continue
                    
                    child = scan_with_python(path, max_depth - 1, excludes)
                    if child:
                        root.children.append(child)
                        root.has_children = True # Mark current as having children since we found one
        return root
    except PermissionError:
        return root # Silent fail for perms
    except Exception as e:
        logger.error(f"Python scan failed at {root_path}: {e}")
        return root

def scan_directory(root_path, max_depth=1, excludes=None):
    """Primary entry point: Tries shell scan, falls back to Python."""
    # For depth 1, Python is faster and safer
    if max_depth == 1:
        return scan_with_python(root_path, 1, excludes)
        
    try:
        # Check if find exists
        import shutil
        if shutil.which("find"):
            return scan_with_find(root_path, max_depth, excludes)
    except:
        pass
        
    logger.warning(f"Shell scan unavailable, falling back to Python for {root_path}")
    return scan_with_python(root_path, max_depth, excludes)

def scan_directory_parallel(root_path, max_depth=50, excludes=None):
    return scan_directory(root_path, max_depth, excludes)

