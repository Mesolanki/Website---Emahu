const Order = require('../models/Order');
const User = require('../models/User');
const DeliverySetting = require('../models/DeliverySetting');
const { getHaversineDistance, resolveCharge } = require('./deliveryController');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Public (supports guest checkout)
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Calculate and verify delivery charges
    let distanceKm = 0;
    let deliveryCharge = 0;
    
    const settings = await DeliverySetting.findOne() || {
      maxDeliveryDistance: 100,
      expressDeliverySurcharge: 100,
      slabs: [
        { fromKm: 0, toKm: 5, charge: 30 },
        { fromKm: 5, toKm: 10, charge: 50 },
        { fromKm: 10, toKm: 20, charge: 80 },
        { fromKm: 20, toKm: 50, charge: 120 },
        { fromKm: 50, toKm: 100, charge: 200 },
        { fromKm: 100, toKm: 9999, charge: 300 }
      ]
    };

    // Calculate product amount from DB prices rather than relying on client input
    let productAmount = 0;
    if (orderData.items && orderData.items.length > 0) {
      const Product = require('../models/Product');
      for (const item of orderData.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          productAmount += product.price * (item.quantity || 1);
        } else {
          // Fallback if product not found in DB
          productAmount += (item.price || 0) * (item.quantity || 1);
        }
      }
    }

    // Resolve Seller Location
    let sLat = 23.0225; // Default Ahmedabad
    let sLon = 72.5714;
    let sAddress = 'Ahmedabad, Gujarat';
    let sName = 'Emahu Seller';
    
    if (orderData.sellerId) {
      const seller = await User.findById(orderData.sellerId);
      if (seller) {
        if (seller.latitude !== undefined && seller.latitude !== null) sLat = seller.latitude;
        if (seller.longitude !== undefined && seller.longitude !== null) sLon = seller.longitude;
        if (seller.address) sAddress = seller.address;
        if (seller.storeName || seller.name) sName = seller.storeName || seller.name;
      }
    }

    // Resolve Buyer Location
    let bLat = orderData.buyerLocation?.latitude;
    let bLon = orderData.buyerLocation?.longitude;
    let bAddr = orderData.buyerLocation?.address || orderData.deliveryAddress?.address || '';

    // If coordinates are missing, fallback to seller location to avoid crashes and give 0 distance
    if (bLat === undefined || bLat === null || bLon === undefined || bLon === null) {
      bLat = sLat;
      bLon = sLon;
    }

    // Compute distance and charge
    distanceKm = getHaversineDistance(bLat, bLon, sLat, sLon);
    
    // Validate Max Distance
    if (distanceKm > settings.maxDeliveryDistance) {
      return res.status(400).json({
        success: false,
        error: `Delivery distance (${distanceKm.toFixed(1)} KM) exceeds the maximum allowed distance of ${settings.maxDeliveryDistance} KM`
      });
    }

    const chargeResult = resolveCharge(distanceKm, productAmount, settings);
    if (chargeResult.error) {
      return res.status(400).json({
        success: false,
        error: chargeResult.error
      });
    }

    deliveryCharge = chargeResult.charge;

    // Save audited details
    orderData.sellerLocation = {
      shopName: sName,
      latitude: sLat,
      longitude: sLon,
      address: sAddress
    };
    orderData.buyerLocation = {
      latitude: bLat,
      longitude: bLon,
      address: bAddr
    };
    orderData.distanceKm = parseFloat(distanceKm.toFixed(2));
    orderData.deliveryCharge = deliveryCharge;
    orderData.productAmount = productAmount;
    
    // Add express surcharge if express delivery selected
    if (orderData.shippingSpeed === 'express') {
      deliveryCharge += settings.expressDeliverySurcharge || 100;
      orderData.deliveryCharge = deliveryCharge;
    }

    // Recalculate escrow grand total (subtotal + deliveryCharge + 18% GST of subtotal)
    const taxAmount = Math.round(productAmount * 0.18);
    orderData.total = productAmount + deliveryCharge + taxAmount;
    orderData.totalPaid = orderData.total;

    // Log payment response/order payload as required
    console.log('--- ORDER CREATION ATTEMPT (VERIFIED) ---');
    console.log('Payment Status:', orderData.paymentStatus || 'COMPLETED');
    console.log('Seller ID:', orderData.sellerId);
    console.log('User ID:', orderData.userId);
    console.log(`Verified Subtotal: ₹${productAmount}, Distance: ${distanceKm.toFixed(2)} KM, Delivery Charge: ₹${deliveryCharge}, Total: ₹${orderData.total}`);
    
    // Ensure database insert runs every time
    const order = await Order.create(orderData);
    
    // Decrease stock levels and update sales count
    if (order.items && order.items.length > 0) {
      const Product = require('../models/Product');
      for (const item of order.items) {
        try {
          const product = await Product.findById(item.productId);
          if (product) {
            product.stock = Math.max(0, product.stock - (item.quantity || 1));
            product.sales = (product.sales || 0) + (item.quantity || 1);
            await product.save();
            console.log(`Updated product ${item.productId}: Stock = ${product.stock}, Sales = ${product.sales}`);
          }
        } catch (err) {
          console.error(`Failed to update stock/sales for product ${item.productId}:`, err);
        }
      }
    }
    
    // Log purchase events for analytics
    if (order.items && order.items.length > 0) {
      const AnalyticsEvent = require('../models/AnalyticsEvent');
      for (const item of order.items) {
        try {
          await AnalyticsEvent.create({
            type: 'purchase',
            productId: item.productId,
            sellerId: order.sellerId || (item.seller?._id || item.seller?.id || item.seller || 'default_seller').toString(),
            userId: order.userId
          });
        } catch (e) {
          console.error('Failed to log purchase analytics event:', e);
        }
      }
    }
    
    console.log('DATABASE INSERT SUCCESSFUL:', order.orderId);
    console.log('------------------------------');

    res.status(201).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('ORDER CREATION FAILED', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order in database'
    });
  }
};

// @desc    Get all orders (optionally filter by sellerId)
// @route   GET /api/orders
// @access  Public
exports.getOrders = async (req, res) => {
  try {
    const { sellerId, userId, orderId, billId } = req.query;
    
    // Enforce that orders are fetched only for a specific seller, buyer, or specific order/bill ID
    if (!sellerId && !userId && !orderId && !billId) {
      return res.status(200).json({
        success: true,
        orders: []
      });
    }

    const filter = {};
    if (sellerId) {
      filter.sellerId = sellerId;
    }
    if (userId) {
      filter.userId = userId;
    }

    const targetId = orderId || billId;
    if (targetId) {
      filter.$or = [
        { orderId: { $regex: new RegExp(`^${targetId.trim()}$`, 'i') } },
        { billId: { $regex: new RegExp(`^${targetId.trim()}$`, 'i') } }
      ];
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while retrieving orders'
    });
  }
};

// @desc    Update an order (status, timeline, tracking, etc.)
// @route   PUT /api/orders/:id
// @access  Public
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const order = await Order.findOneAndUpdate(
      { orderId: id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: `Order with ID ${id} not found`
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Update Order Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating order'
    });
  }
};

// @desc    Get all orders for admin review
// @route   GET /api/orders/admin/all
// @access  Private (Admin only)
exports.getAdminOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get Admin Orders Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while retrieving orders for admin'
    });
  }
};
