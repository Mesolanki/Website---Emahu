const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { verifyTOTP } = require('../utils/totp');

// Helper to generate access and refresh tokens, and send response
const sendTokenResponse = async (user, statusCode, req, res) => {
  // Generate Access Token (short-lived: 15 minutes)
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Generate Refresh Token (long-lived: 7 days)
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'emahu_super_secret_refresh_key_2026';
  const refreshTokenString = jwt.sign(
    { id: user._id, nonce: Math.random().toString(36).substring(2) },
    refreshSecret,
    { expiresIn: '7d' }
  );

  // Set expiry date (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Get user-agent and IP address details
  const device = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown IP';

  // Store refresh token in database
  await RefreshToken.create({
    user: user._id,
    token: refreshTokenString,
    expiresAt,
    device,
    ipAddress
  });

  // HTTP-Only Cookie options for top-tier security
  const cookieOptions = {
    httpOnly: true,
    expires: expiresAt,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies only on HTTPS in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
  };

  // Return Response
  return res
    .status(statusCode)
    .cookie('refreshToken', refreshTokenString, cookieOptions)
    .json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        storeName: user.storeName,
        category: user.category,
        status: user.status
      }
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      storeName,
      category,
      kycType,
      kycNumber,
      bankHolder,
      accountNumber,
      ifscCode,
      bankName,
      gstNumber,
      city,
      state,
      perItemCharge,
      deliveryScope,
      operatingLocation,
      dispatchNotes
    } = req.body;

    // Simple validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter name, email, and password'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'buyer',
      phone,
      isEmailVerified: (role === 'seller'),
      isPhoneVerified: (role === 'seller'),
      address,
      storeName,
      category,
      kycType,
      kycNumber,
      bankHolder,
      accountNumber,
      ifscCode,
      bankName,
      gstNumber,
      city,
      state,
      perItemCharge,
      deliveryScope,
      operatingLocation,
      dispatchNotes,
      status: (role === 'seller' || role === 'delivery') ? 'pending' : 'approved'
    });

    // Notify all admins of new seller registration
    if (role === 'seller') {
      const admins = await User.find({ role: 'admin' });
      const Notification = require('../models/Notification');
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          title: 'New Seller Registration',
          message: `Seller "${name}" (${storeName || 'N/A'}) has registered and is pending approval.`,
          type: 'info'
        });
      }
    }

    // Notify all admins of new delivery partner registration
    if (role === 'delivery') {
      const admins = await User.find({ role: 'admin' });
      const Notification = require('../models/Notification');
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          title: 'New Delivery Partner Registration',
          message: `Delivery partner "${name}" (${operatingLocation || 'N/A'}) has registered and is pending approval.`,
          type: 'info'
        });
      }
    }

    // Send JWT and store refresh session
    await sendTokenResponse(user, 201, req, res);
  } catch (error) {
    console.error('Registration Error:', error);

    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages[0]
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Server Error during registration'
    });
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    // Simple validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Check if user exists (include password and 2fa secret)
    const user = await User.findOne({ email }).select('+password +twoFactorSecret');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check status if role is seller
    if (user.role === 'seller' && user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: 'Your seller account has been rejected by administration. Please contact support.'
      });
    }

    // Check if 2FA is active
    if (user.isTwoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({
          success: true,
          requires2FA: true,
          message: 'Admin 2FA verification code required'
        });
      }
      
      const is2FAVerified = verifyTOTP(user.twoFactorSecret, twoFactorCode);
      if (!is2FAVerified) {
        return res.status(401).json({
          success: false,
          error: 'Invalid 2FA verification code'
        });
      }
    }

    // Send JWT and store refresh session
    await sendTokenResponse(user, 200, req, res);
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error during login: ' + error.message,
      stack: error.stack
    });
  }
};

// @desc    Authenticate user via Google (OAuth Simulation / JWT parsing)
// @route   POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res) => {
  try {
    const { email, name, role, idToken } = req.body;
    let finalEmail = email;
    let finalName = name;

    if (idToken) {
      const { OAuth2Client } = require('google-auth-library');
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      try {
        const client = new OAuth2Client(googleClientId);
        const ticket = await client.verifyIdToken({
          idToken: idToken,
          audience: googleClientId,
        });
        const payload = ticket.getPayload();
        finalEmail = payload.email;
        finalName = payload.name || payload.given_name || payload.email.split('@')[0];
        console.log('Verified Google ID Token successfully for:', finalEmail);
      } catch (tokenErr) {
        console.error('ID Token verification failed, checking tokeninfo endpoint:', tokenErr.message);
        try {
          const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
          const tokenInfo = await verifyRes.json();
          if (tokenInfo.email) {
            finalEmail = tokenInfo.email;
            finalName = tokenInfo.name || tokenInfo.email.split('@')[0];
            console.log('Verified Google ID Token via tokeninfo fallback:', finalEmail);
          } else {
            return res.status(400).json({
              success: false,
              error: 'Invalid Google ID Token: ' + (tokenInfo.error_description || 'unknown error')
            });
          }
        } catch (fetchErr) {
          return res.status(400).json({
            success: false,
            error: 'Google authentication failed: ' + tokenErr.message
          });
        }
      }
    }

    if (!finalEmail) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid Google email'
      });
    }

    // Find if user exists
    let user = await User.findOne({ email: finalEmail });

    if (!user) {
      console.log(`Google user not found: ${finalEmail}. Returning exists: false for registration completion.`);
      return res.status(200).json({
        success: true,
        exists: false,
        email: finalEmail,
        name: finalName
      });
    }

    // Check if the existing user's role matches the requested role
    if (role && user.role !== role) {
      console.warn(`Role mismatch: existing user has role '${user.role}' but requested role is '${role}'`);
      return res.status(403).json({
        success: false,
        error: `Access denied. This email is already registered as a ${user.role}. Please log in using the correct portal.`
      });
    }

    console.log(`Google user found: ${user.name} (${user.email}). Logging in directly.`);
    // Send JWT and store refresh session
    await sendTokenResponse(user, 200, req, res);
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error during Google authentication'
    });
  }
};


// @desc    Refresh session and get a new access token (Refresh Token Rotation)
// @route   POST /api/auth/refresh
// @access  Public
exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed: No refresh session cookie found'
      });
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'emahu_super_secret_refresh_key_2026';

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
    } catch (err) {
      // Clear invalid cookie
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        error: 'Authentication failed: Invalid or expired session'
      });
    }

    // Find token in database
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      // Reuse detection or revoked session: clear cookie
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        error: 'Authentication failed: Session has been logged out or revoked'
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed: User no longer exists'
      });
    }

    // Delete the old refresh token (Rotation!)
    await storedToken.deleteOne();

    // Send new access token and rotated refresh token
    await sendTokenResponse(user, 200, req, res);
  } catch (error) {
    console.error('Refresh Session Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error during token refresh'
    });
  }
};

// @desc    Logout user & invalidate session
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Remove refresh token from database so it is revoked permanently
      await RefreshToken.findOneAndDelete({ token: refreshToken });
    }

    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
    });

    return res.status(200).json({
      success: true,
      message: 'Successfully logged out and session revoked'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error during logout'
    });
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        address: req.user.address,
        storeName: req.user.storeName,
        category: req.user.category,
        kycType: req.user.kycType,
        kycNumber: req.user.kycNumber,
        bankHolder: req.user.bankHolder,
        accountNumber: req.user.accountNumber,
        ifscCode: req.user.ifscCode,
        bankName: req.user.bankName,
        gstNumber: req.user.gstNumber,
        status: req.user.status,
        latitude: req.user.latitude,
        longitude: req.user.longitude,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error getting user profile'
    });
  }
};

// @desc    Update user profile details
// @route   PUT /api/auth/update-details
// @access  Private
exports.updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name || req.user.name,
      phone: req.body.phone !== undefined ? req.body.phone : req.user.phone,
      address: req.body.address !== undefined ? req.body.address : req.user.address,
      city: req.body.city !== undefined ? req.body.city : req.user.city,
      state: req.body.state !== undefined ? req.body.state : req.user.state,
      storeName: req.body.storeName !== undefined ? req.body.storeName : req.user.storeName,
      latitude: req.body.latitude !== undefined ? req.body.latitude : req.user.latitude,
      longitude: req.body.longitude !== undefined ? req.body.longitude : req.user.longitude
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    return res.status(200).json({
      success: true,
      message: 'Profile details updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        storeName: user.storeName,
        latitude: user.latitude,
        longitude: user.longitude
      }
    });
  } catch (error) {
    console.error('Update Details Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error during profile update'
    });
  }
};

// @desc    Update user password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new passwords'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }

    // Get user from DB with password included
    const user = await User.findById(req.user.id).select('+password');

    // Check if current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Set and save new password (pre-save hook will encrypt it automatically)
    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update Password Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error during password update'
    });
  }
};

// @desc    Get all sellers for admin review
// @route   GET /api/auth/admin/sellers
// @access  Private (Admin only)
exports.getSellers = async (req, res) => {
  try {
    const Product = require('../models/Product');
    const Order = require('../models/Order');
    const SellerDocument = require('../models/SellerDocument');

    const sellers = await User.find({ role: 'seller' }).lean();

    // Fetch all products, count orders, and get all seller documents in parallel
    const [allProducts, orderCounts, allDocs] = await Promise.all([
      Product.find({}).lean(),
      Order.aggregate([
        { $group: { _id: "$sellerId", count: { $sum: 1 } } }
      ]),
      SellerDocument.find({}).lean()
    ]);

    // Create maps for fast lookup
    const orderCountMap = {};
    orderCounts.forEach(item => {
      if (item._id) {
        orderCountMap[item._id.toString()] = item.count;
      }
    });

    const sellerProductsMap = {};
    allProducts.forEach(p => {
      if (p.seller) {
        const sId = p.seller.toString();
        if (!sellerProductsMap[sId]) {
          sellerProductsMap[sId] = [];
        }
        sellerProductsMap[sId].push(p);
      }
    });

    const sellerDocsMap = {};
    allDocs.forEach(doc => {
      if (doc.seller) {
        const sId = doc.seller.toString();
        if (!sellerDocsMap[sId]) {
          sellerDocsMap[sId] = [];
        }
        sellerDocsMap[sId].push(doc);
      }
    });

    for (let i = 0; i < sellers.length; i++) {
      const sellerIdStr = sellers[i]._id.toString();
      const productsList = sellerProductsMap[sellerIdStr] || [];

      sellers[i].totalProducts = productsList.length;
      sellers[i].totalSales = productsList.reduce((acc, p) => acc + (p.sales || 0), 0);
      sellers[i].totalRevenue = productsList.reduce((acc, p) => acc + (p.price * (p.sales || 0)), 0);
      sellers[i].totalOrders = orderCountMap[sellerIdStr] || 0;
      sellers[i].products = productsList;
      sellers[i].documents = sellerDocsMap[sellerIdStr] || [];
    }

    res.status(200).json({
      success: true,
      sellers
    });
  } catch (error) {
    console.error('Get Sellers Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving sellers list'
    });
  }
};

// @desc    Admin approve or reject seller account
// @route   PUT /api/auth/admin/sellers/:id/decision
// @access  Private (Admin only)
exports.sellerDecision = async (req, res) => {
  try {
    const { decision, feedback } = req.body; // 'approve', 'reject', 'more_info_requested'
    const seller = await User.findById(req.params.id);
    
    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    if (decision === 'approve') {
      seller.status = 'approved';
      seller.verificationFeedback = '';
    } else if (decision === 'reject') {
      seller.status = 'rejected';
      seller.verificationFeedback = feedback || '';
    } else if (decision === 'more_info_requested') {
      seller.status = 'more_info_requested';
      seller.verificationFeedback = feedback || '';
    } else {
      return res.status(400).json({ success: false, error: 'Invalid decision type' });
    }

    await seller.save();

    // Create notification for seller
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: seller._id,
      title: `Store Account ${seller.status === 'approved' ? 'Approved' : seller.status === 'rejected' ? 'Rejected' : 'Action Required'}`,
      message: seller.status === 'approved'
        ? 'Congratulations! Your seller store account has been approved. You can now list products.'
        : `Seller Verification Status: ${seller.status.replace(/_/g, ' ')}. Admin Feedback: ${feedback || 'None'}`,
      type: seller.status === 'approved' ? 'success' : 'warning'
    });

    // Create Audit Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      admin: req.user._id,
      action: `DECISION_SELLER_${seller.status.toUpperCase()}`,
      targetType: 'User',
      targetId: seller._id,
      details: { decision, feedback }
    });

    // Send Email to seller
    try {
      const sendEmail = require('../utils/sendEmail');
      let emailSubject = '';
      let emailText = '';
      
      if (seller.status === 'approved') {
        emailSubject = 'Congratulations! Your Emahu Seller Store Account is Approved';
        emailText = `Hello ${seller.name},\n\nWe are excited to inform you that your seller account for store "${seller.storeName}" has been approved by the EMAHU admin team!\n\nYou can now log in to the Emahu Seller Dashboard and start listing your products for sale.\n\nBest regards,\nThe Emahu Team`;
      } else if (seller.status === 'rejected') {
        emailSubject = 'Update regarding your Emahu Seller Store Account Registration';
        emailText = `Hello ${seller.name},\n\nThank you for your interest in registering as a seller on EMAHU. After reviewing your store details and documents, our administration team has rejected your application.\n\nReason/Feedback: ${feedback || 'None provided.'}\n\nPlease review the feedback and resubmit your details with corrected documents if applicable.\n\nBest regards,\nThe Emahu Team`;
      } else if (seller.status === 'more_info_requested') {
        emailSubject = 'Action Required: More Information Requested for your Emahu Seller Account';
        emailText = `Hello ${seller.name},\n\nOur admin team reviewed your registration for store "${seller.storeName}" and requires more information to proceed.\n\nAdmin Feedback/Request: ${feedback || 'None provided.'}\n\nPlease log in to your seller dashboard and provide the requested details.\n\nBest regards,\nThe Emahu Team`;
      }

      if (emailSubject) {
        await sendEmail({
          to: seller.email,
          subject: emailSubject,
          text: emailText
        });
      }
    } catch (mailErr) {
      console.error('Failed to send status update email to seller:', mailErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Seller status updated to ${seller.status} successfully`,
      seller
    });
  } catch (error) {
    console.error('Seller Decision Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== 2FA CONTROLLERS ====================

// @desc    Generate 2FA secret for setup
// @route   GET /api/auth/admin/2fa/setup
// @access  Private (Admin only)
exports.setup2FA = async (req, res) => {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    const otpauthUrl = `otpauth://totp/EMAHU:${req.user.email}?secret=${secret}&issuer=EMAHU`;
    res.status(200).json({
      success: true,
      secret,
      otpauthUrl
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({ success: false, error: 'Server error setting up 2FA' });
  }
};

// @desc    Verify and enable 2FA
// @route   POST /api/auth/admin/2fa/verify
// @access  Private (Admin only)
exports.verify2FA = async (req, res) => {
  try {
    const { secret, code } = req.body;
    if (!secret || !code) {
      return res.status(400).json({ success: false, error: 'Please provide secret and verification code' });
    }

    const isVerified = verifyTOTP(secret, code);
    if (!isVerified) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    // Enable 2FA on the user account
    const user = await User.findById(req.user._id);
    user.twoFactorSecret = secret;
    user.isTwoFactorEnabled = true;
    await user.save();

    // Log to Audit Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      admin: req.user._id,
      action: 'ENABLE_2FA',
      targetType: 'User',
      targetId: req.user._id,
      details: { enabled: true }
    });

    res.status(200).json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Disable 2FA
// @route   POST /api/auth/admin/2fa/disable
// @access  Private (Admin only)
exports.disable2FA = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Please provide verification code' });
    }

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user.isTwoFactorEnabled) {
      return res.status(400).json({ success: false, error: '2FA is not enabled' });
    }

    const isVerified = verifyTOTP(user.twoFactorSecret, code);
    if (!isVerified) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    // Log to Audit Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      admin: req.user._id,
      action: 'DISABLE_2FA',
      targetType: 'User',
      targetId: req.user._id,
      details: { enabled: false }
    });

    res.status(200).json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== SELLER DOCUMENTS CONTROLLERS ====================

// @desc    Upload seller document references
// @route   POST /api/auth/seller/documents
// @access  Private (Seller only)
exports.uploadDocument = async (req, res) => {
  try {
    const { documentType, fileUrl } = req.body;
    if (!documentType || !fileUrl) {
      return res.status(400).json({ success: false, error: 'Please provide documentType and fileUrl' });
    }

    const SellerDocument = require('../models/SellerDocument');
    
    // Check if document of this type already exists, if so overwrite or update
    let doc = await SellerDocument.findOne({ seller: req.user._id, documentType });
    if (doc) {
      doc.fileUrl = fileUrl;
      doc.status = 'pending';
      doc.feedback = '';
      await doc.save();
    } else {
      doc = await SellerDocument.create({
        seller: req.user._id,
        documentType,
        fileUrl,
        status: 'pending'
      });
    }

    // Update seller status back to pending if they were in more_info_requested
    if (req.user.status === 'more_info_requested') {
      const user = await User.findById(req.user._id);
      user.status = 'pending';
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully and verification is pending.',
      document: doc
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get seller's own documents
// @route   GET /api/auth/seller/documents
// @access  Private (Seller only)
exports.getOwnDocuments = async (req, res) => {
  try {
    const SellerDocument = require('../models/SellerDocument');
    const documents = await SellerDocument.find({ seller: req.user._id });
    res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Admin view seller documents
// @route   GET /api/auth/admin/sellers/:id/documents
// @access  Private (Admin only)
exports.getSellerDocumentsForAdmin = async (req, res) => {
  try {
    const SellerDocument = require('../models/SellerDocument');
    const documents = await SellerDocument.find({ seller: req.params.id });
    res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error('Admin get seller documents error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Admin decide a single document status
// @route   PUT /api/auth/admin/sellers/:id/documents/:docId
// @access  Private (Admin only)
exports.verifySellerDocument = async (req, res) => {
  try {
    const { status, feedback } = req.body; // 'approved' | 'rejected'
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status type. Allowed: approved, rejected' });
    }

    const SellerDocument = require('../models/SellerDocument');
    const doc = await SellerDocument.findById(req.params.docId);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    doc.status = status;
    doc.feedback = feedback || '';
    await doc.save();

    // Auto-approve seller account if both required documents are approved
    if (status === 'approved') {
      const allDocs = await SellerDocument.find({ seller: doc.seller });
      const businessReg = allDocs.find(d => d.documentType === 'business_registration');
      const idProof = allDocs.find(d => d.documentType === 'id_proof');
      
      const isBusinessRegApproved = businessReg && (businessReg._id.equals(doc._id) ? status === 'approved' : businessReg.status === 'approved');
      const isIdProofApproved = idProof && (idProof._id.equals(doc._id) ? status === 'approved' : idProof.status === 'approved');
      
      if (isBusinessRegApproved && isIdProofApproved) {
        const User = require('../models/User');
        await User.findByIdAndUpdate(doc.seller, { status: 'approved', verificationFeedback: '' });
      }
    }

    // Log admin action to AuditLog
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      admin: req.user._id,
      action: `VERIFY_DOCUMENT_${status.toUpperCase()}`,
      targetType: 'SellerDocument',
      targetId: doc._id,
      details: { status, feedback, documentType: doc.documentType }
    });

    res.status(200).json({
      success: true,
      message: `Document status set to ${status} successfully.`,
      document: doc
    });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all delivery partners for admin review
// @route   GET /api/auth/admin/delivery-partners
// @access  Private (Admin only)
exports.getDeliveryPartners = async (req, res) => {
  try {
    const deliveryPartners = await User.find({ role: 'delivery' }).lean();
    res.status(200).json({
      success: true,
      deliveryPartners
    });
  } catch (error) {
    console.error('Get Delivery Partners Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving delivery partners list'
    });
  }
};

// @desc    Admin approve or reject delivery partner account
// @route   PUT /api/auth/admin/delivery-partners/:id/decision
// @access  Private (Admin only)
exports.deliveryPartnerDecision = async (req, res) => {
  try {
    const { decision, feedback } = req.body; // 'approve', 'reject'
    const partner = await User.findById(req.params.id);
    
    if (!partner || partner.role !== 'delivery') {
      return res.status(404).json({ success: false, error: 'Delivery partner not found' });
    }

    if (decision === 'approve') {
      partner.status = 'approved';
      partner.verificationFeedback = '';
    } else if (decision === 'reject') {
      partner.status = 'rejected';
      partner.verificationFeedback = feedback || '';
    } else {
      return res.status(400).json({ success: false, error: 'Invalid decision type' });
    }

    await partner.save();

    // Create Notification for the delivery partner
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: partner._id,
      title: `Delivery Partner Account ${partner.status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: partner.status === 'approved'
        ? 'Congratulations! Your delivery partner account has been approved.'
        : `Delivery Verification Status: rejected. Admin Feedback: ${feedback || 'None'}`,
      type: partner.status === 'approved' ? 'success' : 'warning'
    });

    // Create Audit Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      admin: req.user._id,
      action: `DECISION_DELIVERY_${partner.status.toUpperCase()}`,
      targetType: 'User',
      targetId: partner._id,
      details: { decision, feedback }
    });

    res.status(200).json({
      success: true,
      message: `Delivery partner status updated to ${partner.status} successfully`,
      deliveryPartner: partner
    });
  } catch (error) {
    console.error('Delivery Partner Decision Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get approved delivery partners for seller selection
// @route   GET /api/auth/delivery-partners
// @access  Private
exports.getApprovedDeliveryPartners = async (req, res) => {
  try {
    const partners = await User.find({ role: 'delivery', status: 'approved' }).lean();
    res.status(200).json({
      success: true,
      partners
    });
  } catch (error) {
    console.error('Get Approved Delivery Partners Error:', error);
    res.status(500).json({ success: false, error: 'Server error fetching delivery partners' });
  }
};

// @desc    Send OTP code to email
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide an email address' });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Check if a registered user already exists with this email
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user with this email already exists' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    const Otp = require('../models/Otp');
    
    // Delete any old OTP for this email
    await Otp.deleteMany({ email: cleanEmail });

    // Save new OTP
    await Otp.create({
      email: cleanEmail,
      otp: otpCode,
      expiresAt
    });

    // Send email using Nodemailer utility in the background
    const sendEmail = require('../utils/sendEmail');
    sendEmail({
      to: cleanEmail,
      subject: 'EMAHU Account Registration Verification Code',
      text: `Hello,\n\nThank you for choosing EMAHU. Your 6-digit verification code is:\n\n🔑 ${otpCode}\n\nPlease enter this code to confirm your email and complete your registration.\n\nBest regards,\nThe Emahu Team`
    }).catch(err => console.error('Background sendEmail error:', err));

    const host = process.env.EMAIL_HOST || '';
    const user = process.env.EMAIL_USER || '';
    const pass = process.env.EMAIL_PASS || '';
    const isSimulated = !host || !user || !pass;

    res.status(200).json({
      success: true,
      message: `OTP verification email sent successfully to ${cleanEmail}.`,
      ...(isSimulated && process.env.NODE_ENV === 'development' && { devOtp: otpCode })
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, error: 'Server error while sending OTP' });
  }
};

// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Please provide both email and OTP code' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpCode = otp.trim();

    const Otp = require('../models/Otp');

    const otpRecord = await Otp.findOne({ email: cleanEmail });
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'OTP has expired or does not exist. Please request a new one.' });
    }

    // Strict Javascript validation to prevent database TTL index clock skew issues
    if (otpRecord.expiresAt && new Date(otpRecord.expiresAt) < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    if (otpRecord.otp !== otpCode) {
      return res.status(400).json({ success: false, error: 'Invalid OTP code. Please try again.' });
    }

    // OTP verified successfully - delete it so it can't be reused
    await Otp.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ success: false, error: 'Server error verifying OTP' });
  }
};

// @desc    Send OTP code to mobile phone
// @route   POST /api/auth/send-phone-otp
// @access  Public
exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a phone number' });
    }

    const cleanPhone = phone.trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid 10-digit phone number' });
    }

    // Check if user with this phone already exists
    const existingUser = await User.findOne({ phone: cleanPhone });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user with this phone number already exists' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    const Otp = require('../models/Otp');
    
    // Delete any old OTP for this phone
    await Otp.deleteMany({ phone: cleanPhone });

    // Save new OTP
    await Otp.create({
      phone: cleanPhone,
      otp: otpCode,
      expiresAt
    });

    // Call sendSms utility to send real SMS in the background
    const sendSms = require('../utils/sendSms');
    sendSms({
      to: cleanPhone,
      body: `Your Emahu mobile verification code is: ${otpCode}. Valid for 5 minutes.`
    }).catch(err => console.error('Background sendSms error:', err));

    res.status(200).json({
      success: true,
      message: `OTP verification SMS sent successfully to ${cleanPhone}.`,
      ...(process.env.NODE_ENV === 'development' && { devOtp: otpCode })
    });
  } catch (error) {
    console.error('Send Phone OTP Error:', error);
    res.status(500).json({ success: false, error: 'Server error while sending phone OTP' });
  }
};

// @desc    Verify Phone OTP code
// @route   POST /api/auth/verify-phone-otp
// @access  Public
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Please provide both phone number and OTP code' });
    }

    const cleanPhone = phone.trim();
    const otpCode = otp.trim();

    const Otp = require('../models/Otp');

    const otpRecord = await Otp.findOne({ phone: cleanPhone });
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'OTP has expired or does not exist. Please request a new one.' });
    }

    // Strict Javascript validation to prevent database TTL index clock skew issues
    if (otpRecord.expiresAt && new Date(otpRecord.expiresAt) < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    if (otpRecord.otp !== otpCode) {
      return res.status(400).json({ success: false, error: 'Invalid OTP code. Please try again.' });
    }

    // OTP verified successfully - delete it
    await Otp.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: 'Phone OTP verified successfully'
    });
  } catch (error) {
    console.error('Verify Phone OTP Error:', error);
    res.status(500).json({ success: false, error: 'Server error verifying phone OTP' });
  }
};

