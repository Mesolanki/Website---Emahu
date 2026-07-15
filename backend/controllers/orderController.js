const Order = require('../models/Order');
const User = require('../models/User');
const DeliverySetting = require('../models/DeliverySetting');
const { getHaversineDistance, resolveCharge } = require('./deliveryController');

function detectCityAndState(address) {
  if (!address || typeof address !== 'string') return { city: '', state: '' };
  const lower = address.toLowerCase();

  const list = [
    { city: 'Ahmedabad', state: 'Gujarat', aliases: ['ahmedabad', 'amdavad', 'ghatlodiya', 'bopal', 'maninagar', 'navrangpura', 'vastrapur', 'satellite', 'bodakdev', 'prahlad nagar', 'chandkheda', 'motera', 'sabarmati', 'nikol', 'naranpura', 'gota', 'shela', 'thaltej', 'vastral', 'odhav', 'gandhinagar', 'sanand'] },
    { city: 'Surat', state: 'Gujarat', aliases: ['surat', 'adajan', 'vesu', 'katargam', 'varachha', 'althan', 'citylight', 'pal', 'piplod', 'dindoli', 'udhna', 'rander', 'bhestan'] },
    { city: 'Rajkot', state: 'Gujarat', aliases: ['rajkot', 'kalavad road', 'gondal road'] },
    { city: 'Vadodara', state: 'Gujarat', aliases: ['vadodara', 'baroda', 'alkapuri', 'manjalpur', 'waghodia'] },
    { city: 'Mumbai', state: 'Maharashtra', aliases: ['mumbai', 'bombay', 'bandra', 'andheri', 'dadar', 'thane', 'navi mumbai', 'kurla', 'mulund', 'worli', 'lower parel'] },
    { city: 'Pune', state: 'Maharashtra', aliases: ['pune', 'pimpri', 'chinchwad', 'kothrud', 'hadapsar', 'wakad', 'aundh', 'baner'] },
    { city: 'Nagpur', state: 'Maharashtra', aliases: ['nagpur'] },
    { city: 'Delhi', state: 'Delhi', aliases: ['delhi', 'new delhi', 'old delhi', 'dwarka', 'rohini', 'noida', 'gurugram', 'gurgaon', 'faridabad'] },
    { city: 'Bangalore', state: 'Karnataka', aliases: ['bangalore', 'bengaluru', 'koramangala', 'indiranagar', 'whitefield', 'marathahalli', 'jayanagar', 'electronic city'] },
    { city: 'Chennai', state: 'Tamil Nadu', aliases: ['chennai', 'madras', 'anna nagar', 'adyar', 'velachery', 't. nagar', 'porur'] },
    { city: 'Kolkata', state: 'West Bengal', aliases: ['kolkata', 'calcutta', 'salt lake', 'howrah', 'jadavpur', 'new town'] },
    { city: 'Hyderabad', state: 'Telangana', aliases: ['hyderabad', 'secunderabad', 'banjara hills', 'jubilee hills', 'gachibowli', 'hitech city', 'kondapur', 'madhapur'] },
    { city: 'Jaipur', state: 'Rajasthan', aliases: ['jaipur'] },
    { city: 'Lucknow', state: 'Uttar Pradesh', aliases: ['lucknow', 'gomti nagar'] },
    { city: 'Chandigarh', state: 'Punjab', aliases: ['chandigarh', 'mohali', 'panchkula'] }
  ];

  for (const item of list) {
    const terms = item.aliases || [item.city];
    for (const term of terms) {
      if (lower.includes(term.toLowerCase())) {
        return { city: item.city, state: item.state };
      }
    }
  }
  return { city: '', state: '' };
}

// @desc    Create a new order
// @route   POST /api/orders
// @access  Public (supports guest checkout)
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    // Auto-generate orderId and date if missing
    if (!orderData.orderId) {
      orderData.orderId = `EMH_${Math.floor(100000 + Math.random() * 900000)}`;
    }
    if (!orderData.date) {
      orderData.date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // Auto-detect city/state from buyer address
    const bAddr = orderData.buyerLocation?.address || orderData.deliveryAddress?.address || '';
    if (!orderData.deliveryAddress) {
      orderData.deliveryAddress = {};
    }
    if (
      !orderData.deliveryAddress.city ||
      !orderData.deliveryAddress.stateName ||
      orderData.deliveryAddress.city.toLowerCase().includes('profile')
    ) {
      const detected = detectCityAndState(bAddr);
      if (detected.city) {
        orderData.deliveryAddress.city = detected.city;
        orderData.deliveryAddress.stateName = detected.state;
      }
    }
    if (
      !orderData.deliveryAddress.pincode ||
      orderData.deliveryAddress.pincode.toLowerCase().includes('profile')
    ) {
      const match = bAddr.match(/\b\d{6}\b/);
      if (match) {
        orderData.deliveryAddress.pincode = match[0];
      } else {
        orderData.deliveryAddress.pincode = '380001';
      }
    }

    // Check if the buyer has any unconfirmed delivered orders (Removed per request)
    /*
    if (orderData.userId) {
      const hasUnconfirmedDelivered = await Order.findOne({
        userId: orderData.userId,
        status: 'DELIVERED'
      });
      if (hasUnconfirmedDelivered) {
        return res.status(400).json({
          success: false,
          error: `Checkout Blocked: You must confirm receipt/release of your delivered order #${hasUnconfirmedDelivered.orderId} before placing a new order.`
        });
      }
    }
    */

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
      const mongoose = require('mongoose');
      for (const item of orderData.items) {
        const qty = Math.max(1, Math.floor(Number(item.quantity || 1)));
        item.quantity = qty;
        if (mongoose.Types.ObjectId.isValid(item.productId)) {
          const product = await Product.findById(item.productId);
          if (product) {
            productAmount += product.price * qty;
            continue;
          }
        }
        // Fallback if product not found in DB or not a valid ObjectId
        productAmount += (item.price || 0) * qty;
      }
    }

    // Resolve Seller Location
    let sLat = 23.0225; // Default Ahmedabad
    let sLon = 72.5714;
    let sAddress = 'Ahmedabad, Gujarat';
    let sName = 'Emahu Seller';

    if (orderData.sellerId) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(orderData.sellerId)) {
        const seller = await User.findById(orderData.sellerId);
        if (seller) {
          if (seller.latitude !== undefined && seller.latitude !== null) sLat = seller.latitude;
          if (seller.longitude !== undefined && seller.longitude !== null) sLon = seller.longitude;
          if (seller.address) sAddress = seller.address;
          if (seller.storeName || seller.name) sName = seller.storeName || seller.name;
        }
      }
    }

    // Override or fill in missing coordinates if request body provides sellerLocation details
    if (orderData.sellerLocation) {
      if (orderData.sellerLocation.latitude !== undefined && orderData.sellerLocation.latitude !== null) {
        sLat = orderData.sellerLocation.latitude;
      }
      if (orderData.sellerLocation.longitude !== undefined && orderData.sellerLocation.longitude !== null) {
        sLon = orderData.sellerLocation.longitude;
      }
      if (orderData.sellerLocation.shopName) {
        sName = orderData.sellerLocation.shopName;
      }
      if (orderData.sellerLocation.address) {
        sAddress = orderData.sellerLocation.address;
      }
    }

    // Resolve Buyer Location
    let bLat = orderData.buyerLocation?.latitude;
    let bLon = orderData.buyerLocation?.longitude;

    // If coordinates are missing, fallback to seller location to avoid crashes and give 0 distance
    if (bLat === undefined || bLat === null || isNaN(bLat) || bLon === undefined || bLon === null || isNaN(bLon)) {
      bLat = sLat;
      bLon = sLon;
    }

    // Compute distance and charge
    if (orderData.distanceKm !== undefined && orderData.distanceKm !== null && orderData.distanceKm > 0) {
      distanceKm = orderData.distanceKm;
    } else {
      distanceKm = getHaversineDistance(bLat, bLon, sLat, sLon);
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

    // Recalculate Emahu grand total (subtotal + deliveryCharge + 18% GST of subtotal)
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

    const orders = await Order.find(filter).populate('deliveryPartnerId', 'name phone role category vehicleType vehicleNumber').sort({ createdAt: -1 });
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
    const updateData = { ...req.body };

    // Normalize empty strings that fail Mongoose schema casting/validation to null
    if (updateData.deliveryPartnerId === '') {
      updateData.deliveryPartnerId = null;
    }
    if (updateData.deliveredAt === '') {
      updateData.deliveredAt = null;
    }
    if (updateData.transactionDate === '') {
      updateData.transactionDate = null;
    }

    const order = await Order.findOneAndUpdate(
      { orderId: id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('deliveryPartnerId', 'name phone role category vehicleType vehicleNumber');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: `Order with ID ${id} not found`
      });
    }

    // Auto-assignment hook disabled (Seller chooses delivery partner manually)
    /*
    if (
      ['APPROVED', 'READY_FOR_PICKUP'].includes(order.status) &&
      (!order.deliveryPartnerId || order.deliveryStatus === 'unassigned')
    ) {
      const { autoAssignOrderInternal } = require('./deliveryController');
      await autoAssignOrderInternal(order);
    }
    */

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Update Order Error:', error);
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
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

// @desc    Buyer confirms delivery receipt when package is arrived
// @route   PUT /api/orders/:id/confirm-receipt
// @access  Private (Buyer only)
exports.buyerConfirmDelivery = async (req, res) => {
  try {
    const { id } = req.params; // orderId
    const order = await Order.findOne({ orderId: id });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.userId !== req.user.id && order.userId !== req.user._id?.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized to confirm receipt for this order' });
    }

    if (order.deliveryStatus !== 'arrived') {
      return res.status(400).json({ success: false, error: 'Courier has not marked this order as arrived yet' });
    }

    order.deliveryStatus = 'delivered';
    order.status = 'DELIVERED';
    order.deliveredAt = new Date();

    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    order.timeline.push({
      status: 'DELIVERED',
      label: 'Delivered',
      desc: 'Buyer confirmed package receipt on dashboard.',
      date: dateStr
    });
    await order.save();

    const DeliveryAssignment = require('../models/DeliveryAssignment');
    let assignment = await DeliveryAssignment.findOne({ orderId: id });
    if (assignment) {
      assignment.currentStatus = 'delivered';
      assignment.deliveredDate = new Date();
      await assignment.save();
    }

    const DeliveryTracking = require('../models/DeliveryTracking');
    await DeliveryTracking.create({
      assignmentId: assignment?._id,
      orderId: id,
      status: 'delivered',
      remarks: 'Delivery confirmed by buyer.'
    });

    // Notify Courier Partner
    if (order.deliveryPartnerId) {
      const Notification = require('../models/Notification');
      await Notification.create({
        recipient: order.deliveryPartnerId,
        recipientModel: 'User',
        title: 'Delivery Receipt Confirmed',
        message: `Buyer has confirmed receipt of order #${id}. Earnings updated.`,
        isRead: false
      });
    }

    // Trigger Socket Broadcast
    const io = req.app.get('socketio');
    if (io) {
      io.emit('delivery-status-changed', {
        orderId: id,
        status: 'DELIVERED',
        deliveryStatus: 'delivered'
      });
    }

    // Send emails in background
    const { notifyDeliveryCompleted } = require('./deliveryController');
    const partner = order.deliveryPartnerId ? await User.findById(order.deliveryPartnerId) : null;
    notifyDeliveryCompleted(order, partner);

    res.status(200).json({ success: true, message: 'Delivery receipt confirmed successfully', order });
  } catch (error) {
    console.error('Buyer Confirm Delivery Error:', error);
    res.status(500).json({ success: false, error: 'Server error confirming receipt: ' + error.message });
  }
};
