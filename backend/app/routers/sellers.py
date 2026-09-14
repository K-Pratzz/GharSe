from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from bson import ObjectId
from app.database import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.mongo_utils import serialize_doc, serialize_docs, parse_object_id
from app.services.image_storage import save_image

router = APIRouter(prefix="/api/sellers", tags=["Sellers"])

@router.get("/dashboard", response_model=dict)
async def get_seller_dashboard(current_user: dict = Depends(require_role("seller"))):
    db = get_db()
    seller = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found.")

    listings_cursor = db.foodlistings.find({"sellerId": seller["_id"]}).sort("createdAt", -1)
    listings = await listings_cursor.to_list(length=200)

    orders_cursor = db.orders.find({"sellerId": seller["_id"]}).sort("createdAt", -1).limit(50)
    orders = await orders_cursor.to_list(length=50)

    completed_orders = [o for o in orders if o.get("status") == "completed"]
    total_earnings = sum(o.get("sellerEarnings", 0) for o in completed_orders)
    total_commission_paid = sum(o.get("platformCommissionAmount", 0) for o in completed_orders)

    active_listings_count = sum(1 for l in listings if l.get("status") == "active")
    sold_out_listings_count = sum(1 for l in listings if l.get("status") == "soldout")
    pending_orders_count = sum(1 for o in orders if o.get("status") in ["placed", "accepted", "preparing"])

    return {
        "seller": serialize_doc(seller),
        "listings": serialize_docs(listings),
        "recentOrders": serialize_docs(orders),
        "summary": {
            "activeListings": active_listings_count,
            "soldOutListings": sold_out_listings_count,
            "pendingOrders": pending_orders_count,
            "totalEarnings": total_earnings,
            "totalCommissionPaid": total_commission_paid
        }
    }

@router.get("/{id}", response_model=dict)
async def get_seller_profile(id: str):
    seller_id = parse_object_id(id)
    db = get_db()
    seller = await db.sellerprofiles.find_one({"_id": seller_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found.")

    user = await db.users.find_one({"_id": seller["userId"]})
    seller_copy = dict(seller)
    if user:
        seller_copy["userId"] = {
            "_id": str(user["_id"]),
            "name": user.get("name"),
            "locality": user.get("locality")
        }

    menu_cursor = db.foodlistings.find({
        "sellerId": seller["_id"],
        "status": "active",
        "remainingQuantity": {"$gt": 0}
    })
    menu = await menu_cursor.to_list(length=100)

    reviews_cursor = db.reviews.find({"sellerId": seller["_id"]}).sort("createdAt", -1).limit(20)
    raw_reviews = await reviews_cursor.to_list(length=20)
    reviews = []
    for r in raw_reviews:
        cust = await db.users.find_one({"_id": r.get("customerId")})
        r_copy = dict(r)
        if cust:
            r_copy["customerId"] = {"_id": str(cust["_id"]), "name": cust.get("name")}
        reviews.append(serialize_doc(r_copy))

    return {
        "seller": serialize_doc(seller_copy),
        "menu": serialize_docs(menu),
        "reviews": reviews
    }

@router.put("/profile", response_model=dict)
async def update_seller_profile(
    request: Request,
    current_user: dict = Depends(require_role("seller"))
):
    db = get_db()
    seller = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found.")

    content_type = request.headers.get("content-type", "")
    updates = {}
    if "multipart/form-data" in content_type:
        form = await request.form()
        for k in form.keys():
            if k == "profilePhoto":
                photo_file = form[k]
                if isinstance(photo_file, UploadFile) and photo_file.filename:
                    updates["profilePhoto"] = await save_image(photo_file)
            else:
                updates[k] = form[k]
    else:
        updates = await request.json()

    set_dict = {"updatedAt": datetime.now(timezone.utc)}
    editable = ["bio", "categories", "deliveryRadiusKm", "pickupAvailable", "deliveryAvailable", "profilePhoto"]

    for field in editable:
        if field in updates:
            val = updates[field]
            if field == "deliveryRadiusKm" and val is not None:
                set_dict[field] = float(val)
            elif field in ["pickupAvailable", "deliveryAvailable"] and val is not None:
                set_dict[field] = True if str(val).lower() in ["true", "1"] or val is True else False
            elif field == "categories":
                if isinstance(val, str):
                    set_dict[field] = [s.strip() for s in val.split(",") if s.strip()]
                elif isinstance(val, list):
                    set_dict[field] = val
            else:
                set_dict[field] = val

    updated_seller = await db.sellerprofiles.find_one_and_update(
        {"_id": seller["_id"]},
        {"$set": set_dict},
        return_document=True
    )

    return {"seller": serialize_doc(updated_seller)}

@router.post("/verification", response_model=dict)
async def request_verification(
    request: Request,
    current_user: dict = Depends(require_role("seller"))
):
    db = get_db()
    seller = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found.")

    try:
        body = await request.json()
        notes = body.get("notes", "")
    except Exception:
        notes = ""

    updated_seller = await db.sellerprofiles.find_one_and_update(
        {"_id": seller["_id"]},
        {
            "$set": {
                "verificationStatus": "pending",
                "verificationNotes": notes or seller.get("verificationNotes", ""),
                "updatedAt": datetime.now(timezone.utc)
            }
        },
        return_document=True
    )

    return {
        "seller": serialize_doc(updated_seller),
        "message": "Verification request submitted. Our team will review it shortly."
    }
