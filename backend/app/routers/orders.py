from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_db
from app.config import settings
from app.schemas.order import OrderCreateRequest, OrderStatusUpdateRequest
from app.middleware.auth import get_current_user
from app.models.mongo_utils import serialize_doc, serialize_docs, parse_object_id
from app.utils.order_number import generate_order_number

router = APIRouter(prefix="/api/orders", tags=["Orders"])

VALID_TRANSITIONS = {
    "placed": ["accepted", "rejected"],
    "accepted": ["preparing", "cancelled"],
    "preparing": ["ready", "cancelled"],
    "ready": ["out_for_delivery", "completed"],
    "out_for_delivery": ["completed"],
    "completed": [],
    "rejected": [],
    "cancelled": [],
}

async def get_commission_percent() -> float:
    db = get_db()
    config = await db.platformconfigs.find_one({"key": "singleton"})
    if not config:
        commission = float(settings.DEFAULT_COMMISSION_PERCENT)
        await db.platformconfigs.insert_one({
            "key": "singleton",
            "commissionPercent": commission,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        })
        return commission
    return float(config.get("commissionPercent", settings.DEFAULT_COMMISSION_PERCENT))

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    listing_id = parse_object_id(payload.listingId)
    qty = payload.quantity
    fulfillment_type = payload.fulfillmentType

    if not qty or qty < 1:
        raise HTTPException(status_code=400, detail="Quantity must be a whole number of at least 1.")

    if fulfillment_type not in ["pickup", "delivery"]:
        raise HTTPException(status_code=400, detail="Invalid fulfillment type.")

    db = get_db()
    listing = await db.foodlistings.find_one({"_id": listing_id})
    if not listing or listing.get("status") != "active":
        raise HTTPException(status_code=404, detail="This food is no longer available.")

    if fulfillment_type == "pickup" and not listing.get("pickupAvailable"):
        raise HTTPException(status_code=400, detail="Pickup is not available for this listing.")

    if fulfillment_type == "delivery" and not listing.get("deliveryAvailable"):
        raise HTTPException(status_code=400, detail="Delivery is not available for this listing.")

    # Atomic decrement: only succeeds if remainingQuantity >= qty at that exact moment
    updated_listing = await db.foodlistings.find_one_and_update(
        {
            "_id": listing_id,
            "remainingQuantity": {"$gte": qty},
            "status": "active"
        },
        [
            {
                "$set": {
                    "remainingQuantity": {"$subtract": ["$remainingQuantity", qty]}
                }
            },
            {
                "$set": {
                    "status": {
                        "$cond": [{"$lte": ["$remainingQuantity", 0]}, "soldout", "active"]
                    }
                }
            }
        ],
        return_document=True
    )

    if not updated_listing:
        fresh = await db.foodlistings.find_one({"_id": listing_id})
        available = fresh.get("remainingQuantity", 0) if fresh else 0
        raise HTTPException(
            status_code=409,
            detail=f"Only {available} portion{'s' if available != 1 else ''} remaining."
        )

    seller_profile = await db.sellerprofiles.find_one({"_id": listing["sellerId"]})
    if not seller_profile:
        raise HTTPException(status_code=404, detail="Seller profile not found.")

    commission_percent = await get_commission_percent()
    subtotal = float(listing.get("price", 0)) * qty
    delivery_fee = float(listing.get("deliveryFee", 0)) if fulfillment_type == "delivery" else 0.0
    total = subtotal + delivery_fee
    commission_amount = round((subtotal * commission_percent) / 100.0)
    seller_earnings = subtotal - commission_amount

    order_number = await generate_order_number()
    now = datetime.now(timezone.utc)

    order_doc = {
        "orderNumber": order_number,
        "customerId": ObjectId(current_user["_id"]),
        "sellerId": seller_profile["_id"],
        "items": [
            {
                "listingId": listing["_id"],
                "name": listing.get("name"),
                "price": listing.get("price"),
                "quantity": qty
            }
        ],
        "subtotal": subtotal,
        "deliveryFee": delivery_fee,
        "total": total,
        "fulfillmentType": fulfillment_type,
        "deliveryLocality": (payload.deliveryLocality or "").strip() if fulfillment_type == "delivery" else "",
        "status": "placed",
        "rejectionReason": "",
        "paymentMethod": payload.paymentMethod or "cash",
        "paymentStatus": "pending" if payload.paymentMethod == "upi" else "cash_on_fulfillment",
        "platformCommissionPercent": commission_percent,
        "platformCommissionAmount": commission_amount,
        "sellerEarnings": seller_earnings,
        "isDemo": False,
        "createdAt": now,
        "updatedAt": now
    }

    result = await db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id

    return {"order": serialize_doc(order_doc)}

@router.get("", response_model=dict)
async def list_orders(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    filter_query = {}

    if current_user.get("role") == "customer":
        filter_query["customerId"] = ObjectId(current_user["_id"])
    elif current_user.get("role") == "seller":
        seller_profile = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})
        if not seller_profile:
            raise HTTPException(status_code=403, detail="Seller profile not found.")
        filter_query["sellerId"] = seller_profile["_id"]

    if status:
        filter_query["status"] = status

    cursor = db.orders.find(filter_query).sort("createdAt", -1)
    raw_orders = await cursor.to_list(length=200)

    # Populate customerId and sellerId
    populated_orders = []
    for order in raw_orders:
        customer_doc = await db.users.find_one({"_id": order.get("customerId")})
        seller_doc = await db.sellerprofiles.find_one({"_id": order.get("sellerId")})
        seller_user_doc = None
        if seller_doc:
            seller_user_doc = await db.users.find_one({"_id": seller_doc.get("userId")})

        order_copy = dict(order)
        if customer_doc:
            order_copy["customerId"] = {
                "_id": str(customer_doc["_id"]),
                "name": customer_doc.get("name"),
                "locality": customer_doc.get("locality"),
                "phone": customer_doc.get("phone")
            }
        if seller_doc:
            seller_data = dict(seller_doc)
            if seller_user_doc:
                seller_data["userId"] = {
                    "_id": str(seller_user_doc["_id"]),
                    "name": seller_user_doc.get("name"),
                    "locality": seller_user_doc.get("locality")
                }
            order_copy["sellerId"] = seller_data

        populated_orders.append(serialize_doc(order_copy))

    return {"orders": populated_orders}

@router.get("/{id}", response_model=dict)
async def get_order_by_id(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    order_id = parse_object_id(id)
    db = get_db()
    order = await db.orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    seller_profile = None
    if current_user.get("role") == "seller":
        seller_profile = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})

    is_owner_customer = current_user.get("role") == "customer" and str(order.get("customerId")) == str(current_user["_id"])
    is_owner_seller = seller_profile and str(order.get("sellerId")) == str(seller_profile["_id"])

    if not is_owner_customer and not is_owner_seller and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You do not have access to this order.")

    customer_doc = await db.users.find_one({"_id": order.get("customerId")})
    seller_doc = await db.sellerprofiles.find_one({"_id": order.get("sellerId")})
    seller_user_doc = None
    if seller_doc:
        seller_user_doc = await db.users.find_one({"_id": seller_doc.get("userId")})

    order_copy = dict(order)
    if customer_doc:
        order_copy["customerId"] = {
            "_id": str(customer_doc["_id"]),
            "name": customer_doc.get("name"),
            "locality": customer_doc.get("locality"),
            "phone": customer_doc.get("phone")
        }
    if seller_doc:
        seller_data = dict(seller_doc)
        if seller_user_doc:
            seller_data["userId"] = {
                "_id": str(seller_user_doc["_id"]),
                "name": seller_user_doc.get("name"),
                "locality": seller_user_doc.get("locality")
            }
        order_copy["sellerId"] = seller_data

    return {"order": serialize_doc(order_copy)}

@router.put("/{id}/status", response_model=dict)
async def update_order_status(
    id: str,
    payload: OrderStatusUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    order_id = parse_object_id(id)
    new_status = payload.status
    rejection_reason = payload.rejectionReason or ""

    db = get_db()
    order = await db.orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    seller_profile = await db.sellerprofiles.find_one({"userId": ObjectId(current_user["_id"])})
    if not seller_profile or str(order.get("sellerId")) != str(seller_profile["_id"]):
        raise HTTPException(status_code=403, detail="You can only update your own orders.")

    current_status = order.get("status")
    allowed_next = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed_next:
        raise HTTPException(
            status_code=400,
            detail=f'Cannot move order from "{current_status}" to "{new_status}".'
        )

    if new_status == "rejected" and not rejection_reason:
        raise HTTPException(status_code=400, detail="A reason is required to reject an order.")

    now = datetime.now(timezone.utc)
    set_dict = {
        "status": new_status,
        "updatedAt": now
    }

    # If rejected or cancelled, restore stock to listings
    if new_status in ["rejected", "cancelled"]:
        for item in order.get("items", []):
            item_listing_id = item.get("listingId")
            item_qty = item.get("quantity", 0)
            if item_listing_id and item_qty > 0:
                await db.foodlistings.update_one(
                    {"_id": ObjectId(item_listing_id) if not isinstance(item_listing_id, ObjectId) else item_listing_id},
                    {
                        "$inc": {"remainingQuantity": item_qty},
                        "$set": {"status": "active", "updatedAt": now}
                    }
                )
        set_dict["rejectionReason"] = rejection_reason

    if new_status == "completed":
        if order.get("paymentMethod") == "cash":
            set_dict["paymentStatus"] = "cash_on_fulfillment"
        await db.sellerprofiles.update_one(
            {"_id": seller_profile["_id"]},
            {"$inc": {"totalOrders": 1}, "$set": {"updatedAt": now}}
        )

    updated_order = await db.orders.find_one_and_update(
        {"_id": order_id},
        {"$set": set_dict},
        return_document=True
    )

    return {"order": serialize_doc(updated_order)}
