const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Please provide a coupon code'],
      unique: true,
      trim: true,
      uppercase: true
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: [true, 'Please specify discount type (percentage or flat)']
    },
    value: {
      type: Number,
      required: [true, 'Please provide the discount value']
    },
    minCartValue: {
      type: Number,
      default: 0
    },
    maxDiscount: {
      type: Number
    },
    expiryDate: {
      type: Date,
      required: [true, 'Please provide an expiry date']
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual for exposing `id`
couponSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Coupon', couponSchema);
