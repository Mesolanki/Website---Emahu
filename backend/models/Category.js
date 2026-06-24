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
