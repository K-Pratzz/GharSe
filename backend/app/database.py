import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

async def connect_db():
    logger.info(f"Connecting to MongoDB at {settings.MONGO_URI}...")
    db_instance.client = AsyncIOMotorClient(settings.MONGO_URI)
    # Extract DB name from URI or default to "gharse"
    db_name = "gharse"
    try:
        uri_parts = settings.MONGO_URI.split("/")
        if len(uri_parts) > 3 and uri_parts[3].split("?")[0]:
            db_name = uri_parts[3].split("?")[0]
    except Exception:
        pass
    db_instance.db = db_instance.client[db_name]
    logger.info(f"Connected to MongoDB database '{db_name}'")
    await init_indexes()

async def close_db():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()

async def init_indexes():
    """Create essential MongoDB indexes"""
    db = db_instance.db
    if db is None:
        return
    try:
        # Users indexes
        await db.users.create_index("email", unique=True, sparse=True)
        await db.users.create_index("phone", unique=True, sparse=True)

        # SellerProfile indexes
        await db.sellerprofiles.create_index("userId", unique=True)

        # FoodListing indexes
        await db.foodlistings.create_index([("status", 1), ("date", 1), ("mealType", 1)])
        await db.foodlistings.create_index("sellerId")

        # Orders indexes
        await db.orders.create_index("orderNumber", unique=True)
        await db.orders.create_index("customerId")
        await db.orders.create_index("sellerId")

        # Reviews indexes
        await db.reviews.create_index("orderId", unique=True)
        await db.reviews.create_index("sellerId")

        # Complaints indexes
        await db.complaints.create_index("customerId")
        await db.complaints.create_index("sellerId")

        # PlatformConfig singleton index
        await db.platformconfigs.create_index("key", unique=True)
        logger.info("MongoDB indexes verified.")
    except Exception as e:
        logger.warning(f"Failed to create some indexes: {e}")

def get_db() -> AsyncIOMotorDatabase:
    return db_instance.db
