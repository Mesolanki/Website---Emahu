const mongoose = require('mongoose');
const DeliverySetting = require('../models/DeliverySetting');
const Product = require('../models/Product');
const User = require('../models/User');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const DeliveryTracking = require('../models/DeliveryTracking');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');

// Haversine formula to compute distance in KM
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

async function generateAndSaveDeliveryOtp(order) {
  try {
    const Otp = require('../models/Otp');
    const email = order.deliveryAddress?.email;
    if (email) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
      await Otp.findOneAndUpdate(
        { email, otp: otpCode },
        { otp: otpCode, expiresAt, attempts: 0, lastSentAt: new Date(Date.now() - 70 * 1000), isVerified: false },
        { upsert: true, new: true }
      );
      order.deliveryOtp = otpCode;
      order.deliveryOtpExpiry = expiresAt;
      order.deliveryOtpAttempts = 0;
      console.log(`[OTP Generation] Generated OTP ${otpCode} for order ${order.orderId}`);
    } else {
      console.warn(`[OTP Generation] Buyer email not found for order ${order.orderId}, cannot generate OTP.`);
    }
  } catch (err) {
    console.error('[OTP Generation] Error in generateAndSaveDeliveryOtp:', err);
  }
}

function detectCityAndState(address) {
  if (!address || typeof address !== 'string') return { city: '', state: '' };
  const lower = address.toLowerCase();
  
  const list = [
    // Gujarat cities and common neighborhoods
    { city: 'Ahmedabad', state: 'Gujarat', aliases: ['ahmedabad', 'amdavad', 'ghatlodiya', 'bopal', 'maninagar', 'navrangpura', 'vastrapur', 'satellite', 'bodakdev', 'prahlad nagar', 'sg highway', 'sindhu bhavan', 'chandkheda', 'motera', 'sabarmati', 'nikol', 'naranpura', 'gota', 'shela', 'thaltej', 'vastral', 'odhav'] },
    { city: 'Surat', state: 'Gujarat', aliases: ['surat', 'adajan', 'vesu', 'katargam', 'varachha', 'althan', 'citylight', 'pal', 'piplod', 'dindoli', 'udhna', 'rander', 'bhestan'] },
    { city: 'Rajkot', state: 'Gujarat', aliases: ['rajkot', 'kalavad road', 'gondal road', 'university road rajkot'] },
    { city: 'Vadodara', state: 'Gujarat', aliases: ['vadodara', 'baroda', 'alkapuri', 'manjalpur', 'waghodia', 'akota'] },
    // Maharashtra
    { city: 'Mumbai', state: 'Maharashtra', aliases: ['mumbai', 'bombay', 'bandra', 'andheri', 'dadar', 'thane', 'navi mumbai', 'kurla', 'mulund', 'worli', 'lower parel'] },
    { city: 'Pune', state: 'Maharashtra', aliases: ['pune', 'pimpri', 'chinchwad', 'kothrud', 'hadapsar', 'wakad', 'aundh', 'baner', 'kondhwa'] },
    { city: 'Nagpur', state: 'Maharashtra', aliases: ['nagpur', 'dharampeth', 'sitabuldi', 'sadar'] },
    // Delhi NCR
    { city: 'Delhi', state: 'Delhi', aliases: ['delhi', 'new delhi', 'old delhi', 'dwarka', 'rohini', 'noida', 'gurugram', 'gurgaon', 'faridabad'] },
    // Karnataka
    { city: 'Bangalore', state: 'Karnataka', aliases: ['bangalore', 'bengaluru', 'koramangala', 'indiranagar', 'whitefield', 'marathahalli', 'jayanagar', 'electronic city'] },
    // Tamil Nadu
    { city: 'Chennai', state: 'Tamil Nadu', aliases: ['chennai', 'madras', 'anna nagar', 'adyar', 'velachery', 't. nagar', 'porur'] },
    // West Bengal
    { city: 'Kolkata', state: 'West Bengal', aliases: ['kolkata', 'calcutta', 'salt lake', 'howrah', 'jadavpur', 'new town'] },
    // Telangana
    { city: 'Hyderabad', state: 'Telangana', aliases: ['hyderabad', 'secunderabad', 'banjara hills', 'jubilee hills', 'gachibowli', 'hitech city', 'kondapur', 'madhapur'] },
    // Other major cities
    { city: 'Jaipur', state: 'Rajasthan', aliases: ['jaipur', 'malviya nagar jaipur', 'vaishali nagar'] },
    { city: 'Lucknow', state: 'Uttar Pradesh', aliases: ['lucknow', 'gomti nagar', 'hazratganj'] },
    { city: 'Chandigarh', state: 'Punjab', aliases: ['chandigarh', 'mohali', 'panchkula'] },
    { city: 'Ahmedabad', state: 'Gujarat', aliases: ['gandhinagar', 'sanand'] }  // satellite cities
  ];
  
  for (const item of list) {
    const searchTerms = item.aliases || [item.city];
    for (const term of searchTerms) {
      if (lower.includes(term.toLowerCase())) {
        return { city: item.city, state: item.state };
      }
    }
  }
  return { city: '', state: '' };
}

// Google Maps Distance Matrix API call with Haversine fallback
async function getGoogleMapsDistance(originLat, originLon, destLat, destLon) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return null;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLon}&destinations=${destLat},${destLon}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
      const el = data.rows[0].elements[0];
      if (el.status === 'OK') {
        const distanceKm = el.distance.value / 1000; // Value is in meters
        const durationSec = el.duration.value;
        return { distanceKm, durationSec };
      }
    }
  } catch (err) {
    console.warn('Google Maps Distance Matrix call failed, falling back to Haversine:', err);
  }
  return null;
}

// @desc    Get delivery settings (slabs, threshold)
// @route   GET /api/delivery/settings
// @access  Public
exports.getDeliverySettings = async (req, res) => {
  try {
    let settings = await DeliverySetting.findOne();
    if (!settings) {
      // Create defaults
      settings = await DeliverySetting.create({
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
      });
    }
    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get Delivery Settings Error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving delivery settings' });
  }
};

// @desc    Update delivery settings (slabs, thresholds)
// @route   PUT /api/delivery/settings
// @access  Private (Admin only)
exports.updateDeliverySettings = async (req, res) => {
  try {
    const { maxDeliveryDistance, expressDeliverySurcharge, slabs } = req.body;
    
    let settings = await DeliverySetting.findOne();
    if (!settings) {
      settings = new DeliverySetting();
    }
    
    if (maxDeliveryDistance !== undefined) settings.maxDeliveryDistance = maxDeliveryDistance;

    if (expressDeliverySurcharge !== undefined) settings.expressDeliverySurcharge = expressDeliverySurcharge;
    if (slabs !== undefined) settings.slabs = slabs;
    
    await settings.save();
    
    // Log admin action
    const AuditLog = require('../models/AuditLog');
    try {
      await AuditLog.create({
        admin: req.user._id,
        action: 'UPDATE_DELIVERY_SETTINGS',
        targetType: 'DeliverySetting',
        targetId: settings._id,
        details: { maxDeliveryDistance, slabsCount: slabs?.length }
      });
    } catch (logErr) {
      console.error('Failed to log update delivery settings to AuditLog:', logErr);
    }
    
    res.status(200).json({
      success: true,
      message: 'Delivery settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update Delivery Settings Error:', error);
    res.status(500).json({ success: false, error: 'Server error updating delivery settings: ' + error.message });
  }
};

// Helper function to resolve delivery charge based on settings and distance/amount
function resolveCharge(distance, productTotal, settings) {
  const maxDist = settings?.maxDeliveryDistance || 100;
  if (distance > maxDist) {
    return { error: `Distance (${distance.toFixed(1)} KM) exceeds maximum allowed delivery distance (${maxDist} KM)` };
  }
  const charge = parseFloat((distance * 2).toFixed(2));
  return { charge, free: false };
}

exports.resolveCharge = resolveCharge;
exports.getHaversineDistance = getHaversineDistance;

// @desc    Calculate distance and delivery charge
// @route   POST /api/delivery/calculate
// @access  Public
exports.calculateDeliveryCharge = async (req, res) => {
  try {
    const { buyerLat, buyerLon, cartItems } = req.body;
    
    if (buyerLat === undefined || buyerLon === undefined || !cartItems || !cartItems.length) {
      return res.status(400).json({
        success: false,
        error: 'Please provide buyerLat, buyerLon, and cartItems list'
      });
    }
    
    // Get settings
    let settings = await DeliverySetting.findOne();
    if (!settings) {
      settings = await DeliverySetting.create({
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
      });
    }
    
    const results = [];
    let overallError = null;
    
    // Process items. Group them by seller for distance-based delivery charge
    const sellerGroups = {};
    
    for (const item of cartItems) {
      const prodId = item.productId || item.id;
      const product = await Product.findById(prodId).populate('seller');
      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Product with ID ${prodId} not found`
        });
      }
      
      const seller = product.seller;
      if (!seller) {
        return res.status(400).json({
          success: false,
          error: `Product "${product.name}" does not have an assigned seller`
        });
      }
      
      const sId = seller._id.toString();
      if (!sellerGroups[sId]) {
        sellerGroups[sId] = {
          sellerId: sId,
          sellerName: seller.storeName || seller.name || 'Emahu Seller',
          sellerLat: seller.latitude,
          sellerLon: seller.longitude,
          sellerAddress: seller.address || seller.city || 'Fulfillment Center',
          subtotal: 0,
          items: []
        };
      }
      
      const qty = item.quantity || 1;
      sellerGroups[sId].subtotal += product.price * qty;
      sellerGroups[sId].items.push({
        productId: prodId,
        name: product.name,
        price: product.price,
        quantity: qty
      });
    }
    
    let maxDistance = 0;
    let maxDistanceSellerId = null;
    const sellerDistances = {};
    
    for (const sId in sellerGroups) {
      const group = sellerGroups[sId];
      
      // Default fallback if seller has no coordinates: Ahmedabad (23.0225, 72.5714)
      const sLat = group.sellerLat !== undefined ? group.sellerLat : 23.0225;
      const sLon = group.sellerLon !== undefined ? group.sellerLon : 72.5714;
      
      const googleDist = await getGoogleMapsDistance(sLat, sLon, buyerLat, buyerLon);
      const distance = googleDist ? googleDist.distanceKm : getHaversineDistance(buyerLat, buyerLon, sLat, sLon);
      sellerDistances[sId] = distance;
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    }
    
    const overallChargeResult = resolveCharge(maxDistance, 0, settings);
    if (overallChargeResult.error) {
      return res.status(400).json({
        success: false,
        error: overallChargeResult.error
      });
    }
    
    const totalDeliveryCharge = overallChargeResult.charge;
    
    // Identify the furthest seller to assign the charge in the breakdown list
    for (const sId in sellerGroups) {
      if (sellerDistances[sId] === maxDistance && maxDistanceSellerId === null) {
        maxDistanceSellerId = sId;
      }
    }
    
    for (const sId in sellerGroups) {
      const group = sellerGroups[sId];
      const distance = sellerDistances[sId];
      const isFurthestSeller = (sId === maxDistanceSellerId);
      const appliedCharge = isFurthestSeller ? totalDeliveryCharge : 0;
      
      results.push({
        sellerId: sId,
        sellerName: group.sellerName,
        distanceKm: parseFloat(distance.toFixed(2)),
        deliveryCharge: appliedCharge,

        subtotal: group.subtotal,
        items: group.items
      });
    }
    
    res.status(200).json({
      success: true,
      buyerLocation: { latitude: buyerLat, longitude: buyerLon },
      maxDistanceKm: parseFloat(maxDistance.toFixed(2)),
      totalDeliveryCharge,

      maxDeliveryDistance: settings.maxDeliveryDistance,
      expressDeliverySurcharge: settings.expressDeliverySurcharge,
      breakdown: results
    });
  } catch (error) {
    console.error('Calculate Delivery Charge Error:', error);
    res.status(500).json({ success: false, error: 'Server error during delivery calculations: ' + error.message });
  }
};

// @desc    Assign order to delivery partner
// @route   POST /api/delivery/assign
// @access  Private (Admin only)
exports.assignOrderToPartner = async (req, res) => {
  try {
    const { orderId, deliveryPartnerId } = req.body;
    
    if (!orderId || !deliveryPartnerId) {
      return res.status(400).json({ success: false, error: 'Please provide orderId and deliveryPartnerId' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const isManualCarrier = !mongoose.Types.ObjectId.isValid(deliveryPartnerId);

    if (isManualCarrier) {
      // Manual/3rd party carrier assignment (Delhivery, Blue Dart, EmahuXpress, FedEx, etc.)
      const manualPhone = deliveryPartnerId === 'Blue Dart' ? '+91 1860 233 1234' : (deliveryPartnerId === 'Delhivery' ? '+91 80698 56101' : '+91 99999 99999');
      order.carrier = deliveryPartnerId;
      order.carrierPhone = manualPhone;
      order.deliveryStatus = 'accepted';
      order.status = 'LABEL_GENERATED';

      // Default tracking details if not set
      if (!order.trackingId) {
        order.trackingId = `EMH-TRK-${Math.floor(100000 + Math.random() * 900000)}`;
        order.shipmentId = `EMH-SHIP-${Math.floor(100000 + Math.random() * 900000)}`;
        order.packageWeight = '1.2 kg';
        order.deliveryCost = deliveryPartnerId === 'Blue Dart' ? 120 : (deliveryPartnerId === 'Delhivery' ? 80 : 75);
        order.estDays = deliveryPartnerId === 'Blue Dart' ? '1-3 Days' : (deliveryPartnerId === 'Delhivery' ? '2-4 Days' : '2-5 Days');
      }

      const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      order.timeline.push({
        status: 'LABEL_GENERATED',
        label: 'Delivery Accepted',
        desc: `Order assigned to courier partner: ${deliveryPartnerId}`,
        date: dateStr
      });

      await order.save();

      // Notify Buyer
      await Notification.create({
        recipient: order.userId,
        recipientModel: 'User',
        title: 'Delivery Partner Assigned',
        message: `Your order #${orderId} has been assigned to ${deliveryPartnerId}.`,
        isRead: false
      });

      // Broadcast Real-time event
      const io = req.app.get('socketio');
      if (io) {
        io.emit('delivery-status-changed', {
          orderId,
          status: 'LABEL_GENERATED',
          deliveryStatus: 'accepted',
          partner: { name: deliveryPartnerId, phone: manualPhone }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Delivery partner assigned successfully',
        order,
        assignment: null
      });
    }

    const partner = await User.findOne({ _id: deliveryPartnerId, role: 'delivery' });
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Delivery partner not found' });
    }

    // Calculate cost based on per KM rate of ₹2/KM
    const perKmRate = 2;
    const totalCost = parseFloat(((order.distanceKm || 5) * perKmRate).toFixed(2));

    // Update Order
    order.deliveryPartnerId = deliveryPartnerId;
    order.carrier = partner.name;
    order.carrierPhone = partner.phone;
    order.deliveryStatus = 'assigned';
    order.status = 'DELIVERY_ASSIGNED';
    order.deliveryCost = totalCost;
    order.deliveryCharge = totalCost;
    
    // Generate and save secure OTP immediately on assignment
    await generateAndSaveDeliveryOtp(order);
    
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    order.timeline.push({
      status: 'DELIVERY_ASSIGNED',
      label: 'Delivery Assigned',
      desc: `Order assigned to courier partner: ${partner.name}. Waiting for partner acceptance.`,
      date: dateStr
    });
    
    await order.save();

    // Create or update DeliveryAssignment
    let assignment = await DeliveryAssignment.findOne({ orderId });
    if (!assignment) {
      assignment = new DeliveryAssignment({
        orderId,
        sellerId: order.sellerId,
        buyerId: order.userId,
        deliveryPartnerId,
        distance: order.distanceKm || 5,
        deliveryCharge: totalCost,
        currentStatus: 'assigned'
      });
    } else {
      assignment.deliveryPartnerId = deliveryPartnerId;
      assignment.deliveryCharge = totalCost;
      assignment.currentStatus = 'assigned';
    }
    await assignment.save();

    // Create DeliveryTracking
    await DeliveryTracking.create({
      assignmentId: assignment._id,
      orderId,
      status: 'assigned',
      remarks: `Assigned to partner ${partner.name}. Waiting for acceptance.`
    });

    // Create Notification for Delivery Partner
    await Notification.create({
      recipient: deliveryPartnerId,
      recipientModel: 'User',
      title: 'New Delivery Assigned',
      message: `You have been assigned order #${orderId}. Click to view details.`,
      isRead: false
    });

    // Notify Buyer
    await Notification.create({
      recipient: order.userId,
      recipientModel: 'User',
      title: 'Delivery Partner Assigned',
      message: `Your order #${orderId} has been assigned to ${partner.name}.`,
      isRead: false
    });

    // Broadcast Real-time event
    const io = req.app.get('socketio');
    if (io) {
      io.emit('delivery-status-changed', {
        orderId,
        status: 'DELIVERY_ASSIGNED',
        deliveryStatus: 'assigned',
        partner: { name: partner.name, phone: partner.phone }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery partner assigned successfully',
      order,
      assignment
    });
  } catch (error) {
    console.error('Assign Order Error:', error);
    res.status(500).json({ success: false, error: 'Server error during assignment: ' + error.message });
  }
};

// @desc    Update assignment status (accept/reject/progress)
// @route   PUT /api/delivery/status
// @access  Private (Delivery Partner only)
exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { orderId, status, remarks, location } = req.body;
    const partnerId = req.user._id;

    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: 'Please provide orderId and status' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    let assignment = await DeliveryAssignment.findOne({ orderId, deliveryPartnerId: partnerId });
    const partner = req.user;

    // Handle self-assignment if no assignment exists yet (gig economy style)
    if (!assignment) {
      if (status === 'accepted') {
        if (order.deliveryStatus !== 'unassigned' || !['APPROVED', 'READY_FOR_PICKUP'].includes(order.status)) {
          return res.status(400).json({ success: false, error: 'Order is no longer available for delivery assignment' });
        }

        // Create assignment
        assignment = new DeliveryAssignment({
          orderId,
          sellerId: order.sellerId,
          buyerId: order.userId,
          deliveryPartnerId: partnerId,
          distance: order.distanceKm || 0,
          deliveryCharge: order.deliveryCharge || 0,
          currentStatus: 'accepted'
        });

        order.deliveryPartnerId = partnerId;
        order.deliveryStatus = 'accepted';
        order.status = 'LABEL_GENERATED';
        
        // Generate and save secure OTP immediately on self-assignment
        await generateAndSaveDeliveryOtp(order);
      } else if (status === 'rejected') {
        // Create a rejected assignment record so this partner doesn't see it again
        assignment = new DeliveryAssignment({
          orderId,
          sellerId: order.sellerId,
          buyerId: order.userId,
          deliveryPartnerId: partnerId,
          distance: order.distanceKm || 0,
          deliveryCharge: order.deliveryCharge || 0,
          currentStatus: 'rejected'
        });
        // Do NOT change the order's delivery status or partner ID so others can still see it!
      } else {
        return res.status(400).json({ success: false, error: 'Cannot update status on an unassigned order before accepting it' });
      }
    } else {
      // Update assignment and order status
      assignment.currentStatus = status;
      order.deliveryStatus = status;
    }

    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let timelineLabel = '';
    let timelineDesc = '';

    if (status === 'accepted') {
      order.status = 'LABEL_GENERATED';
      timelineLabel = 'Courier Accepted';
      timelineDesc = `Courier partner ${partner.name} accepted the assignment.`;
    } else if (status === 'rejected') {
      // Only reset order state if this partner was actually the one assigned (not self-rejecting an open unassigned order)
      if (order.deliveryPartnerId && order.deliveryPartnerId.toString() === partnerId.toString()) {
        order.status = 'READY_FOR_PICKUP';
        order.deliveryStatus = 'unassigned';
        order.deliveryPartnerId = undefined;
        order.carrier = undefined;
        order.carrierPhone = undefined;
        order.deliveryCost = undefined;
        order.deliveryCharge = undefined;
      }
      assignment.currentStatus = 'rejected';
      timelineLabel = 'Courier Rejected';
      timelineDesc = `Courier partner ${partner.name} declined the assignment.`;
    } else if (status === 'picked_up') {
      order.status = 'PICKED_UP';
      timelineLabel = 'Picked Up';
      timelineDesc = 'Package has been picked up from the merchant warehouse.';
    } else if (status === 'in_transit') {
      order.status = 'IN_TRANSIT';
      timelineLabel = 'In Transit';
      timelineDesc = 'Package is in transit with the courier partner.';
    } else if (status === 'out_for_delivery') {
      order.status = 'OUT_FOR_DELIVERY';
      timelineLabel = 'Out For Delivery';
      timelineDesc = 'Courier partner is out for delivery with your package.';
    } else if (status === 'arrived') {
      order.status = 'ARRIVED';
      timelineLabel = 'Arrived';
      timelineDesc = 'Courier partner has arrived at the delivery destination.';
    } else if (status === 'delivered') {
      order.status = 'DELIVERED';
      order.deliveredAt = new Date();
      assignment.deliveredDate = new Date();
      timelineLabel = 'Delivered';
      timelineDesc = 'Package delivered successfully to the recipient.';
    }

    if (status !== 'rejected') {
      order.timeline.push({
        status: order.status,
        label: timelineLabel,
        desc: timelineDesc,
        date: dateStr
      });
      await order.save();
      await assignment.save();

      // Trigger Delivery Confirmation Email if status is delivered
      if (status === 'delivered') {
        // Send email to buyer and seller in the background
        const sendDeliveryEmails = async () => {
          try {
            const buyerEmail = order.deliveryAddress?.email;
            const buyerName = order.deliveryAddress?.fullName || 'Valued Customer';
            const sellerEmail = order.sellerEmail;
            
            // Build items HTML list for the buyer's email
            let itemsHtml = '';
            if (order.items && order.items.length) {
              order.items.forEach(item => {
                itemsHtml += `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px 16px; color: #0f172a; font-weight: 600;">
                      ${item.name}
                      ${item.brand ? `<span style="display: block; font-size: 0.75rem; color: #64748b; font-weight: 400;">Brand: ${item.brand}</span>` : ''}
                    </td>
                    <td style="padding: 12px 16px; text-align: center; color: #334155;">${item.quantity}</td>
                    <td style="padding: 12px 16px; text-align: right; color: #0f172a; font-weight: 600;">₹${item.price.toFixed(2)}</td>
                  </tr>
                `;
              });
            }

            const formattedDate = new Date().toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              dateStyle: 'medium',
              timeStyle: 'short'
            });

            const fullAddress = order.deliveryAddress?.address 
              ? `${order.deliveryAddress.address}, ${order.deliveryAddress.city || ''} - ${order.deliveryAddress.pincode || ''}`
              : 'N/A';

            // 1. Send Email to Buyer
            if (buyerEmail) {
              const buyerHtml = `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 32px; text-align: center; color: #ffffff;">
                    <div style="font-size: 24px; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px;">EMAHU</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 1.8rem; font-weight: 700;">📦 Order Delivered!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 0.95rem;">Order #${order.orderId}</p>
                  </div>
                  <div style="padding: 36px 32px; background: #ffffff;">
                    <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 24px 0;">Dear ${buyerName},</p>
                    <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 28px 0;">Great news! Your order has been successfully delivered by our courier partner.</p>

                    <!-- Shipping Address & Details -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 1rem; font-weight: 700;">Delivery Details</h3>
                      <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <tr>
                          <td style="padding: 4px 0; color: #64748b; width: 35%;">Delivery Address:</td>
                          <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${fullAddress}</td>
                        </tr>
                        <tr>
                          <td style="padding: 4px 0; color: #64748b;">Courier Partner:</td>
                          <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${order.carrier || partner.name}</td>
                        </tr>
                        ${order.trackingId ? `
                        <tr>
                          <td style="padding: 4px 0; color: #64748b;">Tracking ID:</td>
                          <td style="padding: 4px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${order.trackingId}</td>
                        </tr>` : ''}
                        <tr>
                          <td style="padding: 4px 0; color: #64748b;">Delivered On:</td>
                          <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${formattedDate}</td>
                        </tr>
                      </table>
                    </div>

                    <!-- Items delivered table -->
                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
                      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                        <thead>
                          <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 12px 16px; color: #475569; font-weight: 700;">Item</th>
                            <th style="padding: 12px 16px; text-align: center; color: #475569; font-weight: 700;">Qty</th>
                            <th style="padding: 12px 16px; text-align: right; color: #475569; font-weight: 700;">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsHtml}
                        </tbody>
                      </table>
                    </div>

                    <!-- Price breakdown -->
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 28px;">
                      <table style="width: 50%; font-size: 0.9rem; text-align: right;">
                        <tr>
                          <td style="padding: 6px 0; color: #64748b;">Subtotal:</td>
                          <td style="padding: 6px 0 6px 16px; color: #0f172a; font-weight: 600;">₹${(order.productAmount || (order.total - (order.deliveryCharge || 0))).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #64748b;">Delivery Fee:</td>
                          <td style="padding: 6px 0 6px 16px; color: #0f172a; font-weight: 600;">₹${(order.deliveryCharge || 0).toFixed(2)}</td>
                        </tr>
                        ${order.discountAmount > 0 ? `
                        <tr>
                          <td style="padding: 6px 0; color: #ef4444;">Discount:</td>
                          <td style="padding: 6px 0 6px 16px; color: #ef4444; font-weight: 600;">− ₹${order.discountAmount.toFixed(2)}</td>
                        </tr>` : ''}
                        <tr style="border-top: 2px solid #e2e8f0;">
                          <td style="padding: 10px 0 0 0; color: #0f172a; font-weight: 700; font-size: 1rem;">Total Paid:</td>
                          <td style="padding: 10px 0 0 16px; color: #10b981; font-weight: 800; font-size: 1.1rem;">₹${order.total.toFixed(2)}</td>
                        </tr>
                      </table>
                    </div>

                    <p style="color: #64748b; font-size: 0.88rem; line-height: 1.6; margin: 0;">If you have any issues with this delivery or the items received, please raise a dispute in your dashboard or contact our support team immediately.</p>
                  </div>
                  <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 0.8rem;">
                    <p style="margin: 0 0 4px 0;">Thank you for shopping on <strong style="color: #10b981;">Emahu Marketplace</strong></p>
                  </div>
                </div>
              `;

              await sendEmail({
                to: buyerEmail,
                subject: `📦 Delivered: Your Order #${order.orderId} | Emahu Marketplace`,
                text: `Dear ${buyerName},\n\nYour order #${order.orderId} has been successfully delivered!\n\nDelivery Address: ${fullAddress}\nCourier: ${order.carrier || partner.name}\nDelivered On: ${formattedDate}\n\nThank you for shopping with Emahu!\n\nRegards,\nThe Emahu Team`,
                html: buyerHtml
              });
            }

            // 2. Send Email to Seller
            if (sellerEmail) {
              const sellerHtml = `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 40px 32px; text-align: center; color: #ffffff;">
                    <div style="font-size: 24px; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px;">EMAHU</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 1.8rem; font-weight: 700;">📦 Order Delivered</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 0.95rem;">Order #${order.orderId}</p>
                  </div>
                  <div style="padding: 36px 32px; background: #ffffff;">
                    <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 24px 0;">Dear Seller,</p>
                    <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 28px 0;">We are pleased to inform you that Order #${order.orderId} has been successfully delivered to the customer.</p>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 1rem; font-weight: 700;">Details</h3>
                      <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <tr>
                          <td style="padding: 4px 0; color: #64748b; width: 35%;">Order ID:</td>
                          <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">#${order.orderId}</td>
                        </tr>
                        <tr>
                          <td style="padding: 4px 0; color: #64748b;">Recipient:</td>
                          <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${buyerName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 4px 0; color: #64748b;">Delivered On:</td>
                          <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${formattedDate}</td>
                        </tr>
                      </table>
                    </div>

                    <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 28px 0;">The customer has received their package. Your payout is now eligible for release. Please log in to your merchant dashboard to request payment release.</p>
                  </div>
                  <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 0.8rem;">
                    <p style="margin: 0;">Emahu Marketplace Seller Center</p>
                  </div>
                </div>
              `;

              await sendEmail({
                to: sellerEmail,
                subject: `📦 Order #${order.orderId} Delivered – Payment Ready for Release | Emahu Marketplace`,
                text: `Dear Seller,\n\nOrder #${order.orderId} has been successfully delivered to ${buyerName} on ${formattedDate}.\n\nYour payout is now ready for release. Please log in to your merchant dashboard to request payment release.\n\nRegards,\nThe Emahu Team`,
                html: sellerHtml
              });
            }
          } catch (emailErr) {
            console.error('Error sending delivery confirmation emails:', emailErr);
          }
        };

        sendDeliveryEmails();
      }
    } else {
      await order.save();
      // Keep assignment as rejected so it remains in DB and won't show up again
      await assignment.save();
    }

    // Log tracking
    await DeliveryTracking.create({
      assignmentId: assignment._id,
      orderId,
      status,
      location,
      remarks: remarks || timelineDesc
    });

    // Notify Buyer
    await Notification.create({
      recipient: order.userId,
      recipientModel: 'User',
      title: `Delivery Update: ${timelineLabel}`,
      message: `Your order #${orderId} delivery status: ${timelineDesc}`,
      isRead: false
    });

    // Notify Seller
    await Notification.create({
      recipient: order.sellerId,
      recipientModel: 'User',
      title: `Delivery Update: ${timelineLabel}`,
      message: `Order #${orderId} status updated: ${timelineDesc}`,
      isRead: false
    });

    // Broadcast Real-time event
    const io = req.app.get('socketio');
    if (io) {
      io.emit('delivery-status-changed', {
        orderId,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        partner: { name: partner.name, phone: partner.phone }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      order,
      assignment
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ success: false, error: 'Server error during status update: ' + error.message });
  }
};

// @desc    Get delivery partner assigned orders and available approved orders in their location
// @route   GET /api/delivery/my-orders
// @access  Private (Delivery Partner only)
exports.getPartnerOrders = async (req, res) => {
  try {
    const partnerId = req.user._id;
    const partner = await User.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }

    const assignments = await DeliveryAssignment.find({ deliveryPartnerId: partnerId }).lean();
    const assignmentMap = {};
    assignments.forEach(a => {
      assignmentMap[a.orderId] = a.currentStatus;
    });

    // Get assigned orders
    const assignedOrderIds = assignments.map(a => a.orderId);
    const assignedOrders = await Order.find({ orderId: { $in: assignedOrderIds } }).lean();

    const orders = [];
    
    // Add assigned/interacted orders (excluding purely rejected ones to keep dashboard clean)
    for (const o of assignedOrders) {
      const status = assignmentMap[o.orderId];
      if (status !== 'rejected') {
        // Find seller user to get phone number
        const sellerUser = await User.findById(o.sellerId);
        orders.push({
          ...o,
          assignmentStatus: status,
          assignedDate: o.createdAt,
          sellerPhone: sellerUser ? sellerUser.phone : '',
          sellerName: sellerUser ? (sellerUser.storeName || sellerUser.name) : ''
        });
      }
    }

    // Sort descending by order ID
    orders.sort((a, b) => String(b.orderId).localeCompare(String(a.orderId)));

    // Load available orders (unassigned in partner's city)
    const partnerCity = (partner.currentCity || partner.city || '').trim().toLowerCase();
    const pCities = (partner.coveredCities && partner.coveredCities.length > 0)
      ? partner.coveredCities.map(c => c.trim().toLowerCase())
      : [partnerCity];

    const unassignedOrders = await Order.find({
      deliveryStatus: 'unassigned',
      status: { $in: ['APPROVED', 'READY_FOR_PICKUP'] }
    }).lean();

    const availableOrders = [];
    for (const o of unassignedOrders) {
      const oCity = (o.deliveryAddress?.city || '').trim().toLowerCase();
      if (pCities.includes(oCity)) {
        const sellerUser = await User.findById(o.sellerId);
        availableOrders.push({
          ...o,
          assignmentStatus: 'unassigned',
          assignedDate: o.createdAt,
          sellerPhone: sellerUser ? sellerUser.phone : '',
          sellerName: sellerUser ? (sellerUser.storeName || sellerUser.name) : ''
        });
      }
    }
    availableOrders.sort((a, b) => String(b.orderId).localeCompare(String(a.orderId)));

    res.status(200).json({
      success: true,
      orders,
      availableOrders
    });
  } catch (error) {
    console.error('Get Partner Orders Error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving orders' });
  }
};

// @desc    Get delivery dashboard analytics
// @route   GET /api/delivery/analytics
// @access  Private (Admin only)
exports.getDeliveryAnalytics = async (req, res) => {
  try {
    const totalDeliveries = await DeliveryAssignment.countDocuments();
    const activePartners = await User.countDocuments({ role: 'delivery', status: 'approved', isActivePartner: true });
    const completedDeliveries = await DeliveryAssignment.countDocuments({ currentStatus: 'delivered' });
    const pendingDeliveries = await DeliveryAssignment.countDocuments({ currentStatus: { $ne: 'delivered' } });
    
    const revenueResult = await DeliveryAssignment.aggregate([
      { $match: { currentStatus: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$deliveryCharge' } } }
    ]);
    const totalDeliveryRevenue = revenueResult[0]?.total || 0;

    const distanceResult = await DeliveryAssignment.aggregate([
      { $group: { _id: null, avgDistance: { $sum: '$distance' } } }
    ]);
    const avgDeliveryDistance = totalDeliveries > 0 ? (distanceResult[0]?.avgDistance || 0) / totalDeliveries : 0;

    const deliverySuccessRate = totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 100;

    res.status(200).json({
      success: true,
      analytics: {
        totalDeliveries,
        activeDeliveryPartners: activePartners,
        completedDeliveries,
        pendingDeliveries,
        totalDeliveryRevenue,
        averageDeliveryDistance: parseFloat(avgDeliveryDistance.toFixed(2)),
        deliverySuccessRate: parseFloat(deliverySuccessRate.toFixed(1))
      }
    });
  } catch (error) {
    console.error('Get Delivery Analytics Error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving analytics' });
  }
};

// @desc    Admin CRUD: Get all delivery partners
// @route   GET /api/delivery/partners
// @access  Private (Admin or Seller only)
exports.getDeliveryPartners = async (req, res) => {
  try {
    const partners = await User.find({ role: 'delivery' }).select('-password');
    res.status(200).json({
      success: true,
      partners
    });
  } catch (error) {
    console.error('Get Partners Error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving partners' });
  }
};

// @desc    Get eligible delivery partners for a specific order based on location filters and service radius
// @route   GET /api/delivery/available-partners/:orderId
// @access  Private (Admin or Seller only)
exports.getAvailablePartnersForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });

    let orderCity = '';
    let buyerLat, buyerLon, distance = 5;

    if (order) {
      // Try deliveryAddress.city first, but validate it's a real city (not a single letter or garbled value)
      const rawCity = (order.deliveryAddress?.city || '').trim();
      const knownCity = rawCity.length >= 3 ? detectCityAndState(rawCity).city : '';
      orderCity = (knownCity || rawCity.length >= 3 ? rawCity : '').toLowerCase();

      // If orderCity is still empty or invalid, detect from full address strings
      if (!orderCity || orderCity.length < 3) {
        const buyerAddr = order.buyerLocation?.address || order.deliveryAddress?.address || '';
        const detected = detectCityAndState(buyerAddr);
        if (detected.city) orderCity = detected.city.trim().toLowerCase();
      }

      buyerLat = order.buyerLocation?.latitude;
      buyerLon = order.buyerLocation?.longitude;

      if (order.distanceKm) {
        distance = order.distanceKm;
      } else {
        const sLat = order.sellerLocation?.latitude || 23.0225;
        const sLon = order.sellerLocation?.longitude || 72.5714;
        const bLat = buyerLat || 23.0225;
        const bLon = buyerLon || 72.5714;
        const googleDist = await getGoogleMapsDistance(sLat, sLon, bLat, bLon);
        distance = googleDist ? googleDist.distanceKm : getHaversineDistance(sLat, sLon, bLat, bLon);
        order.distanceKm = parseFloat(distance.toFixed(2));
        await order.save();
      }
    }

    // Fetch all active delivery partners (isActivePartner true or unset — not explicitly false)
    const partners = await User.find({ role: 'delivery', isActivePartner: { $ne: false } });

    let sellerCity = '';
    if (order && order.sellerId) {
      const sellerUser = await User.findById(order.sellerId);
      if (sellerUser) {
        sellerCity = (sellerUser.currentCity || sellerUser.city || '').trim().toLowerCase();
      }
    }
    if (!sellerCity && order && order.sellerLocation?.address) {
      const detected = detectCityAndState(order.sellerLocation.address);
      sellerCity = (detected.city || '').trim().toLowerCase();
    }

    const isSameCityOrder = sellerCity && orderCity && sellerCity === orderCity;

    const availablePartners = [];
    for (const partner of partners) {
      const pCities = (partner.coveredCities && partner.coveredCities.length > 0)
        ? partner.coveredCities.map(c => c.trim().toLowerCase())
        : [(partner.currentCity || partner.city || '').trim().toLowerCase()].filter(Boolean);

      const coversBuyer = orderCity ? pCities.includes(orderCity) : false;
      const coversSeller = sellerCity ? pCities.includes(sellerCity) : false;

      // City-based exclusion: skip partners who don't cover buyer's city
      if (orderCity && !coversBuyer) continue;
      // For cross-city orders also require seller-city coverage
      if (!isSameCityOrder && sellerCity && orderCity && !coversSeller) continue;

      const isCityMatch = coversBuyer || coversSeller;

      let isRadiusMatch = true;
      let distToBuyer = 0;
      if (buyerLat !== undefined && buyerLon !== undefined && partner.latitude !== undefined && partner.longitude !== undefined) {
        distToBuyer = getHaversineDistance(partner.latitude, partner.longitude, buyerLat, buyerLon);
        isRadiusMatch = distToBuyer <= (partner.serviceRadius || 15);
      }

      const perKmRate = 2;
      const totalCost = parseFloat((distance * perKmRate).toFixed(2));

      availablePartners.push({
        _id: partner._id,
        name: partner.name,
        phone: partner.phone,
        email: partner.email,
        vehicleType: partner.vehicleType,
        vehicleNumber: partner.vehicleNumber,
        currentCity: partner.currentCity || partner.city,
        currentArea: partner.currentArea || partner.address,
        pincode: partner.pincode,
        serviceRadius: partner.serviceRadius || 15,
        ratePerKm: perKmRate,
        perKmRate: perKmRate,
        rateUpTo2Km: perKmRate,
        rateAbove2Km: perKmRate,
        coveredCities: partner.coveredCities || [],
        latitude: partner.latitude,
        longitude: partner.longitude,
        totalCost,
        isCityMatch,
        isRadiusMatch,
        distanceToBuyer: parseFloat(distToBuyer.toFixed(2)),
        deliveryScope: partner.deliveryScope || 'local',
        profilePhoto: partner.profilePhoto,
        operatingLocation: partner.operatingLocation,
        serviceAreaState: partner.serviceAreaState,
        serviceAreaDistrict: partner.serviceAreaDistrict,
        serviceAreaCity: partner.serviceAreaCity,
        isActivePartner: partner.isActivePartner !== false,
        status: partner.status
      });
    }

    availablePartners.sort((a, b) => {
      const scoreA = (a.isCityMatch ? 2 : 0) + (a.isRadiusMatch ? 1 : 0);
      const scoreB = (b.isCityMatch ? 2 : 0) + (b.isRadiusMatch ? 1 : 0);
      return scoreB - scoreA || a.distanceToBuyer - b.distanceToBuyer;
    });

    res.status(200).json({
      success: true,
      distanceKm: parseFloat(distance.toFixed(2)),
      orderCity,
      sellerCity,
      totalPartners: availablePartners.length,
      availablePartners
    });
  } catch (error) {
    console.error('Get Available Partners Error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving available partners: ' + error.message });
  }
};

// @desc    Admin CRUD: Add delivery partner
// @route   POST /api/delivery/partners
// @access  Private (Admin only)
exports.createDeliveryPartner = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      operatingLocation, 
      vehicleType, 
      vehicleNumber,
      currentCity,
      currentArea,
      pincode,
      serviceRadius,
      perItemCharge,
      rateUpTo2Km,
      rateAbove2Km,
      latitude,
      longitude,
      salaryRequirement,
      serviceAreaCountry,
      serviceAreaRegion,
      serviceAreaDistrict,
      serviceAreaState,
      serviceAreaCity,
      address,
      perKmRate,
      coveredCities,
      deliveryScope
    } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    const resolvedRate = perKmRate !== undefined ? Number(perKmRate) : (perItemCharge ? Number(perItemCharge) : 0);

    // Auto-detect currentCity on partner creation if blank
    let resolvedCurrentCity = currentCity;
    if (!resolvedCurrentCity) {
      const detected = detectCityAndState(address || operatingLocation || '');
      if (detected.city) {
        resolvedCurrentCity = detected.city;
      }
    }

    const partner = await User.create({
      name,
      email,
      password,
      role: 'delivery',
      phone,
      operatingLocation,
      vehicleType,
      vehicleNumber,
      status: 'approved',
      isActivePartner: true,
      currentCity: resolvedCurrentCity,
      currentArea,
      pincode,
      serviceRadius: serviceRadius ? Number(serviceRadius) : 15,
      perItemCharge: resolvedRate,
      rateUpTo2Km: resolvedRate,
      rateAbove2Km: resolvedRate,
      perKmRate: resolvedRate,
      coveredCities: coveredCities || [],
      deliveryScope: deliveryScope || 'local',
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      salaryRequirement,
      serviceAreaCountry,
      serviceAreaRegion,
      serviceAreaDistrict,
      serviceAreaState,
      serviceAreaCity,
      address
    });

    res.status(201).json({
      success: true,
      message: 'Delivery partner created successfully',
      partner
    });
  } catch (error) {
    console.error('Create Partner Error:', error);
    res.status(500).json({ success: false, error: 'Server error creating partner: ' + error.message });
  }
};

// @desc    Admin CRUD: Edit delivery partner
// @route   PUT /api/delivery/partners/:id
// @access  Private (Admin only)
exports.updateDeliveryPartner = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      operatingLocation, 
      vehicleType, 
      vehicleNumber, 
      isActivePartner, 
      status,
      currentCity,
      currentArea,
      pincode,
      serviceRadius,
      perItemCharge,
      rateUpTo2Km,
      rateAbove2Km,
      latitude,
      longitude,
      salaryRequirement,
      serviceAreaCountry,
      serviceAreaRegion,
      serviceAreaDistrict,
      serviceAreaState,
      serviceAreaCity,
      address,
      perKmRate,
      coveredCities,
      deliveryScope
    } = req.body;
    
    const partner = await User.findById(req.params.id);
    if (!partner || partner.role !== 'delivery') {
      return res.status(404).json({ success: false, error: 'Delivery partner not found' });
    }

    if (name !== undefined) partner.name = name;
    if (email !== undefined) partner.email = email;
    if (phone !== undefined) partner.phone = phone;
    if (operatingLocation !== undefined) partner.operatingLocation = operatingLocation;
    if (vehicleType !== undefined) partner.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) partner.vehicleNumber = vehicleNumber;
    if (isActivePartner !== undefined) partner.isActivePartner = isActivePartner;
    if (status !== undefined) partner.status = status;
    if (address !== undefined) partner.address = address;
    
    // Auto-detect currentCity on update if it is empty/undefined
    let resolvedCurrentCity = currentCity;
    if (resolvedCurrentCity === undefined || resolvedCurrentCity === '') {
      const addressToUse = address !== undefined ? address : partner.address;
      const opLocToUse = operatingLocation !== undefined ? operatingLocation : partner.operatingLocation;
      const detected = detectCityAndState(addressToUse || opLocToUse || '');
      if (detected.city) {
        resolvedCurrentCity = detected.city;
      }
    }
    if (resolvedCurrentCity !== undefined) partner.currentCity = resolvedCurrentCity;
    
    if (currentArea !== undefined) partner.currentArea = currentArea;
    if (pincode !== undefined) partner.pincode = pincode;
    if (serviceRadius !== undefined) partner.serviceRadius = Number(serviceRadius);
    if (perItemCharge !== undefined) {
      partner.perItemCharge = Number(perItemCharge);
      partner.rateUpTo2Km = Number(perItemCharge);
      partner.rateAbove2Km = Number(perItemCharge);
    }
    if (rateUpTo2Km !== undefined) partner.rateUpTo2Km = Number(rateUpTo2Km);
    if (rateAbove2Km !== undefined) partner.rateAbove2Km = Number(rateAbove2Km);
    if (latitude !== undefined) partner.latitude = Number(latitude);
    if (longitude !== undefined) partner.longitude = Number(longitude);
    
    if (perKmRate !== undefined) {
      partner.perKmRate = Number(perKmRate);
      partner.perItemCharge = Number(perKmRate);
      partner.rateUpTo2Km = Number(perKmRate);
      partner.rateAbove2Km = Number(perKmRate);
    }
    if (coveredCities !== undefined) partner.coveredCities = coveredCities;
    if (deliveryScope !== undefined) partner.deliveryScope = deliveryScope;
    
    if (salaryRequirement !== undefined) partner.salaryRequirement = salaryRequirement;
    if (serviceAreaCountry !== undefined) partner.serviceAreaCountry = serviceAreaCountry;
    if (serviceAreaRegion !== undefined) partner.serviceAreaRegion = serviceAreaRegion;
    if (serviceAreaDistrict !== undefined) partner.serviceAreaDistrict = serviceAreaDistrict;
    if (serviceAreaState !== undefined) partner.serviceAreaState = serviceAreaState;
    if (serviceAreaCity !== undefined) partner.serviceAreaCity = serviceAreaCity;

    await partner.save();

    res.status(200).json({
      success: true,
      message: 'Delivery partner updated successfully',
      partner
    });
  } catch (error) {
    console.error('Update Partner Error:', error);
    res.status(500).json({ success: false, error: 'Server error updating partner: ' + error.message });
  }
};

// @desc    Admin CRUD: Delete delivery partner
// @route   DELETE /api/delivery/partners/:id
// @access  Private (Admin only)
exports.deleteDeliveryPartner = async (req, res) => {
  try {
    const partner = await User.findById(req.params.id);
    if (!partner || partner.role !== 'delivery') {
      return res.status(404).json({ success: false, error: 'Delivery partner not found' });
    }

    await User.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Delivery partner deleted successfully'
    });
  } catch (error) {
    console.error('Delete Partner Error:', error);
    res.status(500).json({ success: false, error: 'Server error deleting partner' });
  }
};

// @desc    Delivery Partner self-update profile (status, area, etc.)
// @route   PUT /api/delivery/profile
// @access  Private (Delivery Partner only)
exports.updatePartnerProfile = async (req, res) => {
  try {
    const { 
      currentCity, 
      currentArea, 
      pincode, 
      serviceRadius, 
      perItemCharge, 
      rateUpTo2Km,
      rateAbove2Km,
      isActivePartner, 
      vehicleType, 
      vehicleNumber, 
      latitude, 
      longitude,
      operatingLocation,
      salaryRequirement,
      serviceAreaCountry,
      serviceAreaRegion,
      serviceAreaDistrict,
      serviceAreaState,
      serviceAreaCity,
      address,
      perKmRate,
      coveredCities,
      deliveryScope
    } = req.body;
    const partner = await User.findById(req.user._id);
    if (!partner || partner.role !== 'delivery') {
      return res.status(404).json({ success: false, error: 'Delivery partner not found' });
    }

    // Auto-detect currentCity on self profile update if it is empty/undefined
    let resolvedCurrentCity = currentCity;
    if (resolvedCurrentCity === undefined || resolvedCurrentCity === '') {
      const addressToUse = address !== undefined ? address : partner.address;
      const opLocToUse = operatingLocation !== undefined ? operatingLocation : partner.operatingLocation;
      const detected = detectCityAndState(addressToUse || opLocToUse || '');
      if (detected.city) {
        resolvedCurrentCity = detected.city;
      }
    }
    if (resolvedCurrentCity !== undefined) partner.currentCity = resolvedCurrentCity;
    if (currentArea !== undefined) partner.currentArea = currentArea;
    if (pincode !== undefined) partner.pincode = pincode;
    if (address !== undefined) partner.address = address;
    if (serviceRadius !== undefined) partner.serviceRadius = Number(serviceRadius);
    if (perItemCharge !== undefined) {
      partner.perItemCharge = Number(perItemCharge);
      partner.rateUpTo2Km = Number(perItemCharge);
      partner.rateAbove2Km = Number(perItemCharge);
    }
    if (rateUpTo2Km !== undefined) partner.rateUpTo2Km = Number(rateUpTo2Km);
    if (rateAbove2Km !== undefined) partner.rateAbove2Km = Number(rateAbove2Km);
    if (isActivePartner !== undefined) partner.isActivePartner = isActivePartner;
    if (vehicleType !== undefined) partner.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) partner.vehicleNumber = vehicleNumber;
    if (latitude !== undefined) partner.latitude = Number(latitude);
    if (longitude !== undefined) partner.longitude = Number(longitude);
    
    if (perKmRate !== undefined) {
      partner.perKmRate = Number(perKmRate);
      partner.perItemCharge = Number(perKmRate);
      partner.rateUpTo2Km = Number(perKmRate);
      partner.rateAbove2Km = Number(perKmRate);
    }
    if (coveredCities !== undefined) partner.coveredCities = coveredCities;
    if (deliveryScope !== undefined) partner.deliveryScope = deliveryScope;

    if (operatingLocation !== undefined) partner.operatingLocation = operatingLocation;
    if (salaryRequirement !== undefined) partner.salaryRequirement = salaryRequirement;
    if (serviceAreaCountry !== undefined) partner.serviceAreaCountry = serviceAreaCountry;
    if (serviceAreaRegion !== undefined) partner.serviceAreaRegion = serviceAreaRegion;
    if (serviceAreaDistrict !== undefined) partner.serviceAreaDistrict = serviceAreaDistrict;
    if (serviceAreaState !== undefined) partner.serviceAreaState = serviceAreaState;
    if (serviceAreaCity !== undefined) partner.serviceAreaCity = serviceAreaCity;

    await partner.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      partner
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, error: 'Server error updating profile: ' + error.message });
  }
};

// Helper: Send delivery confirmation emails to buyer and seller
async function notifyDeliveryCompleted(order, partner) {
  try {
    const buyerEmail = order.deliveryAddress?.email;
    const buyerName = order.deliveryAddress?.fullName || 'Valued Customer';
    const sellerEmail = order.sellerEmail;
    
    // Build items HTML list for the buyer's email
    let itemsHtml = '';
    if (order.items && order.items.length) {
      order.items.forEach(item => {
        itemsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 600;">
              ${item.name}
              ${item.brand ? `<span style="display: block; font-size: 0.75rem; color: #64748b; font-weight: 400;">Brand: ${item.brand}</span>` : ''}
            </td>
            <td style="padding: 12px 16px; text-align: center; color: #334155;">${item.quantity}</td>
            <td style="padding: 12px 16px; text-align: right; color: #0f172a; font-weight: 600;">₹${item.price.toFixed(2)}</td>
          </tr>
        `;
      });
    }

    const formattedDate = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const fullAddress = order.deliveryAddress?.address 
      ? `${order.deliveryAddress.address}, ${order.deliveryAddress.city || ''} - ${order.deliveryAddress.pincode || ''}`
      : 'N/A';

    // 1. Send Email to Buyer
    if (buyerEmail) {
      const buyerHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 32px; text-align: center; color: #ffffff;">
            <div style="font-size: 24px; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px;">EMAHU</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 1.8rem; font-weight: 700;">📦 Order Delivered!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 0.95rem;">Order #${order.orderId}</p>
          </div>
          <div style="padding: 36px 32px; background: #ffffff;">
            <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 24px 0;">Dear ${buyerName},</p>
            <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 28px 0;">Great news! Your order has been successfully delivered by our courier partner.</p>

            <!-- Shipping Address & Details -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 1rem; font-weight: 700;">Delivery Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 35%;">Delivery Address:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${fullAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Courier Partner:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${order.carrier || partner?.name || 'Courier'}</td>
                </tr>
                ${order.trackingId ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Tracking ID:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${order.trackingId}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Delivered On:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${formattedDate}</td>
                </tr>
              </table>
            </div>

            <!-- Items delivered table -->
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                <thead>
                  <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 12px 16px; color: #475569; font-weight: 700;">Item</th>
                    <th style="padding: 12px 16px; text-align: center; color: #475569; font-weight: 700;">Qty</th>
                    <th style="padding: 12px 16px; text-align: right; color: #475569; font-weight: 700;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <!-- Price breakdown -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 28px;">
              <table style="width: 50%; font-size: 0.9rem; text-align: right;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Subtotal:</td>
                  <td style="padding: 6px 0 6px 16px; color: #0f172a; font-weight: 600;">₹${(order.productAmount || (order.total - (order.deliveryCharge || 0))).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Delivery Fee:</td>
                  <td style="padding: 6px 0 6px 16px; color: #0f172a; font-weight: 600;">₹${(order.deliveryCharge || 0).toFixed(2)}</td>
                </tr>
                ${order.discountAmount > 0 ? `
                <tr>
                  <td style="padding: 6px 0; color: #ef4444;">Discount:</td>
                  <td style="padding: 6px 0 6px 16px; color: #ef4444; font-weight: 600;">− ₹${order.discountAmount.toFixed(2)}</td>
                </tr>` : ''}
                <tr style="border-top: 2px solid #e2e8f0;">
                  <td style="padding: 10px 0 0 0; color: #0f172a; font-weight: 700; font-size: 1rem;">Total Paid:</td>
                  <td style="padding: 10px 0 0 16px; color: #10b981; font-weight: 800; font-size: 1.1rem;">₹${order.total.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <p style="color: #64748b; font-size: 0.88rem; line-height: 1.6; margin: 0;">If you have any issues with this delivery or the items received, please raise a dispute in your dashboard or contact our support team immediately.</p>
          </div>
          <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 0.8rem;">
            <p style="margin: 0 0 4px 0;">Thank you for shopping on <strong style="color: #10b981;">Emahu Marketplace</strong></p>
          </div>
        </div>
      `;

      await sendEmail({
        to: buyerEmail,
        subject: `📦 Delivered: Your Order #${order.orderId} | Emahu Marketplace`,
        text: `Dear ${buyerName},\n\nYour order #${order.orderId} has been successfully delivered!\n\nDelivery Address: ${fullAddress}\nCourier: ${order.carrier || partner?.name || 'Courier'}\nDelivered On: ${formattedDate}\n\nThank you for shopping with Emahu!\n\nRegards,\nThe Emahu Team`,
        html: buyerHtml
      });
    }

    // 2. Send Email to Seller
    if (sellerEmail) {
      const sellerHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 40px 32px; text-align: center; color: #ffffff;">
            <div style="font-size: 24px; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px;">EMAHU</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 1.8rem; font-weight: 700;">📦 Order Delivered</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 0.95rem;">Order #${order.orderId}</p>
          </div>
          <div style="padding: 36px 32px; background: #ffffff;">
            <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 24px 0;">Dear Seller,</p>
            <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 28px 0;">We are pleased to inform you that Order #${order.orderId} has been successfully delivered to the customer.</p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 1rem; font-weight: 700;">Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 35%;">Order ID:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">#${order.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Recipient:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${buyerName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Delivered On:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${formattedDate}</td>
                </tr>
              </table>
            </div>

            <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 28px 0;">The customer has received their package. Your payout is now eligible for release. Please log in to your merchant dashboard to request payment release.</p>
          </div>
          <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 0.8rem;">
            <p style="margin: 0;">Emahu Marketplace Seller Center</p>
          </div>
        </div>
      `;

      await sendEmail({
        to: sellerEmail,
        subject: `📦 Order #${order.orderId} Delivered – Payment Ready for Release | Emahu Marketplace`,
        text: `Dear Seller,\n\nOrder #${order.orderId} has been successfully delivered to ${buyerName} on ${formattedDate}.\n\nYour payout is now ready for release. Please log in to your merchant dashboard to request payment release.\n\nRegards,\nThe Emahu Team`,
        html: sellerHtml
      });
    }
  } catch (emailErr) {
    console.error('Error sending delivery confirmation emails in helper:', emailErr);
  }
}

exports.notifyDeliveryCompleted = notifyDeliveryCompleted;

// @desc    Update delivery partner live location
// @route   POST /api/delivery/location
// @access  Private (Delivery Partner only)
exports.updateLiveLocation = async (req, res) => {
  try {
    const { orderId, latitude, longitude } = req.body;
    const partnerId = req.user._id;

    const partner = await User.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Delivery partner not found' });
    }

    partner.latitude = Number(latitude);
    partner.longitude = Number(longitude);
    await partner.save();

    // Broadcast live location event to socket grid
    const io = req.app.get('socketio');
    if (io) {
      io.emit('location-updated', {
        partnerId: partnerId.toString(),
        orderId,
        latitude: Number(latitude),
        longitude: Number(longitude)
      });
    }

    res.status(200).json({ success: true, message: 'Live GPS coordinates updated' });
  } catch (error) {
    console.error('Update Live Location Error:', error);
    res.status(500).json({ success: false, error: 'Server error updating location' });
  }
};

// @desc    Get live delivery tracking metadata
// @route   GET /api/delivery/track/live/:orderId
// @access  Public
exports.getLiveTrackingDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    let partner = null;
    if (order.deliveryPartnerId) {
      partner = await User.findById(order.deliveryPartnerId).select('name phone vehicleType vehicleNumber latitude longitude');
    }

    const sellerLoc = order.sellerLocation || { latitude: 23.0225, longitude: 72.5714 };
    const buyerLoc = order.buyerLocation || { latitude: 23.0225, longitude: 72.5714 };
    const partnerLoc = partner ? { latitude: partner.latitude, longitude: partner.longitude } : null;

    let remainingDistance = null;
    let etaMinutes = null;

    if (partnerLoc && partnerLoc.latitude && partnerLoc.longitude) {
      const destLat = ['picked_up', 'in_transit', 'out_for_delivery', 'arrived'].includes(order.deliveryStatus)
        ? buyerLoc.latitude
        : sellerLoc.latitude;
      const destLon = ['picked_up', 'in_transit', 'out_for_delivery', 'arrived'].includes(order.deliveryStatus)
        ? buyerLoc.longitude
        : sellerLoc.longitude;

      const googleDist = await getGoogleMapsDistance(partnerLoc.latitude, partnerLoc.longitude, destLat, destLon);
      remainingDistance = googleDist ? googleDist.distanceKm : getHaversineDistance(partnerLoc.latitude, partnerLoc.longitude, destLat, destLon);
      
      const durationSec = googleDist ? googleDist.durationSec : Math.round(remainingDistance * 2.4 * 60);
      etaMinutes = Math.max(1, Math.round(durationSec / 60));
    }

    res.status(200).json({
      success: true,
      orderId,
      deliveryStatus: order.deliveryStatus,
      status: order.status,
      sellerLocation: sellerLoc,
      buyerLocation: buyerLoc,
      partnerLocation: partnerLoc,
      partnerDetails: partner,
      remainingDistanceKm: remainingDistance ? parseFloat(remainingDistance.toFixed(2)) : null,
      etaMinutes
    });
  } catch (error) {
    console.error('Get Live Tracking Details Error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving tracking details' });
  }
};

// @desc    Generate and send delivery OTP
// @route   POST /api/delivery/otp/send
// @access  Private (Delivery Partner only)
exports.sendDeliveryOtp = async (req, res) => {
  try {
    const { orderId, latitude, longitude } = req.body;
    const partnerId = req.user._id;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'GPS coordinates are required for proximity verification.' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.deliveryPartnerId?.toString() !== partnerId.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You are not assigned to this order' });
    }

    const buyerLat = order.buyerLocation?.latitude;
    const buyerLon = order.buyerLocation?.longitude;
    if (!buyerLat || !buyerLon) {
      return res.status(400).json({ success: false, error: 'Buyer GPS coordinates are not set' });
    }

    // Proximity check: Must be within 100 meters
    const dist = getHaversineDistance(Number(latitude), Number(longitude), buyerLat, buyerLon);
    if (dist > 0.1) {
      return res.status(400).json({ success: false, error: `GPS Proximity Verification Failed. You are ${Math.round(dist * 1000)} meters away. You must be within 100m to send OTP.` });
    }

    const Otp = require('../models/Otp');
    const email = order.deliveryAddress?.email;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Buyer contact email not found' });
    }

    // Rate Limiting: 60s cooldown
    const existingOtp = await Otp.findOne({ email, isVerified: false }).sort({ createdAt: -1 });
    if (existingOtp) {
      const diff = (Date.now() - new Date(existingOtp.lastSentAt).getTime()) / 1000;
      if (diff < 60) {
        return res.status(429).json({ success: false, error: `Please wait ${Math.round(60 - diff)} seconds before requesting another code.` });
      }
    }

    // Generate secure 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Delete any old OTP record for this specific order from the Otp collection
    if (order.deliveryOtp) {
      await Otp.deleteMany({ email, otp: order.deliveryOtp });
    }

    await Otp.create({
      email,
      otp: otpCode,
      expiresAt,
      attempts: 0,
      lastSentAt: new Date()
    });

    // Save OTP to the order document directly so it can be queried/rendered on the buyer dashboard
    order.deliveryOtp = otpCode;
    order.deliveryOtpExpiry = expiresAt;
    order.deliveryOtpAttempts = 0;
    await order.save();

    const otpHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #319795; padding: 30px; text-align: center; color: white;">
          <h2 style="margin:0;">Order Receipt Verification</h2>
          <p style="margin: 5px 0 0 0;">Order #${orderId}</p>
        </div>
        <div style="padding: 30px; background-color: white; text-align: center;">
          <p>Your delivery partner has arrived at your address.</p>
          <p>Please share the following OTP with the driver to confirm you have received the package:</p>
          <div style="background-color: #f7fafc; border: 1px dashed #cbd5e0; padding: 15px; font-size: 2.2rem; font-weight: bold; letter-spacing: 6px; color: #2d3748; margin: 20px 0; border-radius: 8px;">
            ${otpCode}
          </div>
          <p style="color: #e53e3e; font-size: 0.8rem; font-weight: 600;">Do NOT share this code unless the courier partner has handed over your package.</p>
          <p style="color: #718096; font-size: 0.75rem; margin-top: 10px;">This security code is valid for 10 minutes and expires after 5 failed entry attempts.</p>
        </div>
      </div>
    `;

    // 1. Send Email (Awaited to prevent Vercel container termination)
    const emailResult = await sendEmail({
      to: email,
      subject: `🔑 Delivery Confirmation Code: ${otpCode} | Emahu Marketplace`,
      text: `Your delivery OTP is ${otpCode}. Share this with your driver to confirm delivery.`,
      html: otpHtml
    });

    if (!emailResult.success) {
      return res.status(500).json({ success: false, error: `Failed to send delivery OTP email: ${emailResult.error}` });
    }

    // 2. Send SMS
    const sendSms = require('../utils/sendSms');
    const buyerPhone = order.deliveryAddress?.phone || order.buyerPhone || '';
    if (buyerPhone) {
      const smsResult = await sendSms({
        to: buyerPhone,
        body: `Your Emahu delivery confirmation OTP is ${otpCode}. Share this with the delivery partner only when you receive your package.`
      });
      if (!smsResult.success && !smsResult.simulated) {
        console.error('Delivery OTP SMS sending failed:', smsResult.error);
      }
    }

    // 3. Create In-App Notification
    await Notification.create({
      recipient: order.userId,
      title: 'Delivery OTP Verification Code',
      message: `Your Emahu delivery confirmation OTP code is ${otpCode}. Share this code with the driver to confirm receipt of order #${orderId}.`,
      isRead: false
    });

    res.status(200).json({ success: true, message: 'Confirmation code sent to buyer' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, error: 'Server error sending delivery OTP' });
  }
};

// @desc    Verify OTP and complete delivery
// @route   POST /api/delivery/otp/verify
// @access  Private (Delivery Partner only)
exports.verifyDeliveryOtp = async (req, res) => {
  try {
    const { orderId, otp, deliveryPhoto, latitude, longitude } = req.body;
    const partnerId = req.user._id;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.deliveryPartnerId?.toString() !== partnerId.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You are not assigned to this order' });
    }

    const buyerLat = order.buyerLocation?.latitude;
    const buyerLon = order.buyerLocation?.longitude;
    if (buyerLat && buyerLon) {
      const dist = getHaversineDistance(Number(latitude), Number(longitude), buyerLat, buyerLon);
      if (dist > 0.1) {
        return res.status(400).json({ success: false, error: `GPS Proximity Verification Failed. You are ${Math.round(dist * 1000)} meters away. You must be within 100m of buyer location to verify.` });
      }
    }

    if (!deliveryPhoto) {
      return res.status(400).json({ success: false, error: 'Please upload a package verification photo to confirm delivery' });
    }

    const Otp = require('../models/Otp');
    const email = order.deliveryAddress?.email;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Buyer contact email not found' });
    }

    // Isolate OTP verification record specifically matching this order's OTP code
    const otpRecord = await Otp.findOne({ email, otp: order.deliveryOtp, isVerified: false });
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'No active OTP verification code found. Please request a new code.' });
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      return res.status(400).json({ success: false, error: 'Verification code has expired. Request a new OTP.' });
    }

    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ success: false, error: 'Too many incorrect attempts. Please generate a new OTP code.' });
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ success: false, error: `Incorrect verification code. ${5 - otpRecord.attempts} attempts remaining.` });
    }

    // Code is correct
    otpRecord.isVerified = true;
    await otpRecord.save();
    await Otp.deleteMany({ email, otp });

    // Transition statuses to delivered and automatically release funds
    order.deliveryStatus = 'delivered';
    order.status = '🔓 FUNDS RELEASED';
    order.deliveryPhoto = deliveryPhoto;
    order.deliveredAt = new Date();
    order.deliveryOtp = undefined;
    order.deliveryOtpExpiry = undefined;
    order.deliveryOtpAttempts = 0;

    try {
      const PlatformSettings = require('../models/PlatformSettings');
      let settings = await PlatformSettings.findOne({ docId: 'global' });
      if (!settings) {
        settings = await PlatformSettings.create({ docId: 'global', platformFeePercent: 4 });
      }
      const feePercent = settings.platformFeePercent;

      const orderTotal = order.total || 0;
      const productAmount = order.productAmount || orderTotal;
      const penaltyAmount = order.penaltyAmount || 0;
      const feeAmount = parseFloat(((productAmount * feePercent) / 100).toFixed(2));
      const netPayout = parseFloat((productAmount - feeAmount - penaltyAmount).toFixed(2));

      order.paymentReleased = true;
      order.paymentReleasedAt = new Date();
      order.paymentStatus = 'released';
      order.platformFeePercent = feePercent;
      order.platformFeeAmount = feeAmount;
      order.sellerNetPayout = netPayout;
      console.log(`[Auto Escrow Release] Order #${orderId} delivered via OTP. Funds released automatically to seller ${order.sellerId}: netPayout = ₹${netPayout}`);
    } catch (payErr) {
      console.error('[Auto Escrow Release Error]', payErr);
    }

    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    order.timeline.push({
      status: '🔓 FUNDS RELEASED',
      label: 'Delivered & Payment Released',
      desc: `Package delivered successfully. Verified via secure OTP. Escrow funds automatically released to merchant.`,
      date: dateStr
    });
    await order.save();

    let assignment = await DeliveryAssignment.findOne({ orderId });
    if (assignment) {
      assignment.currentStatus = 'delivered';
      assignment.deliveryPhoto = deliveryPhoto;
      assignment.deliveredDate = new Date();
      await assignment.save();
    }

    await DeliveryTracking.create({
      assignmentId: assignment?._id,
      orderId,
      status: 'delivered',
      location: `${latitude},${longitude}`,
      remarks: 'Delivery completed. Verified via secure OTP.'
    });

    // Notify Buyer
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: order.userId,
      recipientModel: 'User',
      title: 'Order Delivered Successfully',
      message: `Your order #${orderId} has been delivered. Thank you!`,
      isRead: false
    });

    // Notify Seller
    await Notification.create({
      recipient: order.sellerId,
      recipientModel: 'User',
      title: 'Order Delivered',
      message: `Order #${orderId} was delivered by courier partner. Payout eligible.`,
      isRead: false
    });

    // Trigger Socket Broadcast
    const io = req.app.get('socketio');
    if (io) {
      io.emit('delivery-status-changed', {
        orderId,
        status: 'DELIVERED',
        deliveryStatus: 'delivered'
      });
    }

    // Send emails in background
    notifyDeliveryCompleted(order, req.user);

    res.status(200).json({ success: true, message: 'Delivery completed and verified successfully', order });
  } catch (error) {
    console.error('Verify Delivery OTP Error:', error);
    res.status(500).json({ success: false, error: 'Server error confirming OTP' });
  }
};

// @desc    Partner uploaded arrival photo (Buyer must confirm receipt)
// @route   POST /api/delivery/photo/upload
// @access  Private (Delivery Partner only)
exports.uploadArrivedPhoto = async (req, res) => {
  try {
    const { orderId, deliveryPhoto, latitude, longitude } = req.body;
    const partnerId = req.user._id;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.deliveryPartnerId?.toString() !== partnerId.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You are not assigned to this order' });
    }

    const buyerLat = order.buyerLocation?.latitude;
    const buyerLon = order.buyerLocation?.longitude;
    if (buyerLat && buyerLon) {
      const dist = getHaversineDistance(Number(latitude), Number(longitude), buyerLat, buyerLon);
      if (dist > 0.1) {
        return res.status(400).json({ success: false, error: `GPS Proximity Verification Failed. You are ${Math.round(dist * 1000)} meters away. You must be within 100m to verify arrival.` });
      }
    }

    if (!deliveryPhoto) {
      return res.status(400).json({ success: false, error: 'Please upload a package photo to confirm arrival' });
    }

    // Transition status to arrived
    order.deliveryStatus = 'arrived';
    order.status = 'ARRIVED';
    order.deliveryPhoto = deliveryPhoto;

    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    order.timeline.push({
      status: 'ARRIVED',
      label: 'Arrived',
      desc: `Courier partner has arrived at the destination. Package photo uploaded. Waiting for buyer confirmation.`,
      date: dateStr
    });
    await order.save();

    let assignment = await DeliveryAssignment.findOne({ orderId });
    if (assignment) {
      assignment.currentStatus = 'arrived';
      assignment.deliveryPhoto = deliveryPhoto;
      await assignment.save();
    }

    await DeliveryTracking.create({
      assignmentId: assignment?._id,
      orderId,
      status: 'arrived',
      location: `${latitude},${longitude}`,
      remarks: 'Courier partner arrived at destination. Verification photo uploaded.'
    });

    // Notify Buyer
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: order.userId,
      recipientModel: 'User',
      title: 'Courier Arrived at Location',
      message: `Your package for order #${orderId} has arrived! Please confirm receipt on your dashboard.`,
      isRead: false
    });

    // Socket broadcast
    const io = req.app.get('socketio');
    if (io) {
      io.emit('delivery-status-changed', {
        orderId,
        status: 'ARRIVED',
        deliveryStatus: 'arrived'
      });
    }

    res.status(200).json({ success: true, message: 'Arrival verified and photo uploaded successfully', order });
  } catch (error) {
    console.error('Upload Arrived Photo Error:', error);
    res.status(500).json({ success: false, error: 'Server error uploading arrival photo' });
  }
};

// Helper to automatically assign a single order to the best eligible partner
async function autoAssignOrderInternal(order) {
  try {
    if (!order) return null;
    console.log(`[AutoAssign Debug] Order ID: ${order.orderId}, status: ${order.status}, deliveryStatus: ${order.deliveryStatus}, deliveryPartnerId: ${order.deliveryPartnerId}`);
    if (order.deliveryPartnerId || order.deliveryStatus !== 'unassigned') {
      console.log(`[AutoAssign Debug] Skipping because partner already set or deliveryStatus is not unassigned`);
      return null;
    }

    let orderCity = '';
    const rawCity = (order.deliveryAddress?.city || '').trim();
    const knownCity = rawCity.length >= 3 ? detectCityAndState(rawCity).city : '';
    orderCity = (knownCity || rawCity.length >= 3 ? rawCity : '').toLowerCase();

    if (!orderCity || orderCity.length < 3) {
      const buyerAddr = order.buyerLocation?.address || order.deliveryAddress?.address || '';
      const detected = detectCityAndState(buyerAddr);
      if (detected.city) orderCity = detected.city.trim().toLowerCase();
    }

    let sellerCity = '';
    if (order.sellerId) {
      const sellerUser = await User.findById(order.sellerId);
      if (sellerUser) {
        sellerCity = (sellerUser.currentCity || sellerUser.city || '').trim().toLowerCase();
      }
    }
    if (!sellerCity && order.sellerLocation?.address) {
      const detected = detectCityAndState(order.sellerLocation.address);
      sellerCity = (detected.city || '').trim().toLowerCase();
    }

    const isSameCityOrder = sellerCity && orderCity && sellerCity === orderCity;

    // Find active and approved partners
    const partners = await User.find({
      role: 'delivery',
      status: 'approved',
      isActivePartner: { $ne: false }
    });
    console.log(`[AutoAssign Debug] Found ${partners.length} active/approved partners`);

    const eligiblePartners = [];
    const buyerLat = order.buyerLocation?.latitude;
    const buyerLon = order.buyerLocation?.longitude;

    for (const partner of partners) {
      const pCities = (partner.coveredCities && partner.coveredCities.length > 0)
        ? partner.coveredCities.map(c => c.trim().toLowerCase())
        : [(partner.currentCity || partner.city || '').trim().toLowerCase()].filter(Boolean);

      const coversBuyer = orderCity ? pCities.includes(orderCity) : false;
      const coversSeller = sellerCity ? pCities.includes(sellerCity) : false;
      console.log(`[AutoAssign Debug] Partner ${partner.name}: coveredCities=${JSON.stringify(pCities)}, coversBuyer=${coversBuyer}, coversSeller=${coversSeller}`);

      if (orderCity && !coversBuyer) {
        console.log(`[AutoAssign Debug] Partner ${partner.name} skipped: doesn't cover buyer city ${orderCity}`);
        continue;
      }
      if (!isSameCityOrder && sellerCity && orderCity && !coversSeller) {
        console.log(`[AutoAssign Debug] Partner ${partner.name} skipped: intercity and doesn't cover seller city ${sellerCity}`);
        continue;
      }

      const isCityMatch = coversBuyer || coversSeller;

      let isRadiusMatch = true;
      let distToBuyer = 0;
      if (buyerLat !== undefined && buyerLon !== undefined && partner.latitude !== undefined && partner.longitude !== undefined) {
        distToBuyer = getHaversineDistance(partner.latitude, partner.longitude, buyerLat, buyerLon);
        isRadiusMatch = distToBuyer <= (partner.serviceRadius || 15);
      }
      console.log(`[AutoAssign Debug] Partner ${partner.name}: isCityMatch=${isCityMatch}, distToBuyer=${distToBuyer.toFixed(2)}km, isRadiusMatch=${isRadiusMatch}`);

      eligiblePartners.push({
        partner,
        isCityMatch,
        isRadiusMatch,
        distanceToBuyer: distToBuyer
      });
    }

    eligiblePartners.sort((a, b) => {
      const scoreA = (a.isCityMatch ? 2 : 0) + (a.isRadiusMatch ? 1 : 0);
      const scoreB = (b.isCityMatch ? 2 : 0) + (b.isRadiusMatch ? 1 : 0);
      return scoreB - scoreA || a.distanceToBuyer - b.distanceToBuyer;
    });

    if (eligiblePartners.length > 0) {
      const bestPartner = eligiblePartners[0].partner;
      const deliveryPartnerId = bestPartner._id;

      const perKmRate = 2;
      const totalCost = parseFloat(((order.distanceKm || 5) * perKmRate).toFixed(2));

      order.deliveryPartnerId = deliveryPartnerId;
      order.carrier = bestPartner.name;
      order.carrierPhone = bestPartner.phone;
      order.deliveryStatus = 'assigned';
      order.status = 'DELIVERY_ASSIGNED';
      order.deliveryCost = totalCost;
      order.deliveryCharge = totalCost;

      // Generate and save secure OTP immediately on assignment
      await generateAndSaveDeliveryOtp(order);

      const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      order.timeline.push({
        status: 'DELIVERY_ASSIGNED',
        label: 'Delivery Assigned',
        desc: `Order automatically assigned to courier partner: ${bestPartner.name}. Waiting for partner acceptance.`,
        date: dateStr
      });

      await order.save();

      let assignment = await DeliveryAssignment.findOne({ orderId: order.orderId });
      if (!assignment) {
        assignment = new DeliveryAssignment({
          orderId: order.orderId,
          sellerId: order.sellerId,
          buyerId: order.userId,
          deliveryPartnerId,
          distance: order.distanceKm || 5,
          deliveryCharge: totalCost,
          currentStatus: 'assigned'
        });
      } else {
        assignment.deliveryPartnerId = deliveryPartnerId;
        assignment.deliveryCharge = totalCost;
        assignment.currentStatus = 'assigned';
      }
      await assignment.save();

      await DeliveryTracking.create({
        assignmentId: assignment._id,
        orderId: order.orderId,
        status: 'assigned',
        remarks: `Automatically assigned to partner ${bestPartner.name}. Waiting for acceptance.`
      });

      await Notification.create({
        recipient: deliveryPartnerId,
        recipientModel: 'User',
        title: 'New Delivery Assigned (Auto)',
        message: `You have been automatically assigned order #${order.orderId}. Click to view details.`,
        isRead: false
      });

      await Notification.create({
        recipient: order.userId,
        recipientModel: 'User',
        title: 'Delivery Partner Assigned (Auto)',
        message: `Your order #${order.orderId} has been automatically assigned to ${bestPartner.name}.`,
        isRead: false
      });

      console.log(`[Auto-Assignment] Order #${order.orderId} automatically assigned to partner: ${bestPartner.name}`);
      return bestPartner;
    }
  } catch (err) {
    console.error('Error in autoAssignOrderInternal:', err);
  }
  return null;
}

// Helper to assign pending/unassigned orders to a specific partner upon approval/registration
async function autoAssignPendingOrdersToPartner(partner) {
  try {
    if (!partner || partner.role !== 'delivery' || partner.status !== 'approved' || !partner.isActivePartner) {
      return;
    }

    const unassignedOrders = await Order.find({
      deliveryStatus: 'unassigned',
      status: { $in: ['APPROVED', 'READY_FOR_PICKUP'] }
    });

    for (const order of unassignedOrders) {
      let orderCity = '';
      const rawCity = (order.deliveryAddress?.city || '').trim();
      const knownCity = rawCity.length >= 3 ? detectCityAndState(rawCity).city : '';
      orderCity = (knownCity || rawCity.length >= 3 ? rawCity : '').toLowerCase();

      if (!orderCity || orderCity.length < 3) {
        const buyerAddr = order.buyerLocation?.address || order.deliveryAddress?.address || '';
        const detected = detectCityAndState(buyerAddr);
        if (detected.city) orderCity = detected.city.trim().toLowerCase();
      }

      let sellerCity = '';
      if (order.sellerId) {
        const sellerUser = await User.findById(order.sellerId);
        if (sellerUser) {
          sellerCity = (sellerUser.currentCity || sellerUser.city || '').trim().toLowerCase();
        }
      }

      const pCities = (partner.coveredCities && partner.coveredCities.length > 0)
        ? partner.coveredCities.map(c => c.trim().toLowerCase())
        : [(partner.currentCity || partner.city || '').trim().toLowerCase()].filter(Boolean);

      const coversBuyer = orderCity ? pCities.includes(orderCity) : false;
      const coversSeller = sellerCity ? pCities.includes(sellerCity) : false;
      const isSameCityOrder = sellerCity && orderCity && sellerCity === orderCity;

      if (orderCity && !coversBuyer) continue;
      if (!isSameCityOrder && sellerCity && orderCity && !coversSeller) continue;

      let isRadiusMatch = true;
      const buyerLat = order.buyerLocation?.latitude;
      const buyerLon = order.buyerLocation?.longitude;
      if (buyerLat !== undefined && buyerLon !== undefined && partner.latitude !== undefined && partner.longitude !== undefined) {
        const distToBuyer = getHaversineDistance(partner.latitude, partner.longitude, buyerLat, buyerLon);
        isRadiusMatch = distToBuyer <= (partner.serviceRadius || 15);
      }

      if (isRadiusMatch) {
        const deliveryPartnerId = partner._id;
        const perKmRate = 2;
        const totalCost = parseFloat(((order.distanceKm || 5) * perKmRate).toFixed(2));

        order.deliveryPartnerId = deliveryPartnerId;
        order.carrier = partner.name;
        order.carrierPhone = partner.phone;
        order.deliveryStatus = 'assigned';
        order.status = 'DELIVERY_ASSIGNED';
        order.deliveryCost = totalCost;
        order.deliveryCharge = totalCost;

        // Generate and save secure OTP immediately on assignment
        await generateAndSaveDeliveryOtp(order);

        const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        order.timeline.push({
          status: 'DELIVERY_ASSIGNED',
          label: 'Delivery Assigned',
          desc: `Order automatically assigned to newly approved partner: ${partner.name}. Waiting for acceptance.`,
          date: dateStr
        });

        await order.save();

        let assignment = await DeliveryAssignment.findOne({ orderId: order.orderId });
        if (!assignment) {
          assignment = new DeliveryAssignment({
            orderId: order.orderId,
            sellerId: order.sellerId,
            buyerId: order.userId,
            deliveryPartnerId,
            distance: order.distanceKm || 5,
            deliveryCharge: totalCost,
            currentStatus: 'assigned'
          });
        } else {
          assignment.deliveryPartnerId = deliveryPartnerId;
          assignment.deliveryCharge = totalCost;
          assignment.currentStatus = 'assigned';
        }
        await assignment.save();

        await DeliveryTracking.create({
          assignmentId: assignment._id,
          orderId: order.orderId,
          status: 'assigned',
          remarks: `Automatically assigned to newly approved partner ${partner.name}. Waiting for acceptance.`
        });

        await Notification.create({
          recipient: deliveryPartnerId,
          recipientModel: 'User',
          title: 'New Delivery Assigned (Auto)',
          message: `You have been automatically assigned order #${order.orderId}. Click to view details.`,
          isRead: false
        });

        await Notification.create({
          recipient: order.userId,
          recipientModel: 'User',
          title: 'Delivery Partner Assigned (Auto)',
          message: `Your order #${order.orderId} has been automatically assigned to ${partner.name}.`,
          isRead: false
        });

        console.log(`[Auto-Assignment] Order #${order.orderId} automatically assigned to newly approved partner: ${partner.name}`);
      }
    }
  } catch (err) {
    console.error('Error in autoAssignPendingOrdersToPartner:', err);
  }
}

exports.autoAssignOrderInternal = autoAssignOrderInternal;
exports.autoAssignPendingOrdersToPartner = autoAssignPendingOrdersToPartner;
