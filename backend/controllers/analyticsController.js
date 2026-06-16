const AnalyticsEvent = require('../models/AnalyticsEvent');

// @desc    Log a new storefront interaction event
// @route   POST /api/analytics/events
// @access  Public
exports.logEvent = async (req, res) => {
  try {
    const { type, productId, sellerId, userId } = req.body;

    if (!type || !sellerId) {
      return res.status(400).json({
        success: false,
        error: 'Event type and seller ID are required'
      });
    }

    const event = await AnalyticsEvent.create({
      type,
      productId,
      sellerId,
      userId
    });

    res.status(201).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Log Event Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error logging event'
    });
  }
};

// @desc    Get aggregated funnel statistics for a merchant store
// @route   GET /api/analytics/funnel
// @access  Public
exports.getFunnelStats = async (req, res) => {
  try {
    const { sellerId } = req.query;

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a seller ID'
      });
    }

    // Run parallel counts for optimized performance
    const [views, cart, checkout, purchase] = await Promise.all([
      AnalyticsEvent.countDocuments({ sellerId, type: 'view' }),
      AnalyticsEvent.countDocuments({ sellerId, type: 'add_to_cart' }),
      AnalyticsEvent.countDocuments({ sellerId, type: 'initiate_checkout' }),
      AnalyticsEvent.countDocuments({ sellerId, type: 'purchase' })
    ]);

    res.status(200).json({
      success: true,
      funnel: {
        views,
        cart,
        checkout,
        purchase
      }
    });
  } catch (error) {
    console.error('Get Funnel Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error querying analytics funnel'
    });
  }
};
