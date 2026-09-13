from app.database import get_db

async def generate_order_number() -> str:
    """
    Generate sequential order numbers like GS1000, GS1001, etc.
    """
    db = get_db()
    count = await db.orders.count_documents({})
    return f"GS{1000 + count}"
