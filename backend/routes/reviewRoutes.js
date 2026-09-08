const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('customer'), reviewController.createReview);

module.exports = router;
