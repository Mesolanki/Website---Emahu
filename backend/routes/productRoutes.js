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
    const hostHeader = req.get('host') || '';
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || hostHeader.includes('emahu.com');
    const protocol = isHttps ? 'https' : req.protocol;
    
    let publicBase = `${protocol}://${hostHeader}`;
    if (process.env.PUBLIC_APP_URL) {
      publicBase = process.env.PUBLIC_APP_URL;
    }
    const relativePath = `/uploads/${req.file.filename}`;
    const fullUrl = `${publicBase}${relativePath}`;

    res.status(200).json({
      success: true,
      url: relativePath,
      fullUrl: fullUrl,
      relativePath: relativePath
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
