const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Create a new product review
// @route   POST /api/reviews
// @access  Private (Buyer only)
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId || !rating || !comment || !comment.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide all review details' });
    }

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check if buyer has purchased this product
    const userIdStr = String(req.user.id || req.user._id);
    const hasOrdered = await Order.findOne({
      userId: userIdStr,
      'items.productId': String(productId)
    });

    const review = await Review.create({
      product: productId,
      user: req.user.id || req.user._id,
      name: req.user.name || 'Anonymous',
      rating: ratingNum,
      comment: comment.trim(),
      verifiedPurchase: !!hasOrdered
    });

    res.status(201).json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Create Review Error:', error);
    res.status(500).json({ success: false, error: 'Server error while creating review' });
  }
};

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ product: productId })
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Get Product Reviews Error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving product reviews' });
  }
};

// @desc    Get reviews for a seller's products
// @route   GET /api/reviews/seller
// @access  Private (Seller only)
exports.getSellerReviews = async (req, res) => {
  try {
    const sellerId = req.user.id || req.user._id;

    // Get all products owned by this seller
    const products = await Product.find({ seller: sellerId });
    const productIds = products.map((p) => p._id);

    const reviews = await Review.find({ product: { $in: productIds } })
      .sort({ createdAt: -1 })
      .populate('product', 'name sku image price')
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Get Seller Reviews Error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving seller reviews' });
  }
};

// @desc    Get all reviews
// @route   GET /api/reviews/admin
// @access  Private (Admin only)
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .populate('product', 'name sku image price seller')
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Get Admin Reviews Error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving all reviews' });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Admin, Seller, or Owner)
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate('product');
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const userIdStr = String(req.user.id || req.user._id);
    const userRole = req.user.role;

    const isReviewOwner = String(review.user) === userIdStr;
    const isProductSeller = review.product && String(review.product.seller) === userIdStr;
    const isAdmin = userRole === 'admin';

    if (!isReviewOwner && !isProductSeller && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this review' });
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete Review Error:', error);
    res.status(500).json({ success: false, error: 'Server error deleting review' });
  }
};
