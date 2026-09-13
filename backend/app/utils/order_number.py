from app.database import get_db

async def generate_order_number() -> str:
    """
    Generate sequential, collision-safe order numbers (e.g. GS1000, GS1001...).
    Uses an atomic counter document in MongoDB so concurrent checkouts cannot produce duplicate IDs.
    """
    db = get_db()
    counter = await db.counters.find_one_and_update(
        {"_id": "orderNumber"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    # Start sequence at 1000
    seq = counter.get("seq", 0) if counter else 0
    return f"GS{1000 + seq}"
