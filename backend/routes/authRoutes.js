const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleLogin,
  appleLogin,
  refresh,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  getSellers,
  sellerDecision,
  setup2FA,
  verify2FA,
  disable2FA,
  uploadDocument,
  getOwnDocuments,
  getSellerDocumentsForAdmin,
  verifySellerDocument,
  getDeliveryPartners,
  deliveryPartnerDecision,
  getApprovedDeliveryPartners,
  sendOtp,
  verifyOtp
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/apple', appleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Protected endpoints (requires valid JWT token in Authorization header)
router.get('/me', protect, getMe);
router.put('/update-details', protect, updateDetails);
router.put('/update-password', protect, updatePassword);

// Delivery partner endpoints for sellers/buyers
router.get('/delivery-partners', protect, getApprovedDeliveryPartners);

// Admin-only endpoints
router.get('/admin/sellers', protect, authorize('admin'), getSellers);
router.put('/admin/sellers/:id/decision', protect, authorize('admin'), sellerDecision);

// Admin delivery-partner endpoints
router.get('/admin/delivery-partners', protect, authorize('admin'), getDeliveryPartners);
router.put('/admin/delivery-partners/:id/decision', protect, authorize('admin'), deliveryPartnerDecision);

// 2FA Admin routes
router.get('/admin/2fa/setup', protect, authorize('admin'), setup2FA);
router.post('/admin/2fa/verify', protect, authorize('admin'), verify2FA);
router.post('/admin/2fa/disable', protect, authorize('admin'), disable2FA);

// Seller documents
router.route('/seller/documents')
  .post(protect, authorize('seller'), uploadDocument)
  .get(protect, authorize('seller'), getOwnDocuments);

router.route('/admin/sellers/:id/documents')
  .get(protect, authorize('admin'), getSellerDocumentsForAdmin);

router.route('/admin/sellers/:id/documents/:docId')
  .put(protect, authorize('admin'), verifySellerDocument);

module.exports = router;
