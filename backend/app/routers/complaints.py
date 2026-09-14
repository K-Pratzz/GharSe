from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_db
from app.schemas.complaint import ComplaintCreateRequest
from app.middleware.auth import get_current_user
from app.models.mongo_utils import serialize_doc, serialize_docs, parse_object_id

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

VALID_CATEGORIES = {
    "food_quality",
    "missing_item",
    "wrong_item",
    "seller_issue",
    "delivery_issue",
    "other",
}

@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create_complaint(
    payload: ComplaintCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    order_id = parse_object_id(payload.orderId)
    category = payload.category
    description = (payload.description or "").strip()

    if not order_id or not category or not description:
        raise HTTPException(status_code=400, detail="Order, category, and description are required.")

    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid complaint category.")

    db = get_db()
    order = await db.orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if str(order.get("customerId")) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only report issues on your own orders.")

    now = datetime.now(timezone.utc)
    complaint_doc = {
        "customerId": ObjectId(current_user["_id"]),
        "orderId": order_id,
        "sellerId": order.get("sellerId"),
        "category": category,
        "description": description,
        "status": "open",
        "resolution": "",
        "createdAt": now,
        "updatedAt": now
    }

    result = await db.complaints.insert_one(complaint_doc)
    complaint_doc["_id"] = result.inserted_id

    return {"complaint": serialize_doc(complaint_doc)}

@router.get("/mine", response_model=dict)
async def my_complaints(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.complaints.find({"customerId": ObjectId(current_user["_id"])}).sort("createdAt", -1)
    complaints = await cursor.to_list(length=100)
    return {"complaints": serialize_docs(complaints)}
