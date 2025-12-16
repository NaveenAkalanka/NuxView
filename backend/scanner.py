import os
import logging
from typing import List, Optional, Set
from models import FileNode

logger = logging.getLogger("nuxview.scanner")

DEFAULT_EXCLUDES = {"proc", "sys", "dev", "run", "tmp", "var/lib/docker", "lost+found"}

def scan_directory(
    root_path: str, 
    max_depth: Optional[int] = None, 
    excludes: Optional[List[str]] = None
) -> Optional[FileNode]:
    """
    Scans a directory recursively and returns a FileNode tree.
    Only includes directories. Skips symlinks and excluded names.
    """
    root_path = os.path.abspath(root_path)
    
    exclude_set = set(DEFAULT_EXCLUDES)
    if excludes:
        exclude_set.update(excludes)

    def _scan(current_path: str, current_depth: int) -> Optional[FileNode]:
        if max_depth is not None and current_depth > max_depth:
            return None
        
        name = os.path.basename(current_path)
        if not name: 
            # Handle root being "/" or "C:\"
            name = current_path
        
        # Check against excludes (simple name check)
        if name in exclude_set:
            return None

        node = FileNode(name=name, path=current_path, children=[])
        
        try:
            with os.scandir(current_path) as it:
                entries = sorted(list(it), key=lambda x: x.name.lower())
                for entry in entries:
                    if entry.name in exclude_set:
                        continue
                    if entry.is_symlink():
                        continue
                    if not entry.is_dir():
                        continue
                    
                    # Recursion
                    child_node = _scan(entry.path, current_depth + 1)
                    if child_node:
                        if node.children is None:
                            node.children = []
                        node.children.append(child_node)

        except PermissionError:
            logger.warning(f"Permission denied: {current_path}")
        except Exception as e:
            logger.error(f"Error scanning {current_path}: {e}")

        return node

    return _scan(root_path, 0)
