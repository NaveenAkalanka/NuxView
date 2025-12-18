import os
import json
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from scanner import scan_directory
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

@app.post("/api/scan")
def scan(req: ScanRequest):
    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail=f"Path not found: {req.path}")
    
    # User requested 'full' so let's bump default significantly if they didn't specify
    # But UI will handle the simplified view. 
    # Use 50 as 'practically infinite' for most systems without crashing recursion limit.
    depth = req.max_depth if req.max_depth is not None else 50
    
    logger.info(f"Scanning {req.path} with max_depth={depth}")
    try:
        tree = scan_directory(req.path, depth, req.excludes)
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    if not tree:
         # Could be excluded or empty
         pass
            
    # Save
    if not DATA_DIR.exists():
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.error(f"Failed to create data dir: {e}")
    
    try:
        with open(TREE_FILE, "w") as f:
            f.write(tree.model_dump_json(indent=2))
    except Exception as e:
        logger.error(f"Failed to save tree file: {e}")
        # We generally continue, but maybe warn?
        
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
    if not TREE_FILE.exists():
        return {"name": "No scan yet", "path": "", "children": []}
    
    try:
        with open(TREE_FILE, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        logger.error(f"Failed to read tree file: {e}")
        raise HTTPException(status_code=500, detail="Failed to load tree")

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
