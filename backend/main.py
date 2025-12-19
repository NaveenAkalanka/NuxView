import os
import json
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Body, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from scanner import scan_directory_parallel, scan_directory, global_scan_status
from models import FileNode

# Config
# Ensure we use the user's home directory for storage
HOME_DIR = Path(os.path.expanduser("~")) / ".nuxview"
DATA_DIR = HOME_DIR / "data"
LOG_DIR = HOME_DIR / "logs"
TREE_FILE = DATA_DIR / "linux_folder_tree.json"

# Logging setup
if not LOG_DIR.exists():
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
    except:
        pass

logging.basicConfig(
    filename=LOG_DIR / "nuxview.log" if LOG_DIR.exists() else None,
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("nuxview")

app = FastAPI(title="NuxView")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanRequest(BaseModel):
    path: str
    max_depth: Optional[int] = 3 # Lower default for speed
    excludes: Optional[List[str]] = []

@app.post("/api/scan/full")
def scan_full(req: ScanRequest, background_tasks: BackgroundTasks):
    """Starts a full parallel scan in the background."""
    if global_scan_status.is_scanning:
        return {"status": "already_scanning", "progress": global_scan_status.progress}

    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail=f"Path not found: {req.path}")

    def background_scan():
        logger.info(f"Starting background full scan for {req.path}")
        tree = scan_directory_parallel(req.path, req.max_depth or 50, req.excludes)
        if tree:
            import time
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            save_data = {
                "timestamp": timestamp,
                "path": req.path,
                "tree": tree.model_dump()
            }
            try:
                if not DATA_DIR.exists():
                    DATA_DIR.mkdir(parents=True, exist_ok=True)
                with open(TREE_FILE, "w") as f:
                    json.dump(save_data, f, indent=2)
                logger.info("Background scan completed and saved.")
            except Exception as e:
                logger.error(f"Failed to save background scan: {e}")

    background_tasks.add_task(background_scan)
    return {"status": "started"}

@app.get("/api/scan/status")
def get_scan_status():
    """Returns the current background scan progress."""
    return {
        "is_scanning": global_scan_status.is_scanning,
        "progress": global_scan_status.progress,
        "scanned": global_scan_status.scanned_dirs,
        "total": global_scan_status.total_dirs,
        "error": global_scan_status.error
    }

@app.post("/api/scan")
def scan(req: ScanRequest):
    # Keep legacy for shallow scans if needed, but point to parallel
    tree = scan_directory_parallel(req.path, req.max_depth or 3, req.excludes)
    return {"status": "success", "tree": tree}

@app.post("/api/scan/node")
def scan_node(req: ScanRequest):
    """Scan only one level deep for lazy loading."""
    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail=f"Path not found: {req.path}")
    
    logger.info(f"Node-scan for {req.path}")
    try:
        # Depth 1 only
        tree = scan_directory(req.path, 1, req.excludes)
    except Exception as e:
        logger.error(f"Node-scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"status": "success", "node": tree}

@app.get("/api/tree")
def get_tree():
    """Returns the cached tree root, or falls back to a live root scan."""
    # 1. Try Cache File
    if TREE_FILE.exists():
        try:
            with open(TREE_FILE, "r") as f:
                data = json.load(f)
            
            # Return root and its immediate children (Level 1 only)
            root_data = data.get("tree", {})
            shallow_children = []
            if "children" in root_data and root_data["children"]:
                for child in root_data["children"]:
                    shallow_children.append({
                        "name": child.get("name"),
                        "path": child.get("path"),
                        "type": "directory",
                        "children": []
                    })

            return {
                "status": "success",
                "timestamp": data.get("timestamp"),
                "path": data.get("path"),
                "root": {
                    "name": root_data.get("name"),
                    "path": root_data.get("path"),
                    "type": "directory",
                    "children": shallow_children
                }
            }
        except Exception as e:
            logger.error(f"Cache broken: {e}. Falling back to live...")

    # 2. Live Fallback (No cache or cache broken)
    try:
        root_path = "/" # Default
        if os.name == 'nt': root_path = "C:\\" # Windows support
        
        logger.info(f"Performing LIVE fallback scan for {root_path}")
        live_root = scan_directory(root_path, 1)
        if live_root:
            return {
                "status": "success",
                "timestamp": "Live (No Cache)",
                "path": root_path,
                "root": live_root.model_dump()
            }
    except Exception as e:
        logger.error(f"Live fallback failed: {e}")

    return {"status": "error", "detail": "Could not load tree (Cache missing & Live fail)"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

# Serving Static Files
# We expect the frontend build to be in a directory named 'frontend' sibling to 'backend' directory in production
# Struct: ~/.nuxview/app/backend/main.py  -> ~/.nuxview/app/frontend
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
else:
    logger.warning(f"Frontend directory not found at {FRONTEND_DIR}. Running in API-only mode.")
