const DeliverySetting = require('../models/DeliverySetting');
const Product = require('../models/Product');
const User = require('../models/User');

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
      
      const distance = getHaversineDistance(buyerLat, buyerLon, sLat, sLon);
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
