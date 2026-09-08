const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodListing', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true }, // e.g. GS1024
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProfile', required: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    fulfillmentType: { type: String, enum: ['pickup', 'delivery'], required: true },
    deliveryLocality: { type: String, default: '' },
    status: {
      type: String,
      enum: ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'rejected', 'cancelled'],
      default: 'placed',
    },
    rejectionReason: { type: String, default: '' },
    paymentMethod: { type: String, enum: ['cash', 'upi'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'cash_on_fulfillment'], default: 'cash_on_fulfillment' },
    platformCommissionPercent: { type: Number, required: true }, // snapshot at order time
    platformCommissionAmount: { type: Number, required: true },
    sellerEarnings: { type: Number, required: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
