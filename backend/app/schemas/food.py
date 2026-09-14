from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class FoodListingOut(BaseModel):
    id: Optional[str] = None
    _id: Optional[str] = None
    sellerId: Any
    name: str
    description: Optional[str] = ""
    image: Optional[str] = ""
    price: float
    quantity: int
    remainingQuantity: int
    mealType: str
    date: Any
    readyTime: str
    pickupAvailable: Optional[bool] = True
    deliveryAvailable: Optional[bool] = False
    deliveryRadiusKm: Optional[float] = 0.0
    deliveryFee: Optional[float] = 0.0
    dietaryType: str
    ingredients: Optional[List[str]] = []
    allergens: Optional[List[str]] = []
    status: Optional[str] = "active"
    distanceKm: Optional[float] = None
    isDemo: Optional[bool] = False
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class FoodListResponse(BaseModel):
    listings: List[Dict[str, Any]]

class FoodDetailResponse(BaseModel):
    listing: Dict[str, Any]
    otherListings: List[Dict[str, Any]] = []

class FoodCreateResponse(BaseModel):
    listing: Dict[str, Any]
    message: str = "Your food is now live on GharSe."
