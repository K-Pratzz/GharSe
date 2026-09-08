const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    phone: { type: String, trim: true, sparse: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer', required: true },
    locality: { type: String, trim: true },
    approximateLocation: locationSchema,
    foodPreferences: { type: [String], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Require at least one of email/phone
userSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    return next(new Error('Either email or phone is required'));
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
