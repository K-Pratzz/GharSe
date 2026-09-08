const SellerProfile = require('../models/SellerProfile');
const FoodListing = require('../models/FoodListing');
const Review = require('../models/Review');
const { saveImage } = require('../services/imageStorage');

// GET /api/sellers/:id - public seller profile (never exposes exact address)
exports.getSellerProfile = async (req, res, next) => {
  try {
    const seller = await SellerProfile.findById(req.params.id).populate('userId', 'name locality');
    if (!seller) return res.status(404).json({ message: 'Seller not found.' });

    const menu = await FoodListing.find({ sellerId: seller._id, status: 'active', remainingQuantity: { $gt: 0 } });
    const reviews = await Review.find({ sellerId: seller._id })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ seller, menu, reviews });
  } catch (err) {
    next(err);
  }
};

// PUT /api/sellers/profile - seller updates own profile
exports.updateProfile = async (req, res, next) => {
  try {
    const seller = await SellerProfile.findOne({ userId: req.user._id });
    if (!seller) return res.status(404).json({ message: 'Seller profile not found.' });

    const editable = ['bio', 'categories', 'deliveryRadiusKm', 'pickupAvailable', 'deliveryAvailable'];
    editable.forEach((field) => {
      if (req.body[field] !== undefined) seller[field] = req.body[field];
    });
    if (req.file) seller.profilePhoto = saveImage(req.file);

    await seller.save();
    res.json({ seller });
  } catch (err) {
    next(err);
  }
};

// POST /api/sellers/verification - resubmit verification info (resets to pending)
exports.requestVerification = async (req, res, next) => {
  try {
    const seller = await SellerProfile.findOne({ userId: req.user._id });
    if (!seller) return res.status(404).json({ message: 'Seller profile not found.' });

    seller.verificationStatus = 'pending';
    seller.verificationNotes = req.body.notes || seller.verificationNotes;
    await seller.save();

    res.json({ seller, message: 'Verification request submitted. Our team will review it shortly.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/sellers/dashboard - seller's own summary (earnings, commission breakdown)
exports.getDashboard = async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const seller = await SellerProfile.findOne({ userId: req.user._id });
    if (!seller) return res.status(404).json({ message: 'Seller profile not found.' });

    const listings = await FoodListing.find({ sellerId: seller._id }).sort({ createdAt: -1 });
    const orders = await Order.find({ sellerId: seller._id }).sort({ createdAt: -1 }).limit(50);

    const completedOrders = orders.filter((o) => o.status === 'completed');
    const totalEarnings = completedOrders.reduce((sum, o) => sum + o.sellerEarnings, 0);
    const totalCommissionPaid = completedOrders.reduce((sum, o) => sum + o.platformCommissionAmount, 0);

    res.json({
      seller,
      listings,
      recentOrders: orders,
      summary: {
        activeListings: listings.filter((l) => l.status === 'active').length,
        soldOutListings: listings.filter((l) => l.status === 'soldout').length,
        pendingOrders: orders.filter((o) => ['placed', 'accepted', 'preparing'].includes(o.status)).length,
        totalEarnings,
        totalCommissionPaid,
      },
    });
  } catch (err) {
    next(err);
  }
};
