const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const reviewController = require('../controllers/reviewController');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/dashboard', requireAuth, requireRole('seller'), sellerController.getDashboard);
router.put('/profile', requireAuth, requireRole('seller'), upload.single('photo'), sellerController.updateProfile);
router.post('/verification', requireAuth, requireRole('seller'), sellerController.requestVerification);
router.get('/:id/reviews', reviewController.getSellerReviews);
router.get('/:id', sellerController.getSellerProfile);

module.exports = router;
