const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('customer'), complaintController.createComplaint);
router.get('/mine', requireAuth, requireRole('customer'), complaintController.myComplaints);

module.exports = router;
