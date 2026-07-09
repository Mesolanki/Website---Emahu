const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      trim: true
    },
    slug: {
      type: String,
      required: true,
      trim: true
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'approved'],
      default: 'approved'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false  // Optional: allows seeding without a user context
    },
    brands: {
      type: [String],
      default: []
    },
    attributes: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    specifications: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    validationRules: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    shippingTemplate: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    seoTemplate: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    icon: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      default: 0
    },
    isEnabled: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual for exposing `id`
categorySchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Category', categorySchema);
