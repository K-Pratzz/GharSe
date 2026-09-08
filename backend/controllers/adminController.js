const User = require('../models/User');
const SellerProfile = require('../models/SellerProfile');
const FoodListing = require('../models/FoodListing');
const Order = require('../models/Order');
const Complaint = require('../models/Complaint');
const PlatformConfig = require('../models/PlatformConfig');

exports.getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

exports.getSellers = async (req, res, next) => {
  try {
    const { verificationStatus } = req.query;
    const filter = verificationStatus ? { verificationStatus } : {};
    const sellers = await SellerProfile.find(filter).populate('userId', 'name email phone locality createdAt');
    res.json({ sellers });
  } catch (err) {
    next(err);
  }
};

exports.verifySeller = async (req, res, next) => {
  try {
    const { status, notes } = req.body; // status: verified | rejected | pending
    if (!['verified', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid verification status.' });
    }
    const seller = await SellerProfile.findById(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found.' });

    seller.verificationStatus = status;
    if (notes !== undefined) seller.verificationNotes = notes;
    await seller.save();

    res.json({ seller });
  } catch (err) {
    next(err);
  }
};

exports.getListings = async (req, res, next) => {
  try {
    const listings = await FoodListing.find({})
      .populate({ path: 'sellerId', populate: { path: 'userId', select: 'name' } })
      .sort({ createdAt: -1 });
    res.json({ listings });
  } catch (err) {
    next(err);
  }
};

exports.updateListingStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // active | hidden | expired
    if (!['active', 'hidden', 'expired', 'soldout'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    const listing = await FoodListing.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({})
      .populate('customerId', 'name')
      .populate({ path: 'sellerId', populate: { path: 'userId', select: 'name' } })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

exports.getComplaints = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const complaints = await Complaint.find(filter)
      .populate('customerId', 'name phone email')
      .populate('orderId')
      .populate({ path: 'sellerId', populate: { path: 'userId', select: 'name' } })
      .sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    next(err);
  }
};

exports.updateComplaint = async (req, res, next) => {
  try {
    const { status, resolution } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });

    if (status) complaint.status = status;
    if (resolution !== undefined) complaint.resolution = resolution;
    await complaint.save();

    res.json({ complaint });
  } catch (err) {
    next(err);
  }
};

exports.getCommission = async (req, res, next) => {
  try {
    const config = await PlatformConfig.getConfig();
    res.json({ commissionPercent: config.commissionPercent });
  } catch (err) {
    next(err);
  }
};

exports.setCommission = async (req, res, next) => {
  try {
    const { commissionPercent } = req.body;
    const value = Number(commissionPercent);
    if (isNaN(value) || value < 0 || value > 100) {
      return res.status(400).json({ message: 'Commission must be a number between 0 and 100.' });
    }
    const config = await PlatformConfig.getConfig();
    config.commissionPercent = value;
    await config.save();
    res.json({ commissionPercent: config.commissionPercent });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const [customers, sellers, pendingSellers, listings, orders, openComplaints] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'seller' }),
      SellerProfile.countDocuments({ verificationStatus: 'pending' }),
      FoodListing.countDocuments({ status: 'active' }),
      Order.countDocuments({}),
      Complaint.countDocuments({ status: { $ne: 'resolved' } }),
    ]);
    res.json({ customers, sellers, pendingSellers, activeListings: listings, totalOrders: orders, openComplaints });
  } catch (err) {
    next(err);
  }
};
