const mongoose = require('mongoose');

const deliveryTrackingSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryAssignment'
    },
    orderId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      type: String
    },
    remarks: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DeliveryTracking', deliveryTrackingSchema);
