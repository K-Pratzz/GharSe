from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_db
from app.config import settings
from app.middleware.auth import require_role
from app.models.mongo_utils import serialize_doc, serialize_docs, parse_object_id
from app.schemas.admin import VerifySellerRequest, UpdateListingStatusRequest, CommissionUpdateRequest

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_role("admin"))])

@router.get("/stats", response_model=dict)
async def get_admin_stats():
    db = get_db()
    customers = await db.users.count_documents({"role": "customer"})
    sellers = await db.users.count_documents({"role": "seller"})
    pending_sellers = await db.sellerprofiles.count_documents({"verificationStatus": "pending"})
    active_listings = await db.foodlistings.count_documents({"status": "active"})
    total_orders = await db.orders.count_documents({})
    open_complaints = await db.complaints.count_documents({"status": {"$ne": "resolved"}})

    return {
        "customers": customers,
        "sellers": sellers,
        "pendingSellers": pending_sellers,
        "activeListings": active_listings,
        "totalOrders": total_orders,
        "openComplaints": open_complaints,
    }

@router.get("/users", response_model=dict)
async def get_users(role: Optional[str] = None):
    db = get_db()
    query = {"role": role} if role else {}
    cursor = db.users.find(query, {"passwordHash": 0}).sort("createdAt", -1)
    users = await cursor.to_list(length=500)
    return {"users": serialize_docs(users)}

@router.get("/sellers", response_model=dict)
async def get_sellers(verificationStatus: Optional[str] = None):
    db = get_db()
    query = {"verificationStatus": verificationStatus} if verificationStatus else {}
    cursor = db.sellerprofiles.find(query).sort("createdAt", -1)
    raw_sellers = await cursor.to_list(length=500)

    sellers = []
    for s in raw_sellers:
        user = await db.users.find_one({"_id": s.get("userId")})
        s_copy = dict(s)
        if user:
            s_copy["userId"] = {
                "_id": str(user["_id"]),
                "name": user.get("name"),
                "email": user.get("email"),
                "phone": user.get("phone"),
                "locality": user.get("locality"),
                "createdAt": user.get("createdAt").isoformat() if isinstance(user.get("createdAt"), datetime) else user.get("createdAt")
            }
        sellers.append(serialize_doc(s_copy))

    return {"sellers": sellers}

@router.put("/sellers/{id}/verify", response_model=dict)
async def verify_seller(id: str, payload: VerifySellerRequest):
    seller_id = parse_object_id(id)
    if payload.status not in ["verified", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid verification status.")

    db = get_db()
    set_dict = {
        "verificationStatus": payload.status,
        "updatedAt": datetime.now(timezone.utc)
    }
    if payload.notes is not None:
        set_dict["verificationNotes"] = payload.notes

    updated_seller = await db.sellerprofiles.find_one_and_update(
        {"_id": seller_id},
        {"$set": set_dict},
        return_document=True
    )
    if not updated_seller:
        raise HTTPException(status_code=404, detail="Seller not found.")

    return {"seller": serialize_doc(updated_seller)}

@router.get("/listings", response_model=dict)
async def get_listings():
    db = get_db()
    cursor = db.foodlistings.find({}).sort("createdAt", -1)
    raw_listings = await cursor.to_list(length=500)

    listings = []
    for l in raw_listings:
        seller = await db.sellerprofiles.find_one({"_id": l.get("sellerId")})
        l_copy = dict(l)
        if seller:
            user = await db.users.find_one({"_id": seller.get("userId")})
            seller_copy = dict(seller)
            if user:
                seller_copy["userId"] = {"_id": str(user["_id"]), "name": user.get("name")}
            l_copy["sellerId"] = seller_copy
        listings.append(serialize_doc(l_copy))

    return {"listings": listings}

@router.put("/listings/{id}/status", response_model=dict)
async def update_listing_status(id: str, payload: UpdateListingStatusRequest):
    listing_id = parse_object_id(id)
    if payload.status not in ["active", "hidden", "expired", "soldout"]:
        raise HTTPException(status_code=400, detail="Invalid status.")

    db = get_db()
    updated_listing = await db.foodlistings.find_one_and_update(
        {"_id": listing_id},
        {"$set": {"status": payload.status, "updatedAt": datetime.now(timezone.utc)}},
        return_document=True
    )
    if not updated_listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    return {"listing": serialize_doc(updated_listing)}

@router.get("/orders", response_model=dict)
async def get_admin_orders():
    db = get_db()
    cursor = db.orders.find({}).sort("createdAt", -1).limit(200)
    raw_orders = await cursor.to_list(length=200)

    orders = []
    for o in raw_orders:
        cust = await db.users.find_one({"_id": o.get("customerId")})
        seller = await db.sellerprofiles.find_one({"_id": o.get("sellerId")})
        o_copy = dict(o)
        if cust:
            o_copy["customerId"] = {"_id": str(cust["_id"]), "name": cust.get("name")}
        if seller:
            user = await db.users.find_one({"_id": seller.get("userId")})
            seller_copy = dict(seller)
            if user:
                seller_copy["userId"] = {"_id": str(user["_id"]), "name": user.get("name")}
            o_copy["sellerId"] = seller_copy
        orders.append(serialize_doc(o_copy))

    return {"orders": orders}

@router.get("/complaints", response_model=dict)
async def get_admin_complaints(status: Optional[str] = None):
    db = get_db()
    query = {"status": status} if status else {}
    cursor = db.complaints.find(query).sort("createdAt", -1)
    raw_complaints = await cursor.to_list(length=200)

    complaints = []
    for c in raw_complaints:
        cust = await db.users.find_one({"_id": c.get("customerId")})
        ord_doc = await db.orders.find_one({"_id": c.get("orderId")})
        seller = await db.sellerprofiles.find_one({"_id": c.get("sellerId")})
        c_copy = dict(c)
        if cust:
            c_copy["customerId"] = {
                "_id": str(cust["_id"]),
                "name": cust.get("name"),
                "phone": cust.get("phone"),
                "email": cust.get("email")
            }
        if ord_doc:
            c_copy["orderId"] = serialize_doc(ord_doc)
        if seller:
            user = await db.users.find_one({"_id": seller.get("userId")})
            seller_copy = dict(seller)
            if user:
                seller_copy["userId"] = {"_id": str(user["_id"]), "name": user.get("name")}
            c_copy["sellerId"] = seller_copy
        complaints.append(serialize_doc(c_copy))

    return {"complaints": complaints}

@router.put("/complaints/{id}", response_model=dict)
async def update_complaint(id: str, payload: dict):
    complaint_id = parse_object_id(id)
    db = get_db()
    set_dict = {"updatedAt": datetime.now(timezone.utc)}
    if "status" in payload:
        set_dict["status"] = payload["status"]
    if "resolution" in payload:
        set_dict["resolution"] = payload["resolution"]

    updated = await db.complaints.find_one_and_update(
        {"_id": complaint_id},
        {"$set": set_dict},
        return_document=True
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    return {"complaint": serialize_doc(updated)}

@router.get("/commission", response_model=dict)
async def get_commission():
    db = get_db()
    config = await db.platformconfigs.find_one({"key": "singleton"})
    if not config:
        return {"commissionPercent": float(settings.DEFAULT_COMMISSION_PERCENT)}
    return {"commissionPercent": float(config.get("commissionPercent", settings.DEFAULT_COMMISSION_PERCENT))}

@router.put("/commission", response_model=dict)
async def set_commission(payload: CommissionUpdateRequest):
    val = float(payload.commissionPercent)
    if val < 0 or val > 100:
        raise HTTPException(status_code=400, detail="Commission must be a number between 0 and 100.")

    db = get_db()
    now = datetime.now(timezone.utc)
    config = await db.platformconfigs.find_one_and_update(
        {"key": "singleton"},
        {
            "$set": {
                "commissionPercent": val,
                "updatedAt": now
            },
            "$setOnInsert": {
                "key": "singleton",
                "createdAt": now
            }
        },
        upsert=True,
        return_document=True
    )
    return {"commissionPercent": float(config.get("commissionPercent", val))}
