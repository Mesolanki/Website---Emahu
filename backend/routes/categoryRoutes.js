const express = require('express');
const router = express.Router();
const {
  getCategories,
  requestCategory,
  approveCategory
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route to fetch category tree
router.get('/', getCategories);

// Seller request route (requires authentication)
router.post('/request', protect, requestCategory);

// Admin approval route (requires admin role)
router.put('/approve/:id', protect, authorize('admin'), approveCategory);

module.exports = router;
