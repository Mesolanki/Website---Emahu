const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    otp: {
      type: String,
      required: [true, 'Please provide an OTP code']
    },
    expiresAt: {
      type: Date,
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastSentAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Create a TTL index to delete the document after expiresAt plus 1 hour (3600 seconds)
// This cleans the DB while preventing clock skew issues. Strict 5-min expiration is checked in JS code.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('Otp', otpSchema);
