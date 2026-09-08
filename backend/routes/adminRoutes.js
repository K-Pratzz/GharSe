const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.get('/sellers', adminController.getSellers);
router.put('/sellers/:id/verify', adminController.verifySeller);
router.get('/listings', adminController.getListings);
router.put('/listings/:id/status', adminController.updateListingStatus);
router.get('/orders', adminController.getOrders);
router.get('/complaints', adminController.getComplaints);
router.put('/complaints/:id', adminController.updateComplaint);
router.get('/commission', adminController.getCommission);
router.put('/commission', adminController.setCommission);

module.exports = router;
