const bcrypt = require('bcryptjs');
const User = require('../models/User');
const SellerProfile = require('../models/SellerProfile');
const { signToken } = require('../utils/jwt');

exports.register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = 'customer',
      locality,
      approximateLocation,
      foodPreferences,
      // seller-specific fields
      bio,
      categories,
      deliveryRadiusKm,
      pickupAvailable,
      deliveryAvailable,
    } = req.body;

    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({ message: 'Name, password, and email or phone are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (!['customer', 'seller'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role for self-registration.' });
    }

    const existing = await User.findOne({
      $or: [email ? { email: email.toLowerCase() } : null, phone ? { phone } : null].filter(Boolean),
    });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email/phone already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email ? email.toLowerCase() : undefined,
      phone,
      passwordHash,
      role,
      locality,
      approximateLocation,
      foodPreferences: foodPreferences || [],
    });

    let sellerProfile = null;
    if (role === 'seller') {
      sellerProfile = await SellerProfile.create({
        userId: user._id,
        bio: bio || '',
        categories: categories || [],
        deliveryRadiusKm: deliveryRadiusKm || 2,
        pickupAvailable: pickupAvailable !== undefined ? pickupAvailable : true,
        deliveryAvailable: deliveryAvailable !== undefined ? deliveryAvailable : false,
        verificationStatus: 'pending',
      });
    }

    const token = signToken(user);
    res.status(201).json({
      token,
      user: sanitizeUser(user),
      sellerProfile,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier = email or phone
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/phone and password are required.' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

    let sellerProfile = null;
    if (user.role === 'seller') {
      sellerProfile = await SellerProfile.findOne({ userId: user._id });
    }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user), sellerProfile });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    let sellerProfile = null;
    if (req.user.role === 'seller') {
      sellerProfile = await SellerProfile.findOne({ userId: req.user._id });
    }
    res.json({ user: sanitizeUser(req.user), sellerProfile });
  } catch (err) {
    next(err);
  }
};

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  return obj;
}
