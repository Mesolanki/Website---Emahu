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

const path = require('path');
const fs = require('fs');

// Image Upload route (Protected - Seller or Admin)
router.post('/upload', protect, authorize('seller', 'admin'), upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an image file' });
    }

    let fileUrl = '';
    const uploadsDir = path.join(__dirname, '../uploads');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(req.file.originalname || '.jpg').toLowerCase() || '.jpg';
    const filename = `image-${uniqueSuffix}${ext}`;

    if (req.file.buffer) {
      try {
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, req.file.buffer);
      } catch (err) {
        // Ignore disk write errors in serverless/read-only environments
      }

      const mime = req.file.mimetype || 'image/jpeg';
      fileUrl = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
    }

    res.status(200).json({
      success: true,
      url: fileUrl,
      fullUrl: fileUrl,
      relativePath: `/uploads/${filename}`
    });
  } catch (error) {
    console.error('File Upload Route Error:', error);
    res.status(500).json({ success: false, error: 'Server error while uploading image' });
  }
});

// Base routes
router.route('/')
  .get(getProducts)
  .post(protect, authorize('seller', 'admin'), createProduct);

// Specific routes (Must be defined BEFORE /:id to prevent matching as id parameter)
router.route('/my')
  .get(protect, authorize('seller', 'admin'), getMyProducts);

router.route('/admin/all')
  .get(protect, authorize('admin'), getAdminProducts);

router.route('/:id/verify')
  .put(protect, authorize('seller', 'admin'), verifyProduct);

router.route('/:id/resubmit')
  .put(protect, authorize('seller', 'admin'), resubmitProduct);

router.route('/:id/admin-decision')
  .put(protect, authorize('admin'), adminDecision);

router.route('/:id')
  .get(getProductById)
  .delete(protect, authorize('seller'), deleteProduct);

module.exports = router;
