const Review = require('../models/Review');
const Order = require('../models/Order');
const SellerProfile = require('../models/SellerProfile');

// POST /api/reviews - only allowed for customers with a completed order for that seller
exports.createReview = async (req, res, next) => {
  try {
    const { orderId, rating, comment } = req.body;
    if (!orderId || !rating) {
      return res.status(400).json({ message: 'Order and rating are required.' });
    }
    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.customerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only review your own orders.' });
    }
    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed orders.' });
    }

    const existing = await Review.findOne({ orderId });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this order.' });
    }

    const review = await Review.create({
      customerId: req.user._id,
      sellerId: order.sellerId,
      orderId,
      rating: numRating,
      comment: comment || '',
    });

    // Recalculate seller's average rating
    const seller = await SellerProfile.findById(order.sellerId);
    const newCount = seller.ratingCount + 1;
    const newRating = (seller.rating * seller.ratingCount + numRating) / newCount;
    seller.rating = Math.round(newRating * 10) / 10;
    seller.ratingCount = newCount;
    await seller.save();

    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
};

// GET /api/sellers/:id/reviews
exports.getSellerReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ sellerId: req.params.id })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
};
