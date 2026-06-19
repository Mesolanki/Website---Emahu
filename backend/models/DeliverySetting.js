const mongoose = require('mongoose');

const deliverySettingSchema = new mongoose.Schema(
  {
    maxDeliveryDistance: {
      type: Number,
      default: 100
    },
    freeShippingThreshold: {
      type: Number,
      default: 0
    },
    expressDeliverySurcharge: {
      type: Number,
      default: 100
    },
    slabs: [
      {
        fromKm: {
          type: Number,
          required: true
        },
        toKm: {
          type: Number,
          required: true
        },
        charge: {
          type: Number,
          required: true
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DeliverySetting', deliverySettingSchema);
