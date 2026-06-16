const express = require('express');
const router = express.Router();
const {
  createProduct,
  getProducts,
  getMyProducts,
  getProductById,
  deleteProduct,
  verifyProduct,
  resubmitProduct,
  adminDecision,
  getAdminProducts
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Base routes
router.route('/')
  .get(getProducts)
  .post(protect, authorize('seller'), createProduct);

// Specific routes (Must be defined BEFORE /:id to prevent matching as id parameter)
router.route('/my')
  .get(protect, authorize('seller'), getMyProducts);

router.route('/admin/all')
  .get(protect, authorize('admin'), getAdminProducts);

router.route('/:id/verify')
  .put(protect, authorize('seller'), verifyProduct);

router.route('/:id/resubmit')
  .put(protect, authorize('seller'), resubmitProduct);

router.route('/:id/admin-decision')
  .put(protect, authorize('admin'), adminDecision);

router.route('/:id')
  .get(getProductById)
  .delete(protect, authorize('seller'), deleteProduct);

module.exports = router;
