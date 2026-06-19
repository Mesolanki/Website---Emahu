const mongoose = require('mongoose');
const DeliverySetting = require('../models/DeliverySetting');
const Product = require('../models/Product');
const User = require('../models/User');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const DeliveryTracking = require('../models/DeliveryTracking');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

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
        freeShippingThreshold: 2000,
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
    const { maxDeliveryDistance, freeShippingThreshold, expressDeliverySurcharge, slabs } = req.body;
    
    let settings = await DeliverySetting.findOne();
    if (!settings) {
      settings = new DeliverySetting();
    }
    
    if (maxDeliveryDistance !== undefined) settings.maxDeliveryDistance = maxDeliveryDistance;
    if (freeShippingThreshold !== undefined) settings.freeShippingThreshold = freeShippingThreshold;
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
        details: { maxDeliveryDistance, freeShippingThreshold, slabsCount: slabs?.length }
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
  if (distance > settings.maxDeliveryDistance) {
    return { error: `Distance (${distance.toFixed(1)} KM) exceeds maximum allowed delivery distance (${settings.maxDeliveryDistance} KM)` };
  }
  
  // Free shipping threshold check removed to always charge by slabs
  
  // Find matching slab
  const matchedSlab = settings.slabs.find(slab => distance >= slab.fromKm && distance < slab.toKm);
  if (matchedSlab) {
    return { charge: matchedSlab.charge, free: false };
  }
  
  // Fallback if no matching slab
  return { charge: 99, free: false };
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
        freeShippingThreshold: 2000,
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
    
    // Process items. Group them by seller to determine if seller subtotal qualifies for free shipping
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
        freeShippingApplied: !isFurthestSeller,
        subtotal: group.subtotal,
        items: group.items
      });
    }
    
    res.status(200).json({
      success: true,
      buyerLocation: { latitude: buyerLat, longitude: buyerLon },
      maxDistanceKm: parseFloat(maxDistance.toFixed(2)),
      totalDeliveryCharge,
      freeShippingThreshold: settings.freeShippingThreshold,
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
      order.carrier = deliveryPartnerId;
      order.deliveryPartnerId = undefined;
      order.deliveryStatus = 'assigned';
      order.status = 'DELIVERY_ASSIGNED';

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
        status: 'DELIVERY_ASSIGNED',
        label: 'Delivery Assigned',
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
          status: 'DELIVERY_ASSIGNED',
          deliveryStatus: 'assigned',
          partner: { name: deliveryPartnerId, phone: 'N/A' }
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

    // Update Order
    order.deliveryPartnerId = deliveryPartnerId;
    order.deliveryStatus = 'assigned';
    order.status = 'DELIVERY_ASSIGNED';
    
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    order.timeline.push({
      status: 'DELIVERY_ASSIGNED',
      label: 'Delivery Assigned',
      desc: `Order assigned to courier partner: ${partner.name}`,
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
        distance: order.distanceKm,
        deliveryCharge: order.deliveryCharge || 0,
        currentStatus: 'assigned'
      });
    } else {
      assignment.deliveryPartnerId = deliveryPartnerId;
      assignment.currentStatus = 'assigned';
    }
    await assignment.save();

    // Create DeliveryTracking
    await DeliveryTracking.create({
      assignmentId: assignment._id,
      orderId,
      status: 'assigned',
      remarks: `Assigned to partner ${partner.name}`
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
      }
      assignment.currentStatus = 'rejected';
      timelineLabel = 'Courier Rejected';
      timelineDesc = `Courier partner ${partner.name} declined the assignment.`;
    } else if (status === 'picked_up') {
      order.status = 'PICKED_UP';
      timelineLabel = 'Picked Up';
      timelineDesc = 'Package has been picked up from the merchant warehouse.';
    } else if (status === 'out_for_delivery') {
      order.status = 'OUT_FOR_DELIVERY';
      timelineLabel = 'Out For Delivery';
      timelineDesc = 'Courier partner is out for delivery with your package.';
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

    // Get approved unassigned orders in the partner's service city/radius
    const unassignedOrders = await Order.find({
      deliveryStatus: 'unassigned',
      status: { $in: ['APPROVED', 'READY_FOR_PICKUP'] }
    }).lean();

    const partnerCity = (partner.currentCity || partner.city || '').trim().toLowerCase();
    const partnerLat = partner.latitude;
    const partnerLon = partner.longitude;
    const radiusLimit = partner.serviceRadius || 15;

    const matchingUnassignedOrders = [];
    for (const order of unassignedOrders) {
      // Skip if this partner has already rejected/interacted with it
      if (assignmentMap[order.orderId]) {
        continue;
      }

      const orderCity = (order.deliveryAddress?.city || '').trim().toLowerCase();
      if (partnerCity && orderCity && partnerCity !== orderCity) {
        continue;
      }

      // Check service radius if coordinates are available
      if (partnerLat !== undefined && partnerLon !== undefined && order.buyerLocation?.latitude !== undefined && order.buyerLocation?.longitude !== undefined) {
        const distToBuyer = getHaversineDistance(partnerLat, partnerLon, order.buyerLocation.latitude, order.buyerLocation.longitude);
        if (distToBuyer > radiusLimit) {
          continue; // outside service radius
        }
      }

      matchingUnassignedOrders.push({
        ...order,
        assignmentStatus: 'unassigned'
      });
    }

    const orders = [];
    
    // Add assigned/interacted orders (excluding purely rejected ones to keep dashboard clean, or keep them if you want but usually keep dashboard clean)
    assignedOrders.forEach(o => {
      const status = assignmentMap[o.orderId];
      if (status !== 'rejected') {
        orders.push({
          ...o,
          assignmentStatus: status,
          assignedDate: o.createdAt
        });
      }
    });

    // Add matching unassigned approved orders
    matchingUnassignedOrders.forEach(o => {
      orders.push(o);
    });

    // Sort descending by order ID
    orders.sort((a, b) => String(b.orderId).localeCompare(String(a.orderId)));

    res.status(200).json({
      success: true,
      orders
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
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const orderCity = (order.deliveryAddress?.city || '').trim().toLowerCase();
    const buyerLat = order.buyerLocation?.latitude;
    const buyerLon = order.buyerLocation?.longitude;

    // Fetch all active, approved delivery partners
    const partners = await User.find({
      role: 'delivery',
      status: 'approved',
      isActivePartner: true
    });

    const availablePartners = [];

    // Calculate distance between seller and buyer (if not already calculated)
    let distance = order.distanceKm;
    if (!distance) {
      const sLat = order.sellerLocation?.latitude || 23.0225;
      const sLon = order.sellerLocation?.longitude || 72.5714;
      const bLat = buyerLat || 23.0225;
      const bLon = buyerLon || 72.5714;
      const googleDist = await getGoogleMapsDistance(sLat, sLon, bLat, bLon);
      distance = googleDist ? googleDist.distanceKm : getHaversineDistance(sLat, sLon, bLat, bLon);
      order.distanceKm = parseFloat(distance.toFixed(2));
      await order.save();
    }

    for (const partner of partners) {
      const partnerCity = (partner.currentCity || partner.city || '').trim().toLowerCase();
      
      // 1. City check
      if (partnerCity !== orderCity) {
        continue;
      }

      // 2. Service radius check: distance from partner to buyer
      if (buyerLat !== undefined && buyerLon !== undefined && partner.latitude !== undefined && partner.longitude !== undefined) {
        const distToBuyer = getHaversineDistance(partner.latitude, partner.longitude, buyerLat, buyerLon);
        if (distToBuyer > (partner.serviceRadius || 15)) {
          continue; // Out of service radius
        }
      }

      // 3. Calculate delivery cost for this partner
      // Formula: Total Delivery Charge = Distance KM * Delivery Partner Rate
      const rate = partner.perItemCharge || 10; // rate per KM, default ₹10/KM
      const totalCost = parseFloat((distance * rate).toFixed(2));

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
        ratePerKm: rate,
        totalCost
      });
    }

    res.status(200).json({
      success: true,
      distanceKm: parseFloat(distance.toFixed(2)),
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
      latitude,
      longitude
    } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
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
      currentCity,
      currentArea,
      pincode,
      serviceRadius: serviceRadius ? Number(serviceRadius) : 15,
      perItemCharge: perItemCharge ? Number(perItemCharge) : 10,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
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
      latitude,
      longitude
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
    
    if (currentCity !== undefined) partner.currentCity = currentCity;
    if (currentArea !== undefined) partner.currentArea = currentArea;
    if (pincode !== undefined) partner.pincode = pincode;
    if (serviceRadius !== undefined) partner.serviceRadius = Number(serviceRadius);
    if (perItemCharge !== undefined) partner.perItemCharge = Number(perItemCharge);
    if (latitude !== undefined) partner.latitude = Number(latitude);
    if (longitude !== undefined) partner.longitude = Number(longitude);

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
    const { currentCity, currentArea, pincode, serviceRadius, perItemCharge, isActivePartner, vehicleType, vehicleNumber, latitude, longitude } = req.body;
    const partner = await User.findById(req.user._id);
    if (!partner || partner.role !== 'delivery') {
      return res.status(404).json({ success: false, error: 'Delivery partner not found' });
    }

    if (currentCity !== undefined) partner.currentCity = currentCity;
    if (currentArea !== undefined) partner.currentArea = currentArea;
    if (pincode !== undefined) partner.pincode = pincode;
    if (serviceRadius !== undefined) partner.serviceRadius = Number(serviceRadius);
    if (perItemCharge !== undefined) partner.perItemCharge = Number(perItemCharge);
    if (isActivePartner !== undefined) partner.isActivePartner = isActivePartner;
    if (vehicleType !== undefined) partner.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) partner.vehicleNumber = vehicleNumber;
    if (latitude !== undefined) partner.latitude = Number(latitude);
    if (longitude !== undefined) partner.longitude = Number(longitude);

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
