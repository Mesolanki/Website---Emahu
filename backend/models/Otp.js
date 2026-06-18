const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      trim: true,
      lowercase: true
    },
    otp: {
      type: String,
      required: [true, 'Please provide an OTP code']
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Create a TTL index to delete the document after expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
