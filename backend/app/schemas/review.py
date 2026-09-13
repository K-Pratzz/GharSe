from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ReviewCreateRequest(BaseModel):
    orderId: str
    rating: int
    comment: Optional[str] = ""

class ReviewResponse(BaseModel):
    review: Dict[str, Any]

class ReviewListResponse(BaseModel):
    reviews: List[Dict[str, Any]]
