from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

class LocationSchema(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None

class RegisterRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: str = "customer"
    locality: Optional[str] = None
    approximateLocation: Optional[LocationSchema] = None
    foodPreferences: Optional[List[str]] = []
    # Seller-specific registration fields
    bio: Optional[str] = ""
    categories: Optional[List[str]] = []
    deliveryRadiusKm: Optional[float] = 2.0
    pickupAvailable: Optional[bool] = True
    deliveryAvailable: Optional[bool] = False

class LoginRequest(BaseModel):
    identifier: str  # email or phone
    password: str

class UserOut(BaseModel):
    id: Optional[str] = None
    _id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    locality: Optional[str] = None
    approximateLocation: Optional[LocationSchema] = None
    foodPreferences: Optional[List[str]] = []
    isDemo: Optional[bool] = False
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True

class SellerProfileOut(BaseModel):
    id: Optional[str] = None
    _id: Optional[str] = None
    userId: Any
    bio: Optional[str] = ""
    categories: Optional[List[str]] = []
    verificationStatus: Optional[str] = "pending"
    verificationNotes: Optional[str] = ""
    profilePhoto: Optional[str] = ""
    deliveryRadiusKm: Optional[float] = 2.0
    pickupAvailable: Optional[bool] = True
    deliveryAvailable: Optional[bool] = False
    rating: Optional[float] = 0.0
    ratingCount: Optional[int] = 0
    totalOrders: Optional[int] = 0
    isDemo: Optional[bool] = False
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]
    sellerProfile: Optional[Dict[str, Any]] = None

class MeResponse(BaseModel):
    user: Dict[str, Any]
    sellerProfile: Optional[Dict[str, Any]] = None
