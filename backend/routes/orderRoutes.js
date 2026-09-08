const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('customer'), orderController.createOrder);
router.get('/', requireAuth, orderController.listOrders);
router.get('/:id', requireAuth, orderController.getOrderById);
router.put('/:id/status', requireAuth, requireRole('seller'), orderController.updateOrderStatus);

module.exports = router;
