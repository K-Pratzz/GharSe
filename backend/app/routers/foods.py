from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
from bson import ObjectId
from app.database import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.mongo_utils import serialize_doc, serialize_docs, parse_object_id
from app.services.image_storage import save_image
from app.utils.distance import haversine_km

router = APIRouter(prefix="/api/foods", tags=["Foods"])

@router.get("", response_model=dict)
async def list_foods(
    mealType: Optional[str] = None,
    dietaryType: Optional[str] = None,
    pickup: Optional[str] = None,
    delivery: Optional[str] = None,
    maxPrice: Optional[float] = None,
    minRating: Optional[float] = None,
    sort: Optional[str] = "recent",
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    maxDistanceKm: Optional[float] = None,
):
    db = get_db()
    query = {"status": "active", "remainingQuantity": {"$gt": 0}}

    if mealType:
        query["mealType"] = mealType
    if dietaryType:
        query["dietaryType"] = dietaryType
    if pickup == "true":
        query["pickupAvailable"] = True
    if delivery == "true":
        query["deliveryAvailable"] = True
    if maxPrice is not None:
        query["price"] = {"$lte": float(maxPrice)}

    # Filter out past dates (show today and future dates)
    now = datetime.now(timezone.utc)
    start_of_today = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
    query["date"] = {"$gte": start_of_today}

    # Fetch listings from DB
    cursor = db.foodlistings.find(query)
    raw_listings = await cursor.to_list(length=500)

    # Collect seller IDs
    seller_ids = list({l["sellerId"] for l in raw_listings if "sellerId" in l})
    sellers = {}
    if seller_ids:
        seller_docs = await db.sellerprofiles.find({"_id": {"$in": seller_ids}}).to_list(length=len(seller_ids))
        user_ids = [s["userId"] for s in seller_docs if "userId" in s]
        users = {}
        if user_ids:
            user_docs = await db.users.find({"_id": {"$in": user_ids}}).to_list(length=len(user_ids))
            users = {str(u["_id"]): u for u in user_docs}

        for s in seller_docs:
            u_id = str(s.get("userId"))
            user_obj = users.get(u_id)
            s_copy = dict(s)
            if user_obj:
                s_copy["userId"] = {
                    "_id": str(user_obj["_id"]),
                    "name": user_obj.get("name"),
                    "locality": user_obj.get("locality"),
                    "approximateLocation": user_obj.get("approximateLocation")
                }
            sellers[str(s["_id"])] = s_copy

    customer_point = {"lat": lat, "lng": lng} if (lat is not None and lng is not None) else None

    listings = []
    for l in raw_listings:
        l_serialized = serialize_doc(l)
        s_id = str(l.get("sellerId"))
        seller_data = sellers.get(s_id)
        if seller_data:
            l_serialized["sellerId"] = serialize_doc(seller_data)

        # Distance calculation
        seller_loc = None
        if seller_data and isinstance(seller_data.get("userId"), dict):
            seller_loc = seller_data["userId"].get("approximateLocation")

        distance_km = haversine_km(customer_point, seller_loc) if customer_point else None
        l_serialized["distanceKm"] = distance_km
        listings.append(l_serialized)

    # Filter by minRating
    if minRating is not None:
        listings = [l for l in listings if (l.get("sellerId", {}).get("rating") or 0) >= float(minRating)]

    # Filter by maxDistanceKm
    if maxDistanceKm is not None and customer_point:
        listings = [l for l in listings if l.get("distanceKm") is not None and l["distanceKm"] <= float(maxDistanceKm)]

    # Sorting
    if sort == "nearest":
        listings.sort(key=lambda x: x.get("distanceKm") if x.get("distanceKm") is not None else float("inf"))
    elif sort == "price_low":
        listings.sort(key=lambda x: x.get("price", 0))
    elif sort == "rating":
        listings.sort(key=lambda x: (x.get("sellerId", {}).get("rating") or 0), reverse=True)
    else:  # 'recent'
        listings.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)

    return {"listings": listings}

@router.get("/mine", response_model=dict)
async def my_listings(current_user: dict = Depends(require_role("seller"))):
    db = get_db()
    seller_profile = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})
    if not seller_profile:
        raise HTTPException(status_code=403, detail="Seller profile not found.")

    cursor = db.foodlistings.find({"sellerId": seller_profile["_id"]}).sort("createdAt", -1)
    listings = await cursor.to_list(length=200)
    return {"listings": serialize_docs(listings)}

@router.get("/{id}", response_model=dict)
async def get_food_by_id(id: str):
    listing_id = parse_object_id(id)
    db = get_db()
    listing = await db.foodlistings.find_one({"_id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="This food listing is no longer available.")

    # Populate seller
    seller_doc = await db.sellerprofiles.find_one({"_id": listing["sellerId"]})
    if seller_doc:
        user_doc = await db.users.find_one({"_id": seller_doc["userId"]})
        seller_copy = dict(seller_doc)
        if user_doc:
            seller_copy["userId"] = {
                "_id": str(user_doc["_id"]),
                "name": user_doc.get("name"),
                "locality": user_doc.get("locality")
            }
        listing["sellerId"] = seller_copy

    other_cursor = db.foodlistings.find({
        "sellerId": seller_doc["_id"] if seller_doc else listing["sellerId"],
        "_id": {"$ne": listing_id},
        "status": "active",
        "remainingQuantity": {"$gt": 0}
    }).limit(6)
    other_listings = await other_cursor.to_list(length=6)

    return {
        "listing": serialize_doc(listing),
        "otherListings": serialize_docs(other_listings)
    }

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_food(
    request: Request,
    current_user: dict = Depends(require_role("seller"))
):
    db = get_db()
    seller_profile = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})
    if not seller_profile:
        raise HTTPException(status_code=403, detail="Seller profile not found.")

    if seller_profile.get("verificationStatus") != "verified":
        raise HTTPException(
            status_code=403,
            detail="Your seller account is pending verification. You can add listings once approved."
        )

    # Handle multipart or json
    content_type = request.headers.get("content-type", "")
    image_path = ""

    if "multipart/form-data" in content_type:
        form = await request.form()
        name = form.get("name")
        description = form.get("description", "")
        price = form.get("price")
        quantity = form.get("quantity")
        mealType = form.get("mealType")
        date_str = form.get("date")
        readyTime = form.get("readyTime")
        pickupAvailable = form.get("pickupAvailable")
        deliveryAvailable = form.get("deliveryAvailable")
        deliveryRadiusKm = form.get("deliveryRadiusKm", 0)
        deliveryFee = form.get("deliveryFee", 0)
        dietaryType = form.get("dietaryType")
        ingredients = form.get("ingredients")
        allergens = form.get("allergens")

        image_file = form.get("image")
        if isinstance(image_file, UploadFile) and image_file.filename:
            image_path = await save_image(image_file)
        elif isinstance(image_file, str):
            image_path = image_file
    else:
        body = await request.json()
        name = body.get("name")
        description = body.get("description", "")
        price = body.get("price")
        quantity = body.get("quantity")
        mealType = body.get("mealType")
        date_str = body.get("date")
        readyTime = body.get("readyTime")
        pickupAvailable = body.get("pickupAvailable")
        deliveryAvailable = body.get("deliveryAvailable")
        deliveryRadiusKm = body.get("deliveryRadiusKm", 0)
        deliveryFee = body.get("deliveryFee", 0)
        dietaryType = body.get("dietaryType")
        ingredients = body.get("ingredients")
        allergens = body.get("allergens")
        image_path = body.get("image", "")

    if not name or price is None or quantity is None or not mealType or not date_str or not readyTime or not dietaryType:
        raise HTTPException(status_code=400, detail="Missing required fields for the listing.")

    try:
        qty = int(quantity)
        pr = float(price)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Price and quantity must be valid numbers.")

    if qty < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1.")
    if pr < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative.")

    # Parse date
    try:
        if isinstance(date_str, str):
            date_val = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            date_val = datetime.now(timezone.utc)
    except Exception:
        date_val = datetime.now(timezone.utc)

    # Process lists
    def parse_list(val):
        if isinstance(val, list):
            return [str(x).strip() for x in val if str(x).strip()]
        if isinstance(val, str) and val.strip():
            return [s.strip() for s in val.split(",") if s.strip()]
        return []

    now = datetime.now(timezone.utc)
    listing_doc = {
        "sellerId": seller_profile["_id"],
        "name": str(name).strip(),
        "description": str(description or "").strip(),
        "image": image_path or "",
        "price": pr,
        "quantity": qty,
        "remainingQuantity": qty,
        "mealType": mealType,
        "date": date_val,
        "readyTime": str(readyTime).strip(),
        "pickupAvailable": True if str(pickupAvailable).lower() in ["true", "1"] or pickupAvailable is True else (False if pickupAvailable is not None else True),
        "deliveryAvailable": True if str(deliveryAvailable).lower() in ["true", "1"] or deliveryAvailable is True else False,
        "deliveryRadiusKm": float(deliveryRadiusKm or 0),
        "deliveryFee": float(deliveryFee or 0),
        "dietaryType": dietaryType,
        "ingredients": parse_list(ingredients),
        "allergens": parse_list(allergens),
        "status": "active",
        "isDemo": False,
        "createdAt": now,
        "updatedAt": now,
    }

    result = await db.foodlistings.insert_one(listing_doc)
    listing_doc["_id"] = result.inserted_id

    return {
        "listing": serialize_doc(listing_doc),
        "message": "Your food is now live on GharSe."
    }

@router.put("/{id}")
async def update_food(
    id: str,
    request: Request,
    current_user: dict = Depends(require_role("seller"))
):
    listing_id = parse_object_id(id)
    db = get_db()
    seller_profile = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})
    listing = await db.foodlistings.find_one({"_id": listing_id})

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if str(listing.get("sellerId")) != str(seller_profile["_id"]):
        raise HTTPException(status_code=403, detail="You can only edit your own listings.")

    content_type = request.headers.get("content-type", "")
    updates = {}
    if "multipart/form-data" in content_type:
        form = await request.form()
        for k in form.keys():
            if k == "image":
                img = form[k]
                if isinstance(img, UploadFile) and img.filename:
                    updates["image"] = await save_image(img)
            else:
                updates[k] = form[k]
    else:
        updates = await request.json()

    fields = [
        "name", "description", "price", "quantity", "remainingQuantity", "mealType", "date", "readyTime",
        "pickupAvailable", "deliveryAvailable", "deliveryRadiusKm", "deliveryFee", "dietaryType",
        "ingredients", "allergens", "status", "image"
    ]

    set_dict = {"updatedAt": datetime.now(timezone.utc)}
    for field in fields:
        if field in updates:
            val = updates[field]
            if field in ["price", "deliveryRadiusKm", "deliveryFee"] and val is not None:
                set_dict[field] = float(val)
            elif field in ["quantity", "remainingQuantity"] and val is not None:
                set_dict[field] = int(val)
            elif field in ["pickupAvailable", "deliveryAvailable"] and val is not None:
                set_dict[field] = True if str(val).lower() in ["true", "1"] or val is True else False
            elif field == "date" and isinstance(val, str):
                try:
                    set_dict[field] = datetime.fromisoformat(val.replace("Z", "+00:00"))
                except Exception:
                    set_dict[field] = val
            elif field in ["ingredients", "allergens"]:
                if isinstance(val, str):
                    set_dict[field] = [s.strip() for s in val.split(",") if s.strip()]
                elif isinstance(val, list):
                    set_dict[field] = val
            else:
                set_dict[field] = val

    updated_listing = await db.foodlistings.find_one_and_update(
        {"_id": listing_id},
        {"$set": set_dict},
        return_document=True
    )

    return {"listing": serialize_doc(updated_listing)}

@router.delete("/{id}")
async def delete_food(
    id: str,
    current_user: dict = Depends(require_role("seller"))
):
    listing_id = parse_object_id(id)
    db = get_db()
    seller_profile = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})
    listing = await db.foodlistings.find_one({"_id": listing_id})

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if str(listing.get("sellerId")) != str(seller_profile["_id"]):
        raise HTTPException(status_code=403, detail="You can only delete your own listings.")

    await db.foodlistings.delete_one({"_id": listing_id})
    return {"message": "Listing removed."}
