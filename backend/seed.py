import sys
import os
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import asyncio
import random
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import httpx
from pymongo import MongoClient

from app.config import settings
from app.utils.security import hash_password

SELLERS = [
    {"name": "Anita Sharma", "kitchen": "Anita's Kitchen", "locality": "Sector 14, Rewari", "lat": 28.1994, "lng": 76.6203, "categories": ["North Indian", "Home-style"]},
    {"name": "Rekha Devi", "kitchen": "Rekha's Rasoi", "locality": "Model Town, Rewari", "lat": 28.1975, "lng": 76.6255, "categories": ["Punjabi", "Thali"]},
    {"name": "Suman Yadav", "kitchen": "Maa ke Haath Ka Khana", "locality": "Civil Lines, Rewari", "lat": 28.2020, "lng": 76.6180, "categories": ["South Indian", "Breakfast"]},
    {"name": "Pooja Verma", "kitchen": "Pooja's Tiffin", "locality": "Ashok Vihar, Rewari", "lat": 28.1950, "lng": 76.6230, "categories": ["Vegetarian", "Tiffin"]},
    {"name": "Kavita Singh", "kitchen": "Kavita Ghar Bhojan", "locality": "Jawahar Nagar, Rewari", "lat": 28.2005, "lng": 76.6270, "categories": ["North Indian", "Snacks"]},
]

CUSTOMER_NAMES = [
    "Aarav Mehta", "Isha Kapoor", "Rohan Gupta", "Priya Nair", "Vikram Rathi",
    "Ananya Joshi", "Karan Malhotra", "Sneha Reddy", "Aditya Bhatt", "Neha Choudhary",
    "Siddharth Rao", "Divya Iyer", "Manish Tiwari", "Ritika Saxena", "Arjun Deshmukh",
]

DISHES = [
    {"name": "Rajma Chawal", "mealType": "lunch", "dietaryType": "veg", "price": 80, "desc": "Slow-cooked kidney beans in a rich tomato gravy, served with steamed rice.", "ingredients": ["Rajma", "Rice", "Onion", "Tomato", "Spices"], "allergens": []},
    {"name": "Dal Tadka + Rice", "mealType": "lunch", "dietaryType": "veg", "price": 70, "desc": "Yellow lentils tempered with ghee, cumin, and garlic, with steamed rice.", "ingredients": ["Toor dal", "Rice", "Ghee", "Garlic", "Cumin"], "allergens": ["Dairy"]},
    {"name": "Aloo Paratha + Curd", "mealType": "breakfast", "dietaryType": "veg", "price": 60, "desc": "Stuffed potato flatbread served hot with fresh curd and pickle.", "ingredients": ["Wheat flour", "Potato", "Curd", "Butter"], "allergens": ["Gluten", "Dairy"]},
    {"name": "Poha", "mealType": "breakfast", "dietaryType": "veg", "price": 40, "desc": "Flattened rice tempered with mustard seeds, peanuts, and curry leaves.", "ingredients": ["Poha", "Peanuts", "Onion", "Curry leaves"], "allergens": ["Peanuts"]},
    {"name": "Idli Sambar", "mealType": "breakfast", "dietaryType": "veg", "price": 55, "desc": "Steamed rice cakes served with sambar and coconut chutney.", "ingredients": ["Rice", "Urad dal", "Toor dal", "Vegetables"], "allergens": []},
    {"name": "Roti Sabzi", "mealType": "dinner", "dietaryType": "veg", "price": 75, "desc": "Fresh tawa rotis with a seasonal home-style vegetable curry.", "ingredients": ["Wheat flour", "Seasonal vegetables", "Spices"], "allergens": ["Gluten"]},
    {"name": "Chole Rice", "mealType": "lunch", "dietaryType": "veg", "price": 85, "desc": "Spicy chickpea curry cooked Punjabi-style, served with rice.", "ingredients": ["Chickpeas", "Rice", "Onion", "Tomato", "Spices"], "allergens": []},
    {"name": "Khichdi", "mealType": "dinner", "dietaryType": "veg", "price": 65, "desc": "Comforting rice and lentil khichdi with ghee, easy on the stomach.", "ingredients": ["Rice", "Moong dal", "Ghee", "Turmeric"], "allergens": ["Dairy"]},
    {"name": "Butter Chicken + Rice", "mealType": "dinner", "dietaryType": "non-veg", "price": 130, "desc": "Rich tomato-butter chicken curry with steamed rice.", "ingredients": ["Chicken", "Butter", "Tomato", "Cream", "Rice"], "allergens": ["Dairy"]},
    {"name": "Egg Curry + Roti", "mealType": "dinner", "dietaryType": "non-veg", "price": 95, "desc": "Boiled eggs simmered in a spiced onion-tomato gravy with fresh rotis.", "ingredients": ["Eggs", "Wheat flour", "Onion", "Tomato"], "allergens": ["Eggs", "Gluten"]},
    {"name": "Paneer Bhurji + Paratha", "mealType": "breakfast", "dietaryType": "veg", "price": 90, "desc": "Scrambled cottage cheese with onions and spices, served with paratha.", "ingredients": ["Paneer", "Wheat flour", "Onion", "Capsicum"], "allergens": ["Dairy", "Gluten"]},
    {"name": "Veg Pulao + Raita", "mealType": "lunch", "dietaryType": "veg", "price": 75, "desc": "Fragrant rice cooked with mixed vegetables and whole spices, with cooling raita.", "ingredients": ["Rice", "Mixed vegetables", "Curd", "Spices"], "allergens": ["Dairy"]},
    {"name": "Besan Chilla", "mealType": "breakfast", "dietaryType": "veg", "price": 50, "desc": "Savory gram-flour pancakes with onions and coriander.", "ingredients": ["Besan", "Onion", "Coriander", "Spices"], "allergens": []},
    {"name": "Kadhi Chawal", "mealType": "lunch", "dietaryType": "veg", "price": 70, "desc": "Tangy yogurt-based curry with gram flour dumplings, served with rice.", "ingredients": ["Curd", "Besan", "Rice", "Spices"], "allergens": ["Dairy"]},
    {"name": "Chicken Curry + Rice", "mealType": "lunch", "dietaryType": "non-veg", "price": 140, "desc": "Home-style chicken curry slow cooked with everyday spices.", "ingredients": ["Chicken", "Onion", "Tomato", "Rice", "Spices"], "allergens": []},
    {"name": "Moong Dal Cheela + Chutney", "mealType": "snacks", "dietaryType": "veg", "price": 45, "desc": "Protein-rich lentil pancakes served with mint chutney.", "ingredients": ["Moong dal", "Ginger", "Green chilli"], "allergens": []},
    {"name": "Samosa (2 pcs)", "mealType": "snacks", "dietaryType": "veg", "price": 30, "desc": "Crispy fried pastry stuffed with spiced potatoes and peas.", "ingredients": ["Wheat flour", "Potato", "Peas", "Spices"], "allergens": ["Gluten"]},
    {"name": "Bhindi Masala + Roti", "mealType": "dinner", "dietaryType": "veg", "price": 75, "desc": "Okra stir-fried with onions and spices, served with fresh rotis.", "ingredients": ["Bhindi", "Onion", "Wheat flour", "Spices"], "allergens": ["Gluten"]},
]

REVIEW_COMMENTS = [
    "Tasted just like home. Will order again!",
    "Fresh and flavorful, arrived on time.",
    "Loved the portion size for the price.",
    "Good food but delivery was a little late.",
    "Reminded me of my mother's cooking, thank you!",
    "Simple, honest, home-style food. Recommended.",
    "Packaging could be better but taste was great.",
]

def days_ago(n: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=n)

def fetch_demo_food_image() -> str:
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get("https://foodish-api.com/api/")
            if resp.status_code == 200:
                data = resp.json()
                return data.get("image", "")
    except Exception:
        pass
    return ""

def run_seed():
    print(f"[seed] Connecting to MongoDB at {settings.MONGO_URI}...")
    client = MongoClient(settings.MONGO_URI)
    db_name = "gharse"
    try:
        uri_parts = settings.MONGO_URI.split("/")
        if len(uri_parts) > 3 and uri_parts[3].split("?")[0]:
            db_name = uri_parts[3].split("?")[0]
    except Exception:
        pass
    db = client[db_name]

    print("[seed] Clearing existing demo collections...")
    db.reviews.delete_many({})
    db.complaints.delete_many({})
    db.orders.delete_many({})
    db.foodlistings.delete_many({})
    db.sellerprofiles.delete_many({})
    db.users.delete_many({"$or": [{"isDemo": True}, {"email": "admin@gharse.app"}]})

    password_hash = hash_password("password123")
    now = datetime.now(timezone.utc)

    # --- Admin ---
    admin_res = db.users.insert_one({
        "name": "GharSe Admin",
        "email": "admin@gharse.app",
        "passwordHash": password_hash,
        "role": "admin",
        "locality": "Rewari, Haryana",
        "foodPreferences": [],
        "isDemo": True,
        "createdAt": now,
        "updatedAt": now
    })
    print(f"[seed] Created Admin: admin@gharse.app")

    # --- Platform Config ---
    db.platformconfigs.delete_many({})
    db.platformconfigs.insert_one({
        "key": "singleton",
        "commissionPercent": 15.0,
        "createdAt": now,
        "updatedAt": now
    })

    # --- Sellers ---
    seller_docs = []
    for s in SELLERS:
        email = f"{s['name'].split()[0].lower()}@gharse-demo.app"
        phone = f"9{random.randint(100000000, 999999999)}"
        u_res = db.users.insert_one({
            "name": s["name"],
            "email": email,
            "phone": phone,
            "passwordHash": password_hash,
            "role": "seller",
            "locality": s["locality"],
            "approximateLocation": {"lat": s["lat"], "lng": s["lng"]},
            "foodPreferences": [],
            "isDemo": True,
            "createdAt": now,
            "updatedAt": now
        })
        user_id = u_res.inserted_id

        sp_res = db.sellerprofiles.insert_one({
            "userId": user_id,
            "bio": f"{s['kitchen']} — home-style {' & '.join(s['categories'])} food, made fresh daily.",
            "categories": s["categories"],
            "verificationStatus": "verified",
            "verificationNotes": "",
            "profilePhoto": "",
            "deliveryRadiusKm": float(random.randint(2, 4)),
            "pickupAvailable": True,
            "deliveryAvailable": True,
            "rating": 0.0,
            "ratingCount": 0,
            "totalOrders": 0,
            "isDemo": True,
            "createdAt": now,
            "updatedAt": now
        })
        profile_id = sp_res.inserted_id
        seller_docs.append({
            "userId": user_id,
            "profileId": profile_id,
            "email": email,
            "name": s["name"],
            "kitchen": s["kitchen"],
            "locality": s["locality"],
            "lat": s["lat"],
            "lng": s["lng"]
        })

    # Pending Seller
    pending_u_res = db.users.insert_one({
        "name": "Meena Kumari",
        "email": "meena@gharse-demo.app",
        "phone": f"9{random.randint(100000000, 999999999)}",
        "passwordHash": password_hash,
        "role": "seller",
        "locality": "Sector 3, Rewari",
        "approximateLocation": {"lat": 28.201, "lng": 76.620},
        "foodPreferences": [],
        "isDemo": True,
        "createdAt": now,
        "updatedAt": now
    })
    db.sellerprofiles.insert_one({
        "userId": pending_u_res.inserted_id,
        "bio": "New home cook getting started on GharSe.",
        "categories": ["Home-style"],
        "verificationStatus": "pending",
        "verificationNotes": "",
        "profilePhoto": "",
        "deliveryRadiusKm": 2.0,
        "pickupAvailable": True,
        "deliveryAvailable": False,
        "rating": 0.0,
        "ratingCount": 0,
        "totalOrders": 0,
        "isDemo": True,
        "createdAt": now,
        "updatedAt": now
    })

    # --- Customers ---
    customer_docs = []
    for name in CUSTOMER_NAMES:
        email = f"{name.split()[0].lower()}@gharse-demo.app"
        phone = f"8{random.randint(100000000, 999999999)}"
        loc = random.choice(SELLERS)["locality"]
        c_res = db.users.insert_one({
            "name": name,
            "email": email,
            "phone": phone,
            "passwordHash": password_hash,
            "role": "customer",
            "locality": loc,
            "approximateLocation": {
                "lat": round(28.2 + (random.random() - 0.5) * 0.02, 4),
                "lng": round(76.62 + (random.random() - 0.5) * 0.02, 4)
            },
            "foodPreferences": [],
            "isDemo": True,
            "createdAt": now,
            "updatedAt": now
        })
        customer_docs.append({
            "id": c_res.inserted_id,
            "name": name,
            "email": email,
            "locality": loc
        })

    # --- Food Listings ---
    print("[seed] Creating food listings with demo images...")
    listings = []
    for s in seller_docs:
        dish_count = random.randint(3, 5)
        chosen_dishes = random.sample(DISHES, dish_count)
        for dish in chosen_dishes:
            qty = random.randint(6, 15)
            img = fetch_demo_food_image()
            ready_times = {
                "breakfast": "9:00 AM",
                "lunch": "1:30 PM",
                "dinner": "8:00 PM",
                "snacks": "5:00 PM"
            }
            fl_res = db.foodlistings.insert_one({
                "sellerId": s["profileId"],
                "name": dish["name"],
                "description": dish["desc"],
                "image": img,
                "price": float(dish["price"]),
                "quantity": qty,
                "remainingQuantity": qty,
                "mealType": dish["mealType"],
                "date": now,
                "readyTime": ready_times.get(dish["mealType"], "1:00 PM"),
                "pickupAvailable": True,
                "deliveryAvailable": True,
                "deliveryRadiusKm": 3.0,
                "deliveryFee": float(random.randint(0, 20)),
                "dietaryType": dish["dietaryType"],
                "ingredients": dish["ingredients"],
                "allergens": dish["allergens"],
                "status": "active",
                "isDemo": True,
                "createdAt": now,
                "updatedAt": now
            })
            listings.append({
                "id": fl_res.inserted_id,
                "seller": s,
                "name": dish["name"],
                "price": float(dish["price"]),
                "deliveryFee": float(random.randint(0, 20)),
                "quantity": qty
            })

    # Mark first 2 listings as sold out for realism
    for l in listings[:2]:
        db.foodlistings.update_one(
            {"_id": l["id"]},
            {"$set": {"remainingQuantity": 0, "status": "soldout"}}
        )

    # --- Historical Orders ---
    print("[seed] Seeding historical orders and reviews...")
    order_count = random.randint(24, 30)
    completed_for_review = []
    order_index = 0

    for i in range(order_count):
        active_listings = [l for l in listings if l["quantity"] > 0]
        chosen_l = random.choice(active_listings)
        customer = random.choice(customer_docs)
        qty = random.randint(1, 2)
        fulfillment = "pickup" if random.random() > 0.5 else "delivery"
        subtotal = chosen_l["price"] * qty
        del_fee = chosen_l["deliveryFee"] if fulfillment == "delivery" else 0.0
        total = subtotal + del_fee
        commission_amt = round((subtotal * 15.0) / 100.0)
        seller_earnings = subtotal - commission_amt

        roll = random.random()
        if roll < 0.55:
            st = "completed"
        elif roll < 0.65:
            st = "placed"
        elif roll < 0.75:
            st = "accepted"
        elif roll < 0.85:
            st = "preparing"
        elif roll < 0.92:
            st = "ready"
        else:
            st = "rejected"

        order_date = days_ago(random.randint(0, 10))
        ord_res = db.orders.insert_one({
            "orderNumber": f"GS{1000 + order_index}",
            "customerId": customer["id"],
            "sellerId": chosen_l["seller"]["profileId"],
            "items": [
                {
                    "listingId": chosen_l["id"],
                    "name": chosen_l["name"],
                    "price": chosen_l["price"],
                    "quantity": qty
                }
            ],
            "subtotal": subtotal,
            "deliveryFee": del_fee,
            "total": total,
            "fulfillmentType": fulfillment,
            "deliveryLocality": customer["locality"] if fulfillment == "delivery" else "",
            "status": st,
            "rejectionReason": "Ran out of ingredients today." if st == "rejected" else "",
            "paymentMethod": "upi" if random.random() > 0.7 else "cash",
            "paymentStatus": "paid" if st == "completed" else "cash_on_fulfillment",
            "platformCommissionPercent": 15.0,
            "platformCommissionAmount": commission_amt,
            "sellerEarnings": seller_earnings,
            "isDemo": True,
            "createdAt": order_date,
            "updatedAt": order_date
        })
        order_index += 1

        if st == "completed":
            db.sellerprofiles.update_one(
                {"_id": chosen_l["seller"]["profileId"]},
                {"$inc": {"totalOrders": 1}}
            )
            completed_for_review.append({
                "orderId": ord_res.inserted_id,
                "sellerProfileId": chosen_l["seller"]["profileId"],
                "customerId": customer["id"]
            })

    # --- Reviews ---
    for item in completed_for_review:
        if random.random() > 0.7:
            continue
        rating = random.randint(3, 5)
        db.reviews.insert_one({
            "customerId": item["customerId"],
            "sellerId": item["sellerProfileId"],
            "orderId": item["orderId"],
            "rating": rating,
            "comment": random.choice(REVIEW_COMMENTS),
            "isDemo": True,
            "createdAt": now,
            "updatedAt": now
        })

    # Recalculate seller ratings
    for s in seller_docs:
        revs = list(db.reviews.find({"sellerId": s["profileId"]}))
        if revs:
            avg_rating = sum(r["rating"] for r in revs) / len(revs)
            db.sellerprofiles.update_one(
                {"_id": s["profileId"]},
                {"$set": {"rating": round(avg_rating, 1), "ratingCount": len(revs)}}
            )

    # --- Complaints ---
    for item in completed_for_review[:2]:
        db.complaints.insert_one({
            "customerId": item["customerId"],
            "orderId": item["orderId"],
            "sellerId": item["sellerProfileId"],
            "category": random.choice(["food_quality", "missing_item", "delivery_issue"]),
            "description": "Portion was slightly smaller than expected.",
            "status": random.choice(["open", "investigating", "resolved"]),
            "resolution": "",
            "createdAt": now,
            "updatedAt": now
        })

    print("[seed] Successfully finished seeding database!")
    print("\n--- Demo Accounts (Password: password123) ---")
    print("  Admin:    admin@gharse.app")
    for s in seller_docs:
        print(f"  Seller:   {s['email']}  ({s['kitchen']}, verified)")
    print("  Seller (pending): meena@gharse-demo.app")
    print(f"  Customer: {customer_docs[0]['email']}")
    print(f"  ...and {len(customer_docs) - 1} more customers.")

if __name__ == "__main__":
    run_seed()
