const express = require('express');
const router = express.Router();
const foodController = require('../controllers/foodController');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', foodController.listFoods);
router.get('/mine', requireAuth, requireRole('seller'), foodController.myListings);
router.get('/:id', foodController.getFoodById);
router.post('/', requireAuth, requireRole('seller'), upload.single('image'), foodController.createFood);
router.put('/:id', requireAuth, requireRole('seller'), upload.single('image'), foodController.updateFood);
router.delete('/:id', requireAuth, requireRole('seller'), foodController.deleteFood);

module.exports = router;
