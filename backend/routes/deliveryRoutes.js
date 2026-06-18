const express = require('express');
const router = express.Router();
const {
  getDeliverySettings,
  updateDeliverySettings,
  calculateDeliveryCharge
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/settings', getDeliverySettings);
router.put('/settings', protect, authorize('admin'), updateDeliverySettings);
router.post('/calculate', calculateDeliveryCharge);

module.exports = router;
