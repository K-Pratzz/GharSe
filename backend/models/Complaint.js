const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProfile', required: true },
    category: {
      type: String,
      enum: ['food_quality', 'missing_item', 'wrong_item', 'seller_issue', 'delivery_issue', 'other'],
      required: true,
    },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'investigating', 'resolved'], default: 'open' },
    resolution: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
