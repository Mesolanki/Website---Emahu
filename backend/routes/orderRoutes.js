const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  updateOrder,
  getAdminOrders,
  buyerConfirmDelivery
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/admin/all')
  .get(protect, authorize('admin'), getAdminOrders);

router.route('/:id')
  .put(updateOrder);

router.put('/:id/confirm-receipt', protect, buyerConfirmDelivery);

module.exports = router;
