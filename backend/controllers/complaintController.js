const Complaint = require('../models/Complaint');
const Order = require('../models/Order');

// POST /api/complaints - customer reports an issue with an order
exports.createComplaint = async (req, res, next) => {
  try {
    const { orderId, category, description } = req.body;
    if (!orderId || !category || !description) {
      return res.status(400).json({ message: 'Order, category, and description are required.' });
    }
    const validCategories = ['food_quality', 'missing_item', 'wrong_item', 'seller_issue', 'delivery_issue', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid complaint category.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.customerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only report issues on your own orders.' });
    }

    const complaint = await Complaint.create({
      customerId: req.user._id,
      orderId,
      sellerId: order.sellerId,
      category,
      description,
    });

    res.status(201).json({ complaint });
  } catch (err) {
    next(err);
  }
};

// GET /api/complaints/mine - customer's own complaints
exports.myComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ customerId: req.user._id }).sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    next(err);
  }
};
