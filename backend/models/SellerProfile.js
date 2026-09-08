const mongoose = require('mongoose');

const sellerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, trim: true, default: '' },
    categories: { type: [String], default: [] },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationNotes: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    deliveryRadiusKm: { type: Number, default: 2 },
    pickupAvailable: { type: Boolean, default: true },
    deliveryAvailable: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SellerProfile', sellerProfileSchema);
