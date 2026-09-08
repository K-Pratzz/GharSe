const mongoose = require('mongoose');

const foodListingSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProfile', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 }, // originally listed
    remainingQuantity: { type: Number, required: true, min: 0 }, // decremented on order
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snacks'], required: true },
    date: { type: Date, required: true }, // the day this listing is valid for
    readyTime: { type: String, required: true }, // e.g. "13:30" stored as string for MVP simplicity
    pickupAvailable: { type: Boolean, default: true },
    deliveryAvailable: { type: Boolean, default: false },
    deliveryRadiusKm: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    dietaryType: { type: String, enum: ['veg', 'non-veg'], required: true },
    ingredients: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'soldout', 'expired', 'hidden'], default: 'active' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

foodListingSchema.index({ status: 1, date: 1, mealType: 1 });

module.exports = mongoose.model('FoodListing', foodListingSchema);
