const mongoose = require('mongoose');
const Order = require('../models/Order');
const FoodListing = require('../models/FoodListing');
const SellerProfile = require('../models/SellerProfile');
const PlatformConfig = require('../models/PlatformConfig');
const { generateOrderNumber } = require('../utils/orderNumber');

// POST /api/orders
// Single-item order for MVP simplicity (customer orders one dish at a time from the
// detail page, matching the spec's "Order Now" flow). Handles overselling atomically
// via a conditional update (findOneAndUpdate with a quantity guard) rather than a
// read-then-write, so concurrent orders can't both succeed against the same stock.
exports.createOrder = async (req, res, next) => {
  try {
    const { listingId, quantity, fulfillmentType, deliveryLocality, paymentMethod } = req.body;

    if (!listingId || !quantity || !fulfillmentType) {
      return res.status(400).json({ message: 'Listing, quantity, and fulfillment type are required.' });
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ message: 'Quantity must be a whole number of at least 1.' });
    }
    if (!['pickup', 'delivery'].includes(fulfillmentType)) {
      return res.status(400).json({ message: 'Invalid fulfillment type.' });
    }

    const listing = await FoodListing.findById(listingId);
    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ message: 'This food is no longer available.' });
    }
    if (fulfillmentType === 'pickup' && !listing.pickupAvailable) {
      return res.status(400).json({ message: 'Pickup is not available for this listing.' });
    }
    if (fulfillmentType === 'delivery' && !listing.deliveryAvailable) {
      return res.status(400).json({ message: 'Delivery is not available for this listing.' });
    }

    // Atomic, overselling-safe decrement: only succeeds if remainingQuantity >= qty
    // at the moment of the update. Two concurrent requests racing for the last
    // portions cannot both succeed.
    const updatedListing = await FoodListing.findOneAndUpdate(
      { _id: listingId, remainingQuantity: { $gte: qty }, status: 'active' },
      [
        {
          $set: {
            remainingQuantity: { $subtract: ['$remainingQuantity', qty] },
          },
        },
        {
          $set: {
            status: { $cond: [{ $lte: ['$remainingQuantity', 0] }, 'soldout', 'active'] },
          },
        },
      ],
      { new: true }
    );

    if (!updatedListing) {
      const fresh = await FoodListing.findById(listingId);
      const available = fresh ? fresh.remainingQuantity : 0;
      return res.status(409).json({ message: `Only ${available} portion${available === 1 ? '' : 's'} remaining.` });
    }

    const sellerProfile = await SellerProfile.findById(listing.sellerId);
    const config = await PlatformConfig.getConfig();

    const subtotal = listing.price * qty;
    const deliveryFee = fulfillmentType === 'delivery' ? listing.deliveryFee : 0;
    const total = subtotal + deliveryFee;
    const commissionAmount = Math.round((subtotal * config.commissionPercent) / 100);
    const sellerEarnings = subtotal - commissionAmount;

    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      customerId: req.user._id,
      sellerId: sellerProfile._id,
      items: [{ listingId: listing._id, name: listing.name, price: listing.price, quantity: qty }],
      subtotal,
      deliveryFee,
      total,
      fulfillmentType,
      deliveryLocality: fulfillmentType === 'delivery' ? deliveryLocality || '' : '',
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentMethod === 'upi' ? 'pending' : 'cash_on_fulfillment',
      platformCommissionPercent: config.commissionPercent,
      platformCommissionAmount: commissionAmount,
      sellerEarnings,
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders - current user's orders (customer) or seller's incoming orders
exports.listOrders = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'customer') {
      filter.customerId = req.user._id;
    } else if (req.user.role === 'seller') {
      const sellerProfile = await SellerProfile.findOne({ userId: req.user._id });
      if (!sellerProfile) return res.status(403).json({ message: 'Seller profile not found.' });
      filter.sellerId = sellerProfile._id;
    }
    const { status } = req.query;
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('customerId', 'name locality phone')
      .populate({ path: 'sellerId', populate: { path: 'userId', select: 'name locality' } })
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name locality phone')
      .populate({ path: 'sellerId', populate: { path: 'userId', select: 'name locality' } });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const isOwnerCustomer = req.user.role === 'customer' && String(order.customerId._id) === String(req.user._id);
    let isOwnerSeller = false;
    if (req.user.role === 'seller') {
      const sellerProfile = await SellerProfile.findOne({ userId: req.user._id });
      isOwnerSeller = sellerProfile && String(order.sellerId._id) === String(sellerProfile._id);
    }
    if (!isOwnerCustomer && !isOwnerSeller && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have access to this order.' });
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
};

const VALID_TRANSITIONS = {
  placed: ['accepted', 'rejected'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'completed'], // completed directly = pickup collected
  out_for_delivery: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
};

// PUT /api/orders/:id/status - seller updates order status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const sellerProfile = await SellerProfile.findOne({ userId: req.user._id });
    if (!sellerProfile || String(order.sellerId) !== String(sellerProfile._id)) {
      return res.status(403).json({ message: 'You can only update your own orders.' });
    }

    const allowedNext = VALID_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({ message: `Cannot move order from "${order.status}" to "${status}".` });
    }
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({ message: 'A reason is required to reject an order.' });
    }

    // If rejected/cancelled, restore stock to the listing
    if (status === 'rejected' || status === 'cancelled') {
      for (const item of order.items) {
        await FoodListing.findByIdAndUpdate(item.listingId, {
          $inc: { remainingQuantity: item.quantity },
          $set: { status: 'active' },
        });
      }
      order.rejectionReason = rejectionReason || '';
    }

    order.status = status;
    if (status === 'completed') {
      order.paymentStatus = order.paymentMethod === 'cash' ? 'cash_on_fulfillment' : order.paymentStatus;
      sellerProfile.totalOrders += 1;
      await sellerProfile.save();
    }
    await order.save();

    res.json({ order });
  } catch (err) {
    next(err);
  }
};
