const Order = require('../models/Order');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Public (supports guest checkout)
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Log payment response/order payload as required
    console.log('--- ORDER CREATION ATTEMPT ---');
    console.log('Payment Status:', orderData.paymentStatus || 'COMPLETED');
    console.log('Order Payload:', JSON.stringify(orderData, null, 2));
    console.log('Seller ID:', orderData.sellerId);
    console.log('User ID:', orderData.userId);
    if (orderData.items && orderData.items[0]) {
      console.log('Product ID:', orderData.items[0].productId);
    }
    
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
