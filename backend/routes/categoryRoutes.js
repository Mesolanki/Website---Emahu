const express = require('express');
const router = express.Router();
const {
  getCategories,
  requestCategory,
  approveCategory,
  seedDefaultCategories
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route to fetch category tree
router.get('/', getCategories);

// Seller request route (requires authentication)
router.post('/request', protect, requestCategory);

// Admin: seed default categories (use from Postman/dashboard on Vercel instead of local seed script)
router.post('/seed', protect, authorize('admin'), seedDefaultCategories);

// Admin approval route (requires admin role)
router.put('/approve/:id', protect, authorize('admin'), approveCategory);

module.exports = router;
