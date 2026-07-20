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

    const {
      shortTitle, slug, bulletFeatures, highlights, packageContents, warrantyInfo,
      countryOfOrigin, manufacturer, modelNumber, barcode, mrp, tax, hsnCode,
      moq, maxOrderQty, stockStatus, warehouse, lowStockAlert, backorderAllowed,
      images360, thumbnail, weight, length, width, height, shippingCharges,
      freeShipping, deliveryTime, dynamicAttributes, seoTitle, metaDescription,
      metaKeywords, canonicalUrl, altText, variants
    } = req.body;

    const product = await Product.create({
      name,
      brand,
      sku: tempSku,
      category,
      subcategory: req.body.subcategory || 'General',
      price,
      comparePrice,
      stock,
      description,
      image,
      images: req.body.images || [],
      sizes: Array.isArray(req.body.sizes) ? req.body.sizes : [],
      colors: Array.isArray(req.body.colors) ? req.body.colors : [],
      seller: req.user.id,
      approvalStatus: 'approved',
      adminCode: undefined,
      approvalAttempts: 0,
      
      // Extended Form Parameters
      shortTitle: shortTitle || '',
      slug: slug || '',
      bulletFeatures: Array.isArray(bulletFeatures) ? bulletFeatures : [],
      highlights: highlights || '',
      packageContents: packageContents || '',
      warrantyInfo: warrantyInfo || '',
      countryOfOrigin: countryOfOrigin || '',
      manufacturer: manufacturer || '',
      modelNumber: modelNumber || '',
      barcode: barcode || '',
      mrp: mrp ? parseFloat(mrp) : comparePrice,
      tax: tax ? parseFloat(tax) : undefined,
      hsnCode: hsnCode || '',
      moq: moq ? parseInt(moq) : 1,
      maxOrderQty: maxOrderQty ? parseInt(maxOrderQty) : undefined,
      stockStatus: stockStatus || 'in-stock',
      warehouse: warehouse || '',
      lowStockAlert: lowStockAlert ? parseInt(lowStockAlert) : 10,
      backorderAllowed: !!backorderAllowed,
      images360: Array.isArray(images360) ? images360 : [],
      thumbnail: thumbnail || '',
      weight: weight ? parseFloat(weight) : undefined,
      length: length ? parseFloat(length) : undefined,
      width: width ? parseFloat(width) : undefined,
      height: height ? parseFloat(height) : undefined,
      shippingCharges: shippingCharges ? parseFloat(shippingCharges) : 0,
      freeShipping: !!freeShipping,
      deliveryTime: deliveryTime || '',
      dynamicAttributes: dynamicAttributes || {},
      seoTitle: seoTitle || '',
      metaDescription: metaDescription || '',
      metaKeywords: Array.isArray(metaKeywords) ? metaKeywords : [],
      canonicalUrl: canonicalUrl || '',
      variants: Array.isArray(variants) ? variants : [],
      specifications: req.body.specifications || {}
    });

    // Notify all admins in bulk
    const User = require('../models/User');
    const Notification = require('../models/Notification');
    const admins = await User.find({ role: 'admin' }).select('_id');
    if (admins.length > 0) {
      const notifications = admins.map(admin => ({
        recipient: admin._id,
        title: 'New Product Listed',
        message: `Product "${product.name}" has been listed by "${req.user.name}" and is approved.`,
        type: 'info'
      }));
      await Notification.insertMany(notifications);
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
    const filter = { approvalStatus: 'approved' };
    
    // Support category filter (case-insensitive exact match)
    if (req.query.category) {
      filter.category = new RegExp(`^${req.query.category}$`, 'i');
    }
    
    let query = Product.find(filter);
    
    // Support custom fields selection or default to optimized lightweight fields
    if (req.query.select) {
      query = query.select(req.query.select);
    } else {
      query = query.select('name brand category subcategory price comparePrice stock status image rating reviews seller approvalStatus isNew createdAt');
    }
    
    query = query.populate('seller', 'name email phone storeName latitude longitude address city state serviceAreaState serviceAreaCity coveredCities');
    
    // Support limit constraint
    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit) && limit > 0) {
        query = query.limit(limit);
      }
    }
    
    const products = await query.lean();
    
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
      product = await Product.findById(req.params.id).populate('seller', 'name email phone storeName status latitude longitude address city state serviceAreaState serviceAreaCity coveredCities');
    }
    
    if (!product) {
      product = await Product.findOne({ sku: req.params.id.toUpperCase() }).populate('seller', 'name email phone storeName status latitude longitude address city state serviceAreaState serviceAreaCity coveredCities');
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

    // Block deletion if there are active/pending delivery orders for this product
    const Order = require('../models/Order');
    const ACTIVE_STATUSES = [
      'PENDING_APPROVAL',
      'APPROVED',
      'READY_FOR_PICKUP',
      'DELIVERY_ASSIGNED',
      'LABEL_GENERATED',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY'
    ];

    const activeOrders = await Order.find({
      'items.productId': req.params.id,
      status: { $in: ACTIVE_STATUSES }
    }).select('orderId status');

    if (activeOrders.length > 0) {
      const orderIds = activeOrders.map(o => o.orderId).join(', ');
      return res.status(409).json({
        success: false,
        error: `Cannot delete this product — it has ${activeOrders.length} active order(s) pending delivery. Wait until all orders are delivered or completed before removing this listing.`,
        activeOrders: activeOrders.map(o => ({ orderId: o.orderId, status: o.status }))
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

    const {
      shortTitle, slug, bulletFeatures, highlights, packageContents, warrantyInfo,
      countryOfOrigin, manufacturer, modelNumber, barcode, mrp, tax, hsnCode,
      moq, maxOrderQty, stockStatus, warehouse, lowStockAlert, backorderAllowed,
      images360, thumbnail, weight, length, width, height, shippingCharges,
      freeShipping, deliveryTime, dynamicAttributes, seoTitle, metaDescription,
      metaKeywords, canonicalUrl, altText, variants
    } = req.body;

    // Update values
    product.name = name.trim();
    product.brand = brand.trim();
    product.sku = sku.trim().toUpperCase();
    product.category = category;
    product.subcategory = req.body.subcategory !== undefined ? req.body.subcategory : product.subcategory;
    product.price = parseFloat(price);
    product.comparePrice = parseFloat(comparePrice);
    product.stock = parseInt(stock);
    product.description = description.trim();
    product.image = image.trim();
    product.images = req.body.images || [];
    product.sizes = Array.isArray(req.body.sizes) ? req.body.sizes : product.sizes;
    product.colors = Array.isArray(req.body.colors) ? req.body.colors : product.colors;

    // Update Extended Form Parameters
    product.shortTitle = shortTitle !== undefined ? shortTitle : product.shortTitle;
    product.slug = slug !== undefined ? slug : product.slug;
    product.bulletFeatures = Array.isArray(bulletFeatures) ? bulletFeatures : product.bulletFeatures;
    product.highlights = highlights !== undefined ? highlights : product.highlights;
    product.packageContents = packageContents !== undefined ? packageContents : product.packageContents;
    product.warrantyInfo = warrantyInfo !== undefined ? warrantyInfo : product.warrantyInfo;
    product.countryOfOrigin = countryOfOrigin !== undefined ? countryOfOrigin : product.countryOfOrigin;
    product.manufacturer = manufacturer !== undefined ? manufacturer : product.manufacturer;
    product.modelNumber = modelNumber !== undefined ? modelNumber : product.modelNumber;
    product.barcode = barcode !== undefined ? barcode : product.barcode;
    product.mrp = mrp !== undefined ? parseFloat(mrp) : product.mrp;
    product.tax = tax !== undefined ? parseFloat(tax) : product.tax;
    product.hsnCode = hsnCode !== undefined ? hsnCode : product.hsnCode;
    product.moq = moq !== undefined ? parseInt(moq) : product.moq;
    product.maxOrderQty = maxOrderQty !== undefined ? parseInt(maxOrderQty) : product.maxOrderQty;
    product.stockStatus = stockStatus !== undefined ? stockStatus : product.stockStatus;
    product.warehouse = warehouse !== undefined ? warehouse : product.warehouse;
    product.lowStockAlert = lowStockAlert !== undefined ? parseInt(lowStockAlert) : product.lowStockAlert;
    product.backorderAllowed = backorderAllowed !== undefined ? !!backorderAllowed : product.backorderAllowed;
    product.images360 = Array.isArray(images360) ? images360 : product.images360;
    product.thumbnail = thumbnail !== undefined ? thumbnail : product.thumbnail;
    product.weight = weight !== undefined ? parseFloat(weight) : product.weight;
    product.length = length !== undefined ? parseFloat(length) : product.length;
    product.width = width !== undefined ? parseFloat(width) : product.width;
    product.height = height !== undefined ? parseFloat(height) : product.height;
    product.shippingCharges = shippingCharges !== undefined ? parseFloat(shippingCharges) : product.shippingCharges;
    product.freeShipping = freeShipping !== undefined ? !!freeShipping : product.freeShipping;
    product.deliveryTime = deliveryTime !== undefined ? deliveryTime : product.deliveryTime;
    product.dynamicAttributes = dynamicAttributes !== undefined ? dynamicAttributes : product.dynamicAttributes;
    product.seoTitle = seoTitle !== undefined ? seoTitle : product.seoTitle;
    product.metaDescription = metaDescription !== undefined ? metaDescription : product.metaDescription;
    product.metaKeywords = Array.isArray(metaKeywords) ? metaKeywords : product.metaKeywords;
    product.canonicalUrl = canonicalUrl !== undefined ? canonicalUrl : product.canonicalUrl;
    product.altText = altText !== undefined ? altText : product.altText;
    product.variants = Array.isArray(variants) ? variants : product.variants;
    product.specifications = req.body.specifications !== undefined ? req.body.specifications : product.specifications;

    // Reset verification to approved
    product.approvalStatus = 'approved';
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

      // Ensure each variant has its own unique SKU code
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        product.variants = product.variants.map((v, idx) => {
          if (!v.sku || !v.sku.trim()) {
            return { ...v, sku: `${finalSku}-VAR-${idx + 1}` };
          }
          return v;
        });
      }

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
    const products = await Product.find()
      .select('name brand category price stock sku approvalStatus adminCode rejectionReason approvalAttempts createdAt seller')
      .populate('seller', 'name email phone storeName status')
      .lean();
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
