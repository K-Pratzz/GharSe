from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ComplaintCreateRequest(BaseModel):
    orderId: str
    category: str
    description: str

class ComplaintUpdateRequest(BaseModel):
    status: Optional[str] = None
    resolution: Optional[str] = None

class ComplaintResponse(BaseModel):
    complaint: Dict[str, Any]

class ComplaintListResponse(BaseModel):
    complaints: List[Dict[str, Any]]
