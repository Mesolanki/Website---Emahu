const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleLogin,
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
  verifyOtp,
  firebaseVerify,
  sendPhoneOtp,
  verifyPhoneOtp,
  forgotPassword,
  resendOtp,
  resetPassword,
  getGstCertificateStub,
  getKycDocumentStub,
  changeRole,
  devApproveDeliveryPartner
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/firebase-verify', firebaseVerify);
router.post('/send-phone-otp', sendPhoneOtp);
router.post('/verify-phone-otp', verifyPhoneOtp);
router.post('/forgot-password', forgotPassword);
router.post('/resend-otp', resendOtp);
router.post('/reset-password', resetPassword);
router.get('/gst_certificate_stub.pdf', getGstCertificateStub);
router.get('/kyc_document.jpg', getKycDocumentStub);
router.get('/:filename.png', getKycDocumentStub);
router.get('/:filename.jpg', getKycDocumentStub);
router.get('/:filename.jpeg', getKycDocumentStub);
router.get('/:filename.pdf', getGstCertificateStub);
router.put('/delivery-partners/dev-approve/:id', devApproveDeliveryPartner);

// Protected endpoints (requires valid JWT token in Authorization header)
router.get('/me', protect, getMe);
router.put('/update-details', protect, updateDetails);
router.put('/update-password', protect, updatePassword);
router.put('/change-role', protect, changeRole);

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

// Public diagnostic endpoint
router.get('/test-db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = require('../models/User');
    const dbName = mongoose.connection.name;
    const dbHost = mongoose.connection.host;
    const users = await User.find({}, '_id name email role status');
    res.json({
      success: true,
      dbName,
      dbHost,
      mongoUriConfigured: process.env.MONGO_URI ? process.env.MONGO_URI.replace(/:([^@]+)@/, ':****@') : 'NOT_SET',
      usersCount: users.length,
      users
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
  