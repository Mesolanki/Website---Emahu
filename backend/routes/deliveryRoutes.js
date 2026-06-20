const express = require('express');
const router = express.Router();
const {
  getDeliverySettings,
  updateDeliverySettings,
  calculateDeliveryCharge,
  assignOrderToPartner,
  updateAssignmentStatus,
  getPartnerOrders,
  getDeliveryAnalytics,
  createDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
  getDeliveryPartners,
  getAvailablePartnersForOrder,
  updatePartnerProfile
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Settings (Public & Admin/Seller)
router.get('/settings', getDeliverySettings);
router.put('/settings', protect, authorize('admin', 'seller'), updateDeliverySettings);

// Calculate Delivery charge (Public)
router.post('/calculate', calculateDeliveryCharge);

// Order Assignments (Admin & Delivery Partner & Seller)
router.post('/assign', protect, authorize('admin', 'seller'), assignOrderToPartner);
router.put('/status', protect, authorize('delivery'), updateAssignmentStatus);
router.put('/profile', protect, authorize('delivery'), updatePartnerProfile);
router.get('/my-orders', protect, authorize('delivery'), getPartnerOrders);
router.get('/available-partners/:orderId', protect, authorize('admin', 'seller'), getAvailablePartnersForOrder);

// Delivery Analytics (Admin only)
router.get('/analytics', protect, authorize('admin'), getDeliveryAnalytics);

// Partner CRUD Management (Admin only)
router.get('/partners', protect, authorize('admin', 'seller'), getDeliveryPartners);
router.post('/partners', protect, authorize('admin'), createDeliveryPartner);
router.put('/partners/:id', protect, authorize('admin'), updateDeliveryPartner);
router.delete('/partners/:id', protect, authorize('admin'), deleteDeliveryPartner);

module.exports = router;
