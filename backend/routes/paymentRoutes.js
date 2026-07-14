const express = require('express');
const router = express.Router();
const {
  getPlatformSettings,
  updatePlatformSettings,
  releasePayment,
  getReleasedPayments,
  createRazorpayOrder,
  verifyRazorpaySignature
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Platform fee settings (admin only for updates)
router.route('/settings')
  .get(getPlatformSettings)                            // GET  /api/payment/settings
  .put(protect, authorize('admin'), updatePlatformSettings); // PUT  /api/payment/settings

// Razorpay integration
router.route('/razorpay-order')
  .post(createRazorpayOrder);                          // POST /api/payment/razorpay-order

router.route('/razorpay-verify')
  .post(verifyRazorpaySignature);                      // POST /api/payment/razorpay-verify

// Release a specific order's payment (seller-initiated, no auth required for now — orderId is the gate)
router.route('/release/:orderId')
  .post(releasePayment);                               // POST /api/payment/release/:orderId


// Admin: view all released payments
router.route('/released')
  .get(protect, authorize('admin'), getReleasedPayments); // GET  /api/payment/released

module.exports = router;
