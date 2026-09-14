from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class OrderItem(BaseModel):
    listingId: str
    name: str
    price: float
    quantity: int

class OrderCreateRequest(BaseModel):
    listingId: str
    quantity: int
    fulfillmentType: str  # 'pickup' | 'delivery'
    deliveryLocality: Optional[str] = ""
    paymentMethod: Optional[str] = "cash"  # 'cash' | 'upi'

class OrderStatusUpdateRequest(BaseModel):
    status: str
    rejectionReason: Optional[str] = ""

class OrderResponse(BaseModel):
    order: Dict[str, Any]

class OrderListResponse(BaseModel):
    orders: List[Dict[str, Any]]
