const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product title'],
      trim: true,
      maxlength: [100, 'Product name cannot be more than 100 characters']
    },
    brand: {
      type: String,
      trim: true,
      default: 'Emahu Brand'
    },
    sku: {
      type: String,
      required: [true, 'Please provide a SKU identifier'],
      unique: true,
      trim: true,
      uppercase: true
    },
    category: {
      type: String,
      required: [true, 'Please provide a merchandise category'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: [0, 'Price must be a positive number']
    },
    comparePrice: {
      type: Number,
      min: [0, 'Compare price must be a positive number']
    },
    stock: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      min: [0, 'Stock count cannot be negative'],
      default: 0
    },
    description: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      default: '📦'
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sales: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['in-stock', 'low-stock', 'out-of-stock'],
      default: 'in-stock'
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'changes_requested'],
      default: 'pending'
    },
    adminCode: {
      type: String
    },
    rejectionReason: {
      type: String
    },
    approvalAttempts: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to calculate status from stock count
productSchema.pre('save', function (next) {
  if (this.stock === 0) {
    this.status = 'out-of-stock';
  } else if (this.stock <= 10) {
    this.status = 'low-stock';
  } else {
    this.status = 'in-stock';
  }
  next();
});

// Configure virtual toJSON fields to expose `id` alongside `_id`
productSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Product', productSchema);
