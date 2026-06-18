const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  getSellerReviews,
  getAllReviews,
  deleteReview
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route to get reviews for a product
router.get('/product/:productId', getProductReviews);

// Protected route to create review (Buyer role required)
router.post('/', protect, authorize('buyer'), createReview);

// Protected route for sellers to get their reviews
router.get('/seller', protect, authorize('seller'), getSellerReviews);

// Protected route for admins to get all reviews
router.get('/admin', protect, authorize('admin'), getAllReviews);

// Protected delete route (authorized reviewer, seller, or admin)
router.delete('/:id', protect, deleteReview);

module.exports = router;
