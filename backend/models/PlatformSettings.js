const mongoose = require('mongoose');

/**
 * PlatformSettings — Singleton document for global Emahu platform configuration.
 * Only ONE document should ever exist (docId: 'global').
 */
const platformSettingsSchema = new mongoose.Schema(
  {
    docId: {
      type: String,
      default: 'global',
      unique: true
    },
    platformFeePercent: {
      type: Number,
      default: 4, // 4% Emahu commission
      min: 0,
      max: 100
    },
    platformFeeName: {
      type: String,
      default: 'Emahu Platform Fee'
    },
    lastUpdatedBy: {
      type: String, // admin email
      default: ''
    },
    feeHistory: [
      {
        oldPercent: Number,
        newPercent: Number,
        changedBy: String,
        changedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
