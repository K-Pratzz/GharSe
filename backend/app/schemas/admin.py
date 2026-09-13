from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AdminStatsResponse(BaseModel):
    customers: int
    sellers: int
    pendingSellers: int
    activeListings: int
    totalOrders: int
    openComplaints: int

class VerifySellerRequest(BaseModel):
    status: str  # verified | rejected | pending
    notes: Optional[str] = None

class UpdateListingStatusRequest(BaseModel):
    status: str  # active | hidden | expired | soldout

class CommissionUpdateRequest(BaseModel):
    commissionPercent: float

class CommissionResponse(BaseModel):
    commissionPercent: float
