/**
 * Seed script - populates the database with realistic demo data so the app
 * looks alive during a demo. Safe to re-run: wipes only demo-flagged /
 * app-owned collections first (does not touch unrelated data).
 *
 * Run with: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const User = require('../models/User');
const SellerProfile = require('../models/SellerProfile');
const FoodListing = require('../models/FoodListing');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Complaint = require('../models/Complaint');
const PlatformConfig = require('../models/PlatformConfig');

const SELLERS = [
  { name: 'Anita Sharma', kitchen: "Anita's Kitchen", locality: 'Sector 14, Rewari', lat: 28.1994, lng: 76.6203, categories: ['North Indian', 'Home-style'] },
  { name: 'Rekha Devi', kitchen: 'Rekha\'s Rasoi', locality: 'Model Town, Rewari', lat: 28.1975, lng: 76.6255, categories: ['Punjabi', 'Thali'] },
  { name: 'Suman Yadav', kitchen: 'Maa ke Haath Ka Khana', locality: 'Civil Lines, Rewari', lat: 28.2020, lng: 76.6180, categories: ['South Indian', 'Breakfast'] },
  { name: 'Pooja Verma', kitchen: 'Pooja\'s Tiffin', locality: 'Ashok Vihar, Rewari', lat: 28.1950, lng: 76.6230, categories: ['Vegetarian', 'Tiffin'] },
  { name: 'Kavita Singh', kitchen: 'Kavita Ghar Bhojan', locality: 'Jawahar Nagar, Rewari', lat: 28.2005, lng: 76.6270, categories: ['North Indian', 'Snacks'] },
];

const CUSTOMER_NAMES = [
  'Aarav Mehta', 'Isha Kapoor', 'Rohan Gupta', 'Priya Nair', 'Vikram Rathi',
  'Ananya Joshi', 'Karan Malhotra', 'Sneha Reddy', 'Aditya Bhatt', 'Neha Choudhary',
  'Siddharth Rao', 'Divya Iyer', 'Manish Tiwari', 'Ritika Saxena', 'Arjun Deshmukh',
];

const DISHES = [
  { name: 'Rajma Chawal', mealType: 'lunch', dietaryType: 'veg', price: 80, desc: 'Slow-cooked kidney beans in a rich tomato gravy, served with steamed rice.', ingredients: ['Rajma', 'Rice', 'Onion', 'Tomato', 'Spices'], allergens: [] },
  { name: 'Dal Tadka + Rice', mealType: 'lunch', dietaryType: 'veg', price: 70, desc: 'Yellow lentils tempered with ghee, cumin, and garlic, with steamed rice.', ingredients: ['Toor dal', 'Rice', 'Ghee', 'Garlic', 'Cumin'], allergens: ['Dairy'] },
  { name: 'Aloo Paratha + Curd', mealType: 'breakfast', dietaryType: 'veg', price: 60, desc: 'Stuffed potato flatbread served hot with fresh curd and pickle.', ingredients: ['Wheat flour', 'Potato', 'Curd', 'Butter'], allergens: ['Gluten', 'Dairy'] },
  { name: 'Poha', mealType: 'breakfast', dietaryType: 'veg', price: 40, desc: 'Flattened rice tempered with mustard seeds, peanuts, and curry leaves.', ingredients: ['Poha', 'Peanuts', 'Onion', 'Curry leaves'], allergens: ['Peanuts'] },
  { name: 'Idli Sambar', mealType: 'breakfast', dietaryType: 'veg', price: 55, desc: 'Steamed rice cakes served with sambar and coconut chutney.', ingredients: ['Rice', 'Urad dal', 'Toor dal', 'Vegetables'], allergens: [] },
  { name: 'Roti Sabzi', mealType: 'dinner', dietaryType: 'veg', price: 75, desc: 'Fresh tawa rotis with a seasonal home-style vegetable curry.', ingredients: ['Wheat flour', 'Seasonal vegetables', 'Spices'], allergens: ['Gluten'] },
  { name: 'Chole Rice', mealType: 'lunch', dietaryType: 'veg', price: 85, desc: 'Spicy chickpea curry cooked Punjabi-style, served with rice.', ingredients: ['Chickpeas', 'Rice', 'Onion', 'Tomato', 'Spices'], allergens: [] },
  { name: 'Khichdi', mealType: 'dinner', dietaryType: 'veg', price: 65, desc: 'Comforting rice and lentil khichdi with ghee, easy on the stomach.', ingredients: ['Rice', 'Moong dal', 'Ghee', 'Turmeric'], allergens: ['Dairy'] },
  { name: 'Butter Chicken + Rice', mealType: 'dinner', dietaryType: 'non-veg', price: 130, desc: 'Rich tomato-butter chicken curry with steamed rice.', ingredients: ['Chicken', 'Butter', 'Tomato', 'Cream', 'Rice'], allergens: ['Dairy'] },
  { name: 'Egg Curry + Roti', mealType: 'dinner', dietaryType: 'non-veg', price: 95, desc: 'Boiled eggs simmered in a spiced onion-tomato gravy with fresh rotis.', ingredients: ['Eggs', 'Wheat flour', 'Onion', 'Tomato'], allergens: ['Eggs', 'Gluten'] },
  { name: 'Paneer Bhurji + Paratha', mealType: 'breakfast', dietaryType: 'veg', price: 90, desc: 'Scrambled cottage cheese with onions and spices, served with paratha.', ingredients: ['Paneer', 'Wheat flour', 'Onion', 'Capsicum'], allergens: ['Dairy', 'Gluten'] },
  { name: 'Veg Pulao + Raita', mealType: 'lunch', dietaryType: 'veg', price: 75, desc: 'Fragrant rice cooked with mixed vegetables and whole spices, with cooling raita.', ingredients: ['Rice', 'Mixed vegetables', 'Curd', 'Spices'], allergens: ['Dairy'] },
  { name: 'Besan Chilla', mealType: 'breakfast', dietaryType: 'veg', price: 50, desc: 'Savory gram-flour pancakes with onions and coriander.', ingredients: ['Besan', 'Onion', 'Coriander', 'Spices'], allergens: [] },
  { name: 'Kadhi Chawal', mealType: 'lunch', dietaryType: 'veg', price: 70, desc: 'Tangy yogurt-based curry with gram flour dumplings, served with rice.', ingredients: ['Curd', 'Besan', 'Rice', 'Spices'], allergens: ['Dairy'] },
  { name: 'Chicken Curry + Rice', mealType: 'lunch', dietaryType: 'non-veg', price: 140, desc: 'Home-style chicken curry slow cooked with everyday spices.', ingredients: ['Chicken', 'Onion', 'Tomato', 'Rice', 'Spices'], allergens: [] },
  { name: 'Moong Dal Cheela + Chutney', mealType: 'snacks', dietaryType: 'veg', price: 45, desc: 'Protein-rich lentil pancakes served with mint chutney.', ingredients: ['Moong dal', 'Ginger', 'Green chilli'], allergens: [] },
  { name: 'Samosa (2 pcs)', mealType: 'snacks', dietaryType: 'veg', price: 30, desc: 'Crispy fried pastry stuffed with spiced potatoes and peas.', ingredients: ['Wheat flour', 'Potato', 'Peas', 'Spices'], allergens: ['Gluten'] },
  { name: 'Bhindi Masala + Roti', mealType: 'dinner', dietaryType: 'veg', price: 75, desc: 'Okra stir-fried with onions and spices, served with fresh rotis.', ingredients: ['Bhindi', 'Onion', 'Wheat flour', 'Spices'], allergens: ['Gluten'] },
];

const REVIEW_COMMENTS = [
  'Tasted just like home. Will order again!',
  'Fresh and flavorful, arrived on time.',
  'Loved the portion size for the price.',
  'Good food but delivery was a little late.',
  'Reminded me of my mother\'s cooking, thank you!',
  'Simple, honest, home-style food. Recommended.',
  'Packaging could be better but taste was great.',
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

/**
 * Pulls a real (if generic) food photo from the free, keyless Foodish API
 * (https://github.com/surhud004/Foodish) so seeded listings show actual
 * photos instead of blank cards. Foodish doesn't have Indian-dish-specific
 * categories, so this is illustrative, not dish-accurate — real sellers
 * should upload their own photo via the "Add today's food" form instead.
 * Fails silently (returns '') if the machine seeding has no internet access,
 * so seeding never breaks because of this.
 */
async function fetchDemoFoodImage() {
  try {
    const res = await fetch('https://foodish-api.com/api/', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return '';
    const data = await res.json();
    return data.image || '';
  } catch {
    return '';
  }
}

async function seed() {
  await connectDB();
  console.log('[seed] Clearing existing demo-owned collections...');

  await Promise.all([
    Review.deleteMany({}),
    Complaint.deleteMany({}),
    Order.deleteMany({}),
    FoodListing.deleteMany({}),
    SellerProfile.deleteMany({}),
    User.deleteMany({ isDemo: true }),
  ]);
  // Keep a real admin if one already exists without the demo flag; otherwise create one.
  await User.deleteOne({ email: 'admin@gharse.app' });

  const passwordHash = await bcrypt.hash('password123', 10);

  // --- Admin ---
  const admin = await User.create({
    name: 'GharSe Admin',
    email: 'admin@gharse.app',
    passwordHash,
    role: 'admin',
    locality: 'Rewari, Haryana',
    isDemo: true,
  });

  // --- Platform config ---
  await PlatformConfig.deleteMany({});
  await PlatformConfig.create({ key: 'singleton', commissionPercent: 15 });

  // --- Sellers ---
  const sellerDocs = [];
  for (const s of SELLERS) {
    const user = await User.create({
      name: s.name,
      email: `${s.name.split(' ')[0].toLowerCase()}@gharse-demo.app`,
      phone: `9${randInt(100000000, 999999999)}`,
      passwordHash,
      role: 'seller',
      locality: s.locality,
      approximateLocation: { lat: s.lat, lng: s.lng },
      isDemo: true,
    });
    const profile = await SellerProfile.create({
      userId: user._id,
      bio: `${s.kitchen} — home-style ${s.categories.join(' & ')} food, made fresh daily.`,
      categories: s.categories,
      verificationStatus: 'verified',
      deliveryRadiusKm: randInt(2, 4),
      pickupAvailable: true,
      deliveryAvailable: true,
      rating: 0,
      ratingCount: 0,
      totalOrders: 0,
      isDemo: true,
    });
    sellerDocs.push({ user, profile, kitchen: s.kitchen });
  }

  // One seller pending verification (demonstrates the verification flow)
  const pendingUser = await User.create({
    name: 'Meena Kumari',
    email: 'meena@gharse-demo.app',
    phone: `9${randInt(100000000, 999999999)}`,
    passwordHash,
    role: 'seller',
    locality: 'Sector 3, Rewari',
    approximateLocation: { lat: 28.201, lng: 76.62 },
    isDemo: true,
  });
  await SellerProfile.create({
    userId: pendingUser._id,
    bio: 'New home cook getting started on GharSe.',
    categories: ['Home-style'],
    verificationStatus: 'pending',
    deliveryRadiusKm: 2,
    pickupAvailable: true,
    deliveryAvailable: false,
    isDemo: true,
  });

  // --- Customers ---
  const customerDocs = [];
  for (const name of CUSTOMER_NAMES) {
    const user = await User.create({
      name,
      email: `${name.split(' ')[0].toLowerCase()}@gharse-demo.app`,
      phone: `8${randInt(100000000, 999999999)}`,
      passwordHash,
      role: 'customer',
      locality: rand(SELLERS).locality,
      approximateLocation: {
        lat: 28.2 + (Math.random() - 0.5) * 0.02,
        lng: 76.62 + (Math.random() - 0.5) * 0.02,
      },
      isDemo: true,
    });
    customerDocs.push(user);
  }

  // --- Food listings (today's menu for each verified seller) ---
  console.log('[seed] Fetching demo food photos (needs internet access)...');
  const listings = [];
  for (const seller of sellerDocs) {
    const dishCount = randInt(3, 5);
    const chosenDishes = [...DISHES].sort(() => 0.5 - Math.random()).slice(0, dishCount);
    for (const dish of chosenDishes) {
      const quantity = randInt(6, 15);
      const image = await fetchDemoFoodImage();
      const listing = await FoodListing.create({
        sellerId: seller.profile._id,
        name: dish.name,
        description: dish.desc,
        image,
        price: dish.price,
        quantity,
        remainingQuantity: quantity,
        mealType: dish.mealType,
        date: new Date(),
        readyTime: dish.mealType === 'breakfast' ? '9:00 AM' : dish.mealType === 'lunch' ? '1:30 PM' : dish.mealType === 'dinner' ? '8:00 PM' : '5:00 PM',
        pickupAvailable: true,
        deliveryAvailable: seller.profile.deliveryAvailable,
        deliveryRadiusKm: seller.profile.deliveryRadiusKm,
        deliveryFee: randInt(0, 20),
        dietaryType: dish.dietaryType,
        ingredients: dish.ingredients,
        allergens: dish.allergens,
        status: 'active',
        isDemo: true,
      });
      listings.push({ listing, seller });
    }
  }
  // Mark a couple as sold out for realism
  for (const { listing } of listings.slice(0, 2)) {
    listing.remainingQuantity = 0;
    listing.status = 'soldout';
    await listing.save();
  }

  // --- Historical orders (mix of statuses) across past days ---
  const config = await PlatformConfig.getConfig();
  const orderCount = randInt(24, 30);
  let orderIndex = 0;
  const completedForReview = [];

  for (let i = 0; i < orderCount; i++) {
    const { listing, seller } = rand(listings.filter((l) => l.listing.quantity > 0));
    const customer = rand(customerDocs);
    const qty = randInt(1, 2);
    const fulfillmentType = Math.random() > 0.5 ? 'pickup' : 'delivery';
    const subtotal = listing.price * qty;
    const deliveryFee = fulfillmentType === 'delivery' ? listing.deliveryFee : 0;
    const total = subtotal + deliveryFee;
    const commissionAmount = Math.round((subtotal * config.commissionPercent) / 100);
    const sellerEarnings = subtotal - commissionAmount;

    const statusRoll = Math.random();
    let status;
    if (statusRoll < 0.55) status = 'completed';
    else if (statusRoll < 0.65) status = 'placed';
    else if (statusRoll < 0.75) status = 'accepted';
    else if (statusRoll < 0.85) status = 'preparing';
    else if (statusRoll < 0.92) status = 'ready';
    else status = 'rejected';

    const createdAt = daysAgo(randInt(0, 10));
    const order = await Order.create({
      orderNumber: `GS${1000 + orderIndex}`,
      customerId: customer._id,
      sellerId: seller.profile._id,
      items: [{ listingId: listing._id, name: listing.name, price: listing.price, quantity: qty }],
      subtotal,
      deliveryFee,
      total,
      fulfillmentType,
      deliveryLocality: fulfillmentType === 'delivery' ? customer.locality : '',
      status,
      rejectionReason: status === 'rejected' ? 'Ran out of ingredients today.' : '',
      paymentMethod: Math.random() > 0.7 ? 'upi' : 'cash',
      paymentStatus: status === 'completed' ? 'paid' : 'cash_on_fulfillment',
      platformCommissionPercent: config.commissionPercent,
      platformCommissionAmount: commissionAmount,
      sellerEarnings,
      isDemo: true,
      createdAt,
    });
    // override timestamps (Mongoose sets them on create; patch directly)
    await Order.updateOne({ _id: order._id }, { $set: { createdAt, updatedAt: createdAt } });

    orderIndex += 1;
    if (status === 'completed') {
      seller.profile.totalOrders += 1;
      completedForReview.push({ order, seller, customer });
    }
  }
  await Promise.all(sellerDocs.map((s) => s.profile.save()));

  // --- Reviews for ~70% of completed orders ---
  for (const { order, seller, customer } of completedForReview) {
    if (Math.random() > 0.7) continue;
    const rating = randInt(3, 5);
    await Review.create({
      customerId: customer._id,
      sellerId: seller.profile._id,
      orderId: order._id,
      rating,
      comment: rand(REVIEW_COMMENTS),
      isDemo: true,
    });
  }

  // Recalculate seller ratings from actual review data
  for (const seller of sellerDocs) {
    const reviews = await Review.find({ sellerId: seller.profile._id });
    if (reviews.length) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      seller.profile.rating = Math.round(avg * 10) / 10;
      seller.profile.ratingCount = reviews.length;
      await seller.profile.save();
    }
  }

  // --- A couple of complaints for realism ---
  const someCompleted = completedForReview.slice(0, 3);
  for (const { order, customer } of someCompleted.slice(0, 2)) {
    await Complaint.create({
      customerId: customer._id,
      orderId: order._id,
      sellerId: order.sellerId,
      category: rand(['food_quality', 'missing_item', 'delivery_issue']),
      description: 'Portion was smaller than expected for this order.',
      status: rand(['open', 'investigating', 'resolved']),
      resolution: '',
    });
  }

  console.log('[seed] Done.');
  console.log('[seed] Demo accounts (all passwords: password123):');
  console.log(`  Admin:    admin@gharse.app`);
  for (const s of sellerDocs) {
    console.log(`  Seller:   ${s.user.email}  (${s.kitchen}, verified)`);
  }
  console.log(`  Seller (pending verification): ${pendingUser.email}`);
  console.log(`  Customer: ${customerDocs[0].email}`);
  console.log(`  ...and ${customerDocs.length - 1} more demo customers.`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
