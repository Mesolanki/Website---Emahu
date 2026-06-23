 const Coupon = require('../models/Coupon');

// @desc    Validate a coupon code
// @route   GET /api/coupons/validate
// @access  Public
exports.validateCoupon = async (req, res) => {
  try {
    const { code, cartValue } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a coupon code'
      });
    }

    const valueOfCart = parseFloat(cartValue) || 0;

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Invalid coupon code'
      });
    }

    if (!coupon.active) {
      return res.status(400).json({
        success: false,
        error: 'This coupon is no longer active'
      });
    }

    if (new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({
        success: false,
        error: 'This coupon has expired'
      });
    }

    if (valueOfCart < coupon.minCartValue) {
      return res.status(400).json({
        success: false,
        error: `Minimum cart value required for this coupon is ₹${coupon.minCartValue}`
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'flat') {
      discountAmount = coupon.value;
    } else if (coupon.discountType === 'percentage') {
      discountAmount = valueOfCart * (coupon.value / 100);
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    }

    // Ensure discount doesn't exceed cart value
    if (discountAmount > valueOfCart) {
      discountAmount = valueOfCart;
    }

    res.status(200).json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value,
        minCartValue: coupon.minCartValue,
        maxDiscount: coupon.maxDiscount,
        discountAmount: Math.round(discountAmount)
      }
    });
  } catch (error) {
    console.error('Validate Coupon Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error validating coupon code'
    });
  }
};

// @desc    Create a new coupon code
// @route   POST /api/coupons
// @access  Private (Admin only)
exports.createCoupon = async (req, res) => {
  try {
    const { code, discountType, value, minCartValue, maxDiscount, expiryDate } = req.body;

    if (!code || !discountType || value === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide code, discountType, value, and expiryDate'
      });
    }

    // Check if code already exists
    const codeExists = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (codeExists) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code already exists'
      });
    }

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      discountType,
      value,
      minCartValue: minCartValue || 0,
      maxDiscount,
      expiryDate
    });

    res.status(201).json({
      success: true,
      coupon
    });
  } catch (error) {
    console.error('Create Coupon Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error creating coupon code'
    });
  }
};
