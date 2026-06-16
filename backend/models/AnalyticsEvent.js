const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['view', 'add_to_cart', 'initiate_checkout', 'purchase']
    },
    productId: {
      type: String
    },
    sellerId: {
      type: String,
      required: true
    },
    userId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Add index for fast querying by sellerId and type
analyticsEventSchema.index({ sellerId: 1, type: 1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
