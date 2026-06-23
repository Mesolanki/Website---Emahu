const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true
    },
    billId: {
      type: String
    },
    sellerId: {
      type: String,
      required: true
    },
    sellerEmail: {
      type: String
    },
    userId: {
      type: String,
      required: true
    },
    date: {
      type: String,
      required: true
    },
    items: [
      {
        productId: {
          type: String,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        price: {
          type: Number,
          required: true
        },
        quantity: {
          type: Number,
          required: true
        },
        brand: {
          type: String
        },
        img: {
          type: String
        },
        seller: {
          type: mongoose.Schema.Types.Mixed
        }
      }
    ],
    total: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: [
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'READY_FOR_PICKUP',
        'DELIVERY_ASSIGNED',
        'LABEL_GENERATED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'ARRIVED',
        'DELIVERED',
        'COMPLETED',
        '⚠️ VAULT DISPUTED / FROZEN',
        '🔓 FUNDS RELEASED',
        '❌ Order Rejected by Seller'
      ],
      default: 'PENDING_APPROVAL'
    },
    timeline: [
      {
        status: String,
        label: String,
        desc: String,
        date: String
      }
    ],
    sellerLocation: {
      shopName: String,
      latitude: Number,
      longitude: Number,
      address: String
    },
    buyerLocation: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    distanceKm: {
      type: Number
    },
    deliveryCharge: {
      type: Number
    },
    productAmount: {
      type: Number
    },
    totalPaid: {
      type: Number
    },
    deliveryAddress: {
      fullName: String,
      phone: String,
      email: String,
      address: String,
      city: String,
      stateName: String,
      pincode: String
    },
    shippingSpeed: {
      type: String
    },
    escrowMethod: {
      type: String
    },
    carrier: String,
    carrierPhone: String,
    trackingId: String,
    deliveryCost: Number,
    estDays: String,
    shipmentId: String,
    packageWeight: String,
    rejectionReason: String,
    sellerConfirmed: Boolean,
    sellerRejected: Boolean,
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveryStatus: {
      type: String,
      enum: ['unassigned', 'assigned', 'accepted', 'rejected', 'picked_up', 'in_transit', 'out_for_delivery', 'arrived', 'delivered'],
      default: 'unassigned'
    },
    deliveryPhoto: {
      type: String,
      default: ''
    },
    deliveredAt: {
      type: Date
    },
    couponCode: {
      type: String,
      default: ''
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'released'],
      default: 'unpaid'
    },
    transactionFile: {
      type: String,
      default: ''
    },
    transactionDate: {
      type: Date
    },
    // --- Payment Release Fields ---
    paymentReleased: {
      type: Boolean,
      default: false
    },
    paymentReleasedAt: {
      type: Date
    },
    platformFeePercent: {
      type: Number  // snapshot of the % applied at time of release
    },
    platformFeeAmount: {
      type: Number  // ₹ amount deducted as Emahu commission
    },
    sellerNetPayout: {
      type: Number  // amount seller actually receives
    },
    penaltyAmount: {
      type: Number,
      default: 0
    },
    penaltyReason: {
      type: String,
      default: ''
    },
    deliveryOtp: {
      type: String
    },
    deliveryOtpExpiry: {
      type: Date
    },
    deliveryOtpAttempts: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Order', orderSchema);
