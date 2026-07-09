const express = require('express');
const router = express.Router();
const {
  getCategories,
  requestCategory,
  approveCategory,
  seedDefaultCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route to fetch category tree
router.get('/', getCategories);

// Public route to fetch detailed category info
router.get('/:id', getCategoryById);

// Seller request route (requires authentication)
router.post('/request', protect, requestCategory);

// Admin: seed default categories
router.post('/seed', protect, authorize('admin'), seedDefaultCategories);

// Admin approval route (requires admin role)
router.put('/approve/:id', protect, authorize('admin'), approveCategory);

// Admin Category CRUD routes (requires authentication & admin role)
router.post('/', protect, authorize('admin'), createCategory);
router.put('/:id', protect, authorize('admin'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
