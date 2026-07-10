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
      trim: true,
      index: true
    },
    subcategory: {
      type: String,
      trim: true,
      default: 'General'
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
    images: {
      type: [String],
      default: []
    },
    videoUrl: {
      type: String,
      default: ''
    },
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String },
        askedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        answeredAt: { type: Date }
      }
    ],
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
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
      default: 'pending',
      index: true
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
    },
    sizes: {
      type: [String],
      default: []
    },
    colors: {
      type: [String],
      default: []
    },
    shortTitle: {
      type: String,
      trim: true
    },
    slug: {
      type: String,
      trim: true
    },
    bulletFeatures: {
      type: [String],
      default: []
    },
    highlights: {
      type: String,
      trim: true
    },
    packageContents: {
      type: String,
      trim: true
    },
    warrantyInfo: {
      type: String,
      trim: true
    },
    countryOfOrigin: {
      type: String,
      trim: true
    },
    manufacturer: {
      type: String,
      trim: true
    },
    modelNumber: {
      type: String,
      trim: true
    },
    barcode: {
      type: String,
      trim: true
    },
    mrp: {
      type: Number
    },
    tax: {
      type: Number
    },
    hsnCode: {
      type: String,
      trim: true
    },
    moq: {
      type: Number,
      default: 1
    },
    maxOrderQty: {
      type: Number
    },
    stockStatus: {
      type: String,
      enum: ['in-stock', 'low-stock', 'out-of-stock', 'backorder'],
      default: 'in-stock'
    },
    warehouse: {
      type: String,
      trim: true
    },
    lowStockAlert: {
      type: Number,
      default: 10
    },
    backorderAllowed: {
      type: Boolean,
      default: false
    },
    images360: {
      type: [String],
      default: []
    },
    thumbnail: {
      type: String,
      default: ''
    },
    weight: {
      type: Number
    },
    length: {
      type: Number
    },
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    shippingCharges: {
      type: Number,
      default: 0
    },
    freeShipping: {
      type: Boolean,
      default: false
    },
    deliveryTime: {
      type: String,
      trim: true
    },
    dynamicAttributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    seoTitle: {
      type: String,
      trim: true
    },
    metaDescription: {
      type: String,
      trim: true
    },
    metaKeywords: {
      type: [String],
      default: []
    },
    canonicalUrl: {
      type: String,
      trim: true
    },
    altText: {
      type: String,
      trim: true
    },
    variants: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to calculate status from stock count
productSchema.pre('save', function (next) {
  const alertThreshold = this.lowStockAlert !== undefined ? this.lowStockAlert : 10;
  if (this.stock === 0) {
    if (this.backorderAllowed) {
      this.status = 'low-stock';
      this.stockStatus = 'backorder';
    } else {
      this.status = 'out-of-stock';
      this.stockStatus = 'out-of-stock';
    }
  } else if (this.stock <= alertThreshold) {
    this.status = 'low-stock';
    this.stockStatus = 'low-stock';
  } else {
    this.status = 'in-stock';
    this.stockStatus = 'in-stock';
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
