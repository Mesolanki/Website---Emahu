const mongoose = require('mongoose');

const deliveryAssignmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true
    },
    sellerId: {
      type: String,
      required: true
    },
    buyerId: {
      type: String,
      required: true
    },
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    distance: {
      type: Number
    },
    deliveryCharge: {
      type: Number
    },
    currentStatus: {
      type: String,
      enum: ['assigned', 'accepted', 'rejected', 'picked_up', 'in_transit', 'out_for_delivery', 'arrived', 'delivered'],
      default: 'assigned'
    },
    deliveryPhoto: {
      type: String,
      default: ''
    },
    createdDate: {
      type: Date,
      default: Date.now
    },
    deliveredDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
