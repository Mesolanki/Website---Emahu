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
const upload = require('../middleware/uploadMiddleware');

// Image Upload route (Protected - Seller only)
router.post('/upload', protect, authorize('seller'), upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an image file' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({
      success: true,
      url: fileUrl
    });
  } catch (error) {
    console.error('File Upload Route Error:', error);
    res.status(500).json({ success: false, error: 'Server error while uploading image' });
  }
});

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
