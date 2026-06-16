const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*\.\w{2,3}$/,
        'Please provide a valid email'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Exclude from queries by default for safety
    },
    role: {
      type: String,
      enum: {
        values: ['buyer', 'seller', 'delivery', 'admin'],
        message: '{VALUE} is not a valid role. Allowed roles are: buyer, seller, delivery, admin'
      },
      default: 'buyer'
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    storeName: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    kycType: {
      type: String,
      enum: ['pan', 'aadhaar'],
      default: 'pan'
    },
    kycNumber: {
      type: String,
      trim: true
    },
    bankHolder: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    ifscCode: {
      type: String,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    gstNumber: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'more_info_requested'],
      default: 'approved'
    },
    verificationFeedback: {
      type: String,
      default: ''
    },
    twoFactorSecret: {
      type: String,
      select: false
    },
    isTwoFactorEnabled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Encrypt password using bcrypt before saving user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user-entered password to hashed password in database
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
