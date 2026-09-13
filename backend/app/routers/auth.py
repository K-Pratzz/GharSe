from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, MeResponse
from app.utils.security import hash_password, verify_password, sign_token
from app.middleware.auth import get_current_user
from app.models.mongo_utils import serialize_doc

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    name = (payload.name or "").strip()
    email = (payload.email or "").strip().lower() if payload.email else None
    phone = (payload.phone or "").strip() if payload.phone else None
    password = payload.password or ""
    role = payload.role

    if not name or not password or (not email and not phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name, password, and email or phone are required."
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters."
        )

    if role not in ["customer", "seller"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role for self-registration."
        )

    db = get_db()
    # Check if user with same email or phone exists
    query_conditions = []
    if email:
        query_conditions.append({"email": email})
    if phone:
        query_conditions.append({"phone": phone})

    if query_conditions:
        existing = await db.users.find_one({"$or": query_conditions})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email/phone already exists."
            )

    now = datetime.now(timezone.utc)
    password_hash = hash_password(password)

    user_doc = {
        "name": name,
        "email": email,
        "phone": phone,
        "passwordHash": password_hash,
        "role": role,
        "locality": (payload.locality or "").strip() if payload.locality else None,
        "approximateLocation": payload.approximateLocation.dict() if payload.approximateLocation else None,
        "foodPreferences": payload.foodPreferences or [],
        "isDemo": False,
        "createdAt": now,
        "updatedAt": now
    }

    result = await db.users.insert_one(user_doc)
    user_id = result.inserted_id
    user_doc["_id"] = user_id
    user_doc.pop("passwordHash", None)

    seller_profile_doc = None
    if role == "seller":
        seller_profile_doc = {
            "userId": user_id,
            "bio": (payload.bio or "").strip(),
            "categories": payload.categories or [],
            "verificationStatus": "pending",
            "verificationNotes": "",
            "profilePhoto": "",
            "deliveryRadiusKm": payload.deliveryRadiusKm or 2.0,
            "pickupAvailable": payload.pickupAvailable if payload.pickupAvailable is not None else True,
            "deliveryAvailable": payload.deliveryAvailable if payload.deliveryAvailable is not None else False,
            "rating": 0.0,
            "ratingCount": 0,
            "totalOrders": 0,
            "isDemo": False,
            "createdAt": now,
            "updatedAt": now
        }
        sp_result = await db.sellerprofiles.insert_one(seller_profile_doc)
        seller_profile_doc["_id"] = sp_result.inserted_id

    token = sign_token(str(user_id), role)
    return {
        "token": token,
        "user": serialize_doc(user_doc),
        "sellerProfile": serialize_doc(seller_profile_doc)
    }

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    identifier = (payload.identifier or "").strip()
    password = payload.password or ""

    if not identifier or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email/phone and password are required."
        )

    db = get_db()
    user = await db.users.find_one({
        "$or": [
            {"email": identifier.lower()},
            {"phone": identifier}
        ]
    })

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials."
        )

    if not verify_password(password, user.get("passwordHash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials."
        )

    seller_profile = None
    if user.get("role") == "seller":
        seller_profile = await db.sellerprofiles.find_one({"userId": user["_id"]})

    user_id = str(user["_id"])
    role = user.get("role", "customer")
    token = sign_token(user_id, role)

    user_clean = dict(user)
    user_clean.pop("passwordHash", None)

    return {
        "token": token,
        "user": serialize_doc(user_clean),
        "sellerProfile": serialize_doc(seller_profile)
    }

@router.get("/me", response_model=MeResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    db = get_db()
    seller_profile = None
    if current_user.get("role") == "seller":
        seller_profile = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})

    return {
        "user": current_user,
        "sellerProfile": serialize_doc(seller_profile)
    }
