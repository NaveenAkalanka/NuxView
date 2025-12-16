from pydantic import BaseModel
from typing import List, Optional

class FileNode(BaseModel):
    name: str
    path: str
    type: str = "directory"  # explicit type
    children: Optional[List['FileNode']] = None

# Needed for recursive models
FileNode.model_rebuild()
