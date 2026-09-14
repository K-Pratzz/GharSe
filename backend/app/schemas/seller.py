from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class SellerUpdateRequest(BaseModel):
    bio: Optional[str] = None
    categories: Optional[List[str]] = None
    deliveryRadiusKm: Optional[float] = None
    pickupAvailable: Optional[bool] = None
    deliveryAvailable: Optional[bool] = None

class SellerVerificationRequest(BaseModel):
    notes: Optional[str] = ""

class SellerProfileResponse(BaseModel):
    seller: Dict[str, Any]
    menu: List[Dict[str, Any]] = []
    reviews: List[Dict[str, Any]] = []

class SellerDashboardSummary(BaseModel):
    activeListings: int
    soldOutListings: int
    pendingOrders: int
    totalEarnings: float
    totalCommissionPaid: float

class SellerDashboardResponse(BaseModel):
    seller: Dict[str, Any]
    listings: List[Dict[str, Any]] = []
    recentOrders: List[Dict[str, Any]] = []
    summary: SellerDashboardSummary
