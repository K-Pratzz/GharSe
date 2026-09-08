const FoodListing = require('../models/FoodListing');
const SellerProfile = require('../models/SellerProfile');
const { saveImage } = require('../services/imageStorage');
const { haversineKm } = require('../utils/distance');

// GET /api/foods - public feed with filters/sort, optional customer lat/lng for distance
exports.listFoods = async (req, res, next) => {
  try {
    const {
      mealType,
      dietaryType,
      pickup,
      delivery,
      maxPrice,
      minRating,
      sort = 'recent',
      lat,
      lng,
      maxDistanceKm,
    } = req.query;

    const query = { status: 'active' };
    if (mealType) query.mealType = mealType;
    if (dietaryType) query.dietaryType = dietaryType;
    if (pickup === 'true') query.pickupAvailable = true;
    if (delivery === 'true') query.deliveryAvailable = true;
    if (maxPrice) query.price = { $lte: Number(maxPrice) };

    // Only show today's and future-dated listings that haven't expired
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    query.date = { $gte: startOfToday };
    query.remainingQuantity = { $gt: 0 };

    let listings = await FoodListing.find(query)
      .populate({
        path: 'sellerId',
        select: 'rating ratingCount verificationStatus deliveryRadiusKm userId',
        populate: { path: 'userId', select: 'name approximateLocation locality' },
      })
      .lean();

    const customerPoint = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;

    listings = listings.map((l) => {
      const sellerLocation = l.sellerId?.userId?.approximateLocation;
      const distanceKm = customerPoint ? haversineKm(customerPoint, sellerLocation) : null;
      return { ...l, distanceKm };
    });

    if (minRating) {
      listings = listings.filter((l) => (l.sellerId?.rating || 0) >= Number(minRating));
    }
    if (maxDistanceKm && customerPoint) {
      listings = listings.filter((l) => l.distanceKm !== null && l.distanceKm <= Number(maxDistanceKm));
    }

    switch (sort) {
      case 'nearest':
        listings.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
        break;
      case 'price_low':
        listings.sort((a, b) => a.price - b.price);
        break;
      case 'rating':
        listings.sort((a, b) => (b.sellerId?.rating || 0) - (a.sellerId?.rating || 0));
        break;
      case 'recent':
      default:
        listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({ listings });
  } catch (err) {
    next(err);
  }
};

exports.getFoodById = async (req, res, next) => {
  try {
    const listing = await FoodListing.findById(req.params.id).populate({
      path: 'sellerId',
      select: 'rating ratingCount verificationStatus totalOrders bio userId deliveryRadiusKm pickupAvailable deliveryAvailable',
      populate: { path: 'userId', select: 'name locality' },
    });
    if (!listing) return res.status(404).json({ message: 'This food listing is no longer available.' });

    const otherListings = await FoodListing.find({
      sellerId: listing.sellerId._id,
      _id: { $ne: listing._id },
      status: 'active',
      remainingQuantity: { $gt: 0 },
    }).limit(6);

    res.json({ listing, otherListings });
  } catch (err) {
    next(err);
  }
};

// POST /api/foods - seller creates today's listing
exports.createFood = async (req, res, next) => {
  try {
    const sellerProfile = await SellerProfile.findOne({ userId: req.user._id });
    if (!sellerProfile) return res.status(403).json({ message: 'Seller profile not found.' });
    if (sellerProfile.verificationStatus !== 'verified') {
      return res.status(403).json({
        message: 'Your seller account is pending verification. You can add listings once approved.',
      });
    }

    const {
      name,
      description,
      price,
      quantity,
      mealType,
      date,
      readyTime,
      pickupAvailable,
      deliveryAvailable,
      deliveryRadiusKm,
      deliveryFee,
      dietaryType,
      ingredients,
      allergens,
    } = req.body;

    if (!name || price == null || quantity == null || !mealType || !date || !readyTime || !dietaryType) {
      return res.status(400).json({ message: 'Missing required fields for the listing.' });
    }
    if (Number(quantity) < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1.' });
    }
    if (Number(price) < 0) {
      return res.status(400).json({ message: 'Price cannot be negative.' });
    }

    const image = req.file ? saveImage(req.file) : req.body.image || '';

    const listing = await FoodListing.create({
      sellerId: sellerProfile._id,
      name,
      description: description || '',
      image,
      price: Number(price),
      quantity: Number(quantity),
      remainingQuantity: Number(quantity),
      mealType,
      date: new Date(date),
      readyTime,
      pickupAvailable: pickupAvailable !== undefined ? pickupAvailable === 'true' || pickupAvailable === true : true,
      deliveryAvailable: deliveryAvailable === 'true' || deliveryAvailable === true,
      deliveryRadiusKm: Number(deliveryRadiusKm) || 0,
      deliveryFee: Number(deliveryFee) || 0,
      dietaryType,
      ingredients: Array.isArray(ingredients) ? ingredients : (ingredients || '').split(',').map((s) => s.trim()).filter(Boolean),
      allergens: Array.isArray(allergens) ? allergens : (allergens || '').split(',').map((s) => s.trim()).filter(Boolean),
    });

    res.status(201).json({ listing, message: 'Your food is now live on GharSe.' });
  } catch (err) {
    next(err);
  }
};

exports.updateFood = async (req, res, next) => {
  try {
    const sellerProfile = await SellerProfile.findOne({ userId: req.user._id });
    const listing = await FoodListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    if (String(listing.sellerId) !== String(sellerProfile._id)) {
      return res.status(403).json({ message: 'You can only edit your own listings.' });
    }

    const editable = [
      'name', 'description', 'price', 'quantity', 'remainingQuantity', 'mealType', 'date', 'readyTime',
      'pickupAvailable', 'deliveryAvailable', 'deliveryRadiusKm', 'deliveryFee', 'dietaryType',
      'ingredients', 'allergens', 'status',
    ];
    editable.forEach((field) => {
      if (req.body[field] !== undefined) listing[field] = req.body[field];
    });
    if (req.file) listing.image = saveImage(req.file);

    await listing.save();
    res.json({ listing });
  } catch (err) {
    next(err);
  }
};

exports.deleteFood = async (req, res, next) => {
  try {
    const sellerProfile = await SellerProfile.findOne({ userId: req.user._id });
    const listing = await FoodListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    if (String(listing.sellerId) !== String(sellerProfile._id)) {
      return res.status(403).json({ message: 'You can only delete your own listings.' });
    }
    await listing.deleteOne();
    res.json({ message: 'Listing removed.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/foods/mine - seller's own listings (today's menu view)
exports.myListings = async (req, res, next) => {
  try {
    const sellerProfile = await SellerProfile.findOne({ userId: req.user._id });
    if (!sellerProfile) return res.status(403).json({ message: 'Seller profile not found.' });
    const listings = await FoodListing.find({ sellerId: sellerProfile._id }).sort({ createdAt: -1 });
    res.json({ listings });
  } catch (err) {
    next(err);
  }
};
