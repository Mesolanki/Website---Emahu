const Product = require('../models/Product');

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (Seller only)
exports.createProduct = async (req, res) => {
  try {
    const { name, brand, category, price, comparePrice, stock, description, image } = req.body;

    // Validation
    if (
      !name || !name.trim() ||
      !brand || !brand.trim() ||
      !category || !category.trim() ||
      price === undefined || isNaN(parseFloat(price)) || parseFloat(price) <= 0 ||
      comparePrice === undefined || isNaN(parseFloat(comparePrice)) || parseFloat(comparePrice) <= 0 ||
      stock === undefined || isNaN(parseInt(stock)) || parseInt(stock) < 0 ||
      !description || !description.trim() ||
      !image || !image.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields'
      });
    }

    if (parseFloat(comparePrice) <= parseFloat(price)) {
      return res.status(400).json({
        success: false,
        error: 'Compare-at price must be greater than listing price'
      });
    }

    // Auto-generate temporary SKU (Seller doesn't generate official SKU)
    const tempSku = `EM-TEMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const product = await Product.create({
      name,
      brand,
      sku: tempSku,
      category,
      price,
      comparePrice,
      stock,
      description,
      image,
      images: req.body.images || [],
      seller: req.user.id,
      approvalStatus: 'pending',
      adminCode: undefined,
      approvalAttempts: 0
    });

    // Notify all admins
    const User = require('../models/User');
    const Notification = require('../models/Notification');
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        title: 'New Product Pending Review',
        message: `Product "${product.name}" has been listed by "${req.user.name}" and is pending review.`,
        type: 'info'
      });
    }

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Create Product Error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages[0]
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error while creating product'
    });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ approvalStatus: 'approved' }).populate('seller', 'name email phone storeName latitude longitude address city');
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while retrieving products'
    });
  }
};

// @desc    Get seller's own products
// @route   GET /api/products/my
// @access  Private (Seller only)
exports.getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id });
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get Seller Products Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while retrieving seller products'
    });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let product;

    // Check if the id is a valid ObjectId, otherwise query by SKU code
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      product = await Product.findById(req.params.id).populate('seller', 'name email phone storeName status latitude longitude address city');
    }
    
    if (!product) {
      product = await Product.findOne({ sku: req.params.id.toUpperCase() }).populate('seller', 'name email phone storeName status latitude longitude address city');
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Restrict visibility for pending products without an admin code, or rejected products
    if (
      (product.approvalStatus === 'pending' && !product.adminCode) ||
      product.approvalStatus === 'rejected'
    ) {
      let isAuthorized = false;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer')) {
        try {
          const token = authHeader.split(' ')[1];
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded.role === 'admin' || decoded.id === product.seller._id.toString() || decoded.id === product.seller.id) {
            isAuthorized = true;
          }
        } catch (e) {}
      }

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'This product listing is not active or is pending administrator verification and cannot be viewed publicly'
        });
      }
    }

    // Calculate rating and reviews dynamically from reviews database
    const Review = require('../models/Review');
    const dbReviews = await Review.find({ product: product._id });
    const reviewsCount = dbReviews.length;
    const avgRating = reviewsCount > 0 
      ? parseFloat((dbReviews.reduce((sum, item) => sum + item.rating, 0) / reviewsCount).toFixed(1))
      : 4.7; // Default placeholder rating

    const productObj = product.toObject ? product.toObject() : product;
    productObj.id = productObj._id;
    productObj.rating = avgRating;
    productObj.reviews = reviewsCount > 0 ? reviewsCount : 84; // Default reviews count fallback

    res.status(200).json({
      success: true,
      product: productObj
    });
  } catch (error) {
    console.error('Get Product By ID/SKU Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while retrieving product detail'
    });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Seller only, owner only)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check ownership
    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to delete this product listing'
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product listing removed successfully'
    });
  } catch (error) {
    console.error('Delete Product Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting product'
    });
  }
};

// @desc    Verify product activation code
// @route   PUT /api/products/:id/verify
// @access  Private (Seller only)
exports.verifyProduct = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Please enter verification code' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Owner check
    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to verify this product' });
    }

    if (product.approvalStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'Product is not pending activation' });
    }

    if (product.adminCode !== code.trim().toUpperCase()) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    product.approvalStatus = 'approved';
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product listed live successfully',
      product
    });
  } catch (error) {
    console.error('Verify Product Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Resubmit product after edit/fix
// @route   PUT /api/products/:id/resubmit
// @access  Private (Seller only)
exports.resubmitProduct = async (req, res) => {
  try {
    const { name, brand, sku, category, price, comparePrice, stock, description, image } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Owner check
    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this product' });
    }

    const finalSku = (sku || product.sku || '').trim();

    // Validation
    if (
      !name || !name.trim() ||
      !brand || !brand.trim() ||
      !finalSku ||
      !category || !category.trim() ||
      price === undefined || isNaN(parseFloat(price)) || parseFloat(price) <= 0 ||
      comparePrice === undefined || isNaN(parseFloat(comparePrice)) || parseFloat(comparePrice) <= 0 ||
      stock === undefined || isNaN(parseInt(stock)) || parseInt(stock) < 0 ||
      !description || !description.trim() ||
      !image || !image.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields'
      });
    }

    if (parseFloat(comparePrice) <= parseFloat(price)) {
      return res.status(400).json({
        success: false,
        error: 'Compare-at price must be greater than listing price'
      });
    }

    // Update values
    product.name = name.trim();
    product.brand = brand.trim();
    product.sku = sku.trim().toUpperCase();
    product.category = category;
    product.price = parseFloat(price);
    product.comparePrice = parseFloat(comparePrice);
    product.stock = parseInt(stock);
    product.description = description.trim();
    product.image = image.trim();
    product.images = req.body.images || [];

    // Reset verification to false / pending admin approval
    product.approvalStatus = 'pending';
    product.rejectionReason = undefined;
    product.adminCode = undefined;

    await product.save();

    res.status(200).json({
      success: true,
      message: `Product updated successfully.`,
      product
    });
  } catch (error) {
    console.error('Update Product Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Admin approve or reject product listing request (Simulated Endpoint)
// @route   PUT /api/products/:id/admin-decision
// @access  Public
// @desc    Admin approve or reject product listing request
// @route   PUT /api/products/:id/admin-decision
// @access  Private (Admin only)
exports.adminDecision = async (req, res) => {
  try {
    const { decision, reason, sku } = req.body; // 'approve', 'reject', 'request_changes'
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const Notification = require('../models/Notification');
    const AuditLog = require('../models/AuditLog');
    const ProductApprovalHistory = require('../models/ProductApprovalHistory');

    if (decision === 'approve') {
      let finalSku = sku;
      if (!finalSku || !finalSku.trim()) {
        // Auto-generate a unique professional SKU code
        let isUnique = false;
        while (!isUnique) {
          const categoryPrefix = (product.category || 'GEN').substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
          const brandPrefix = (product.brand || 'GEN').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
          const randomStamp = Math.random().toString(36).substring(2, 6).toUpperCase();
          finalSku = `EM-${categoryPrefix || 'GEN'}-${brandPrefix || 'GEN'}-${randomStamp}`;
          
          const exists = await Product.findOne({ sku: finalSku });
          if (!exists) {
            isUnique = true;
          }
        }
      } else {
        finalSku = finalSku.toUpperCase().trim();
        const skuExists = await Product.findOne({ sku: finalSku, _id: { $ne: product._id } });
        if (skuExists) {
          return res.status(400).json({ success: false, error: `SKU '${finalSku}' is already assigned to another product.` });
        }
      }

      product.sku = finalSku;
      product.approvalStatus = 'pending'; // Activation pending by seller code
      if (!product.adminCode) {
        product.adminCode = `APP-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      product.rejectionReason = undefined;
      await product.save();

      // Log decision history
      await ProductApprovalHistory.create({
        product: product._id,
        admin: req.user._id,
        action: 'approve',
        feedback: `Approved with SKU: ${finalSku}`
      });

      // Log admin audit
      await AuditLog.create({
        admin: req.user._id,
        action: 'APPROVE_PRODUCT',
        targetType: 'Product',
        targetId: product._id,
        details: { sku: finalSku }
      });

      // Notify seller
      await Notification.create({
        recipient: product.seller,
        title: 'Product Approved & SKU Assigned',
        message: `Your product "${product.name}" has been approved! Official SKU assigned: "${finalSku}". Enter activation code "${product.adminCode}" in your dashboard to publish it.`,
        type: 'success'
      });

      res.status(200).json({
        success: true,
        message: `Admin decision 'approve' saved successfully. SKU assigned: ${finalSku}`,
        product
      });
    } else if (decision === 'reject') {
      const attempts = (product.approvalAttempts || 0) + 1;
      
      // Log decision history
      await ProductApprovalHistory.create({
        product: product._id,
        admin: req.user._id,
        action: 'reject',
        feedback: reason || 'Rejected'
      });

      // Log admin audit
      await AuditLog.create({
        admin: req.user._id,
        action: 'REJECT_PRODUCT',
        targetType: 'Product',
        targetId: product._id,
        details: { attempts, reason }
      });

      if (attempts >= 3) {
        await product.deleteOne();
        
        // Notify seller of permanent deletion
        await Notification.create({
          recipient: product.seller,
          title: 'Product Deleted Permanently',
          message: `Your product "${product.name}" has been rejected 3 times and permanently removed from the system.`,
          type: 'danger'
        });

        res.status(200).json({
          success: true,
          message: 'Product rejected 3 times and permanently removed from database',
          productDeleted: true,
          product: { _id: req.params.id, approvalStatus: 'deleted' }
        });
      } else {
        product.approvalAttempts = attempts;
        product.approvalStatus = 'rejected';
        product.rejectionReason = reason || 'Product description or images do not match our standard listing terms.';
        await product.save();

        // Notify seller of rejection
        await Notification.create({
          recipient: product.seller,
          title: 'Product Listing Rejected',
          message: `Your product listing "${product.name}" has been rejected. Reason: ${product.rejectionReason}. Attempts: ${attempts}/3`,
          type: 'warning'
        });

        res.status(200).json({
          success: true,
          message: `Admin decision 'reject' saved successfully`,
          product
        });
      }
    } else if (decision === 'request_changes') {
      product.approvalStatus = 'changes_requested';
      product.rejectionReason = reason || 'Changes requested to title, description, or pricing.';
      await product.save();

      // Log history
      await ProductApprovalHistory.create({
        product: product._id,
        admin: req.user._id,
        action: 'request_changes',
        feedback: reason
      });

      // Log admin audit
      await AuditLog.create({
        admin: req.user._id,
        action: 'REQUEST_CHANGES_PRODUCT',
        targetType: 'Product',
        targetId: product._id,
        details: { reason }
      });

      // Notify seller
      await Notification.create({
        recipient: product.seller,
        title: 'Changes Requested for Product',
        message: `Changes requested for your product listing "${product.name}". Reason: ${product.rejectionReason}. Please edit and resubmit.`,
        type: 'warning'
      });

      res.status(200).json({
        success: true,
        message: `Admin decision 'request_changes' saved successfully`,
        product
      });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid decision type. Use approve, reject, or request_changes' });
    }
  } catch (error) {
    console.error('Admin Decision Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all products for admin review
// @route   GET /api/products/admin/all
// @access  Private (Admin only)
exports.getAdminProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('seller', 'name email phone storeName status');
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get Admin Products Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while retrieving products for admin'
    });
  }
};
