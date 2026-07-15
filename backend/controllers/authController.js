const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { verifyTOTP } = require('../utils/totp');

// Helper to generate access and refresh tokens, and send response
const sendTokenResponse = async (user, statusCode, req, res) => {
  // Generate Access Token (long-lived: 100 years)
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '36500d' }
  );

  // Generate Refresh Token (long-lived: 100 years)
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'emahu_super_secret_refresh_key_2026';
  const refreshTokenString = jwt.sign(
    { id: user._id, nonce: Math.random().toString(36).substring(2) },
    refreshSecret,
    { expiresIn: '36500d' }
  );

  // Set expiry date (100 years from now)
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 100);

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

function detectCityAndState(address) {
  if (!address || typeof address !== 'string') return { city: '', state: '' };
  const lower = address.toLowerCase();
  
  const list = [
    { city: 'Ahmedabad', state: 'Gujarat' },
    { city: 'Surat', state: 'Gujarat' },
    { city: 'Rajkot', state: 'Gujarat' },
    { city: 'Vadodara', state: 'Gujarat' },
    { city: 'Mumbai', state: 'Maharashtra' },
    { city: 'Pune', state: 'Maharashtra' },
    { city: 'Delhi', state: 'Delhi' },
    { city: 'Bangalore', state: 'Karnataka' },
    { city: 'Bengaluru', state: 'Karnataka' },
    { city: 'Chennai', state: 'Tamil Nadu' },
    { city: 'Kolkata', state: 'West Bengal' },
    { city: 'Hyderabad', state: 'Telangana' }
  ];
  
  for (const item of list) {
    if (lower.includes(item.city.toLowerCase())) {
      return { city: item.city, state: item.state };
    }
  }
  return { city: '', state: '' };
}

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
      rateUpTo2Km,
      rateAbove2Km,
      deliveryScope,
      operatingLocation,
      dispatchNotes,
      currentCity,
      currentArea,
      pincode,
      serviceRadius,
      vehicleType,
      vehicleNumber,
      latitude,
      longitude,
      salaryRequirement,
      serviceAreaCountry,
      serviceAreaRegion,
      serviceAreaDistrict,
      serviceAreaState,
      serviceAreaCity,
      adminSecret,
      perKmRate,
      coveredCities
    } = req.body;

    // Simple validation
    if (!name || (!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter name, phone number, and password'
      });
    }

    let finalEmail = email ? email.trim().toLowerCase() : '';
    if (!finalEmail && phone) {
      finalEmail = `${phone.trim()}@emahu.com`;
    }

    // Admin role authorization verification passcode check
    if (role === 'admin') {
      const allowedAdminSecret = process.env.ADMIN_SIGNUP_SECRET || 'emahu_admin_secret_key_2026';
      if (!adminSecret || adminSecret !== allowedAdminSecret) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Invalid or missing Admin Signup Authorization Key.'
        });
      }
    }

    // Check if phone or email OTP verification was completed (bypass only for Google registrations)
    const isGoogleReg = password && password.startsWith('GoogleAuthPass_');
    if (!isGoogleReg) {
      const Otp = require('../models/Otp');
      const queryPhone = phone ? phone.trim() : 'non_existent_phone_123';
      const otpRecord = await Otp.findOne({
        $or: [
          { phone: queryPhone },
          { email: finalEmail }
        ],
        isVerified: true
      });
      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          error: 'Please verify your phone number via OTP first before registering'
        });
      }
      // Delete the verified OTP record so it can't be reused
      await Otp.deleteMany({
        $or: [
          { phone: queryPhone },
          { email: finalEmail }
        ]
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: finalEmail, role });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email/phone already exists'
      });
    }

    // Auto-detect City and State for Sellers & Partners on registration
    let resolvedCity = city;
    let resolvedState = state;
    if (role === 'seller') {
      if (!resolvedCity || !resolvedState) {
        const detected = detectCityAndState(address || '');
        if (detected.city) {
          if (!resolvedCity) resolvedCity = detected.city;
          if (!resolvedState) resolvedState = detected.state;
        }
      }
    }

    let resolvedCurrentCity = currentCity;
    if (role === 'delivery') {
      if (!resolvedCurrentCity) {
        const detected = detectCityAndState(address || operatingLocation || '');
        if (detected.city) {
          resolvedCurrentCity = detected.city;
        }
      }
    }

    // Create user
    const user = await User.create({
      name,
      email: finalEmail,
      password,
      role: role || 'buyer',
      phone,
      isEmailVerified: true,
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
      city: resolvedCity,
      state: resolvedState,
      perItemCharge,
      rateUpTo2Km: rateUpTo2Km ? Number(rateUpTo2Km) : (perItemCharge ? Number(perItemCharge) : 10),
      rateAbove2Km: rateAbove2Km ? Number(rateAbove2Km) : (perItemCharge ? Number(perItemCharge) : 10),
      deliveryScope,
      operatingLocation,
      dispatchNotes,
      currentCity: resolvedCurrentCity,
      currentArea,
      pincode,
      serviceRadius,
      vehicleType,
      vehicleNumber,
      latitude,
      longitude,
      salaryRequirement,
      serviceAreaCountry,
      serviceAreaRegion,
      serviceAreaDistrict,
      serviceAreaState,
      serviceAreaCity,
      perKmRate,
      coveredCities,
      deliveryScope,
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
    const { email, password, twoFactorCode, role } = req.body;

    // Simple validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your phone number/email and password'
      });
    }

    // Check if user exists (include password and 2fa secret)
    let query = {};
    if (email.includes('@')) {
      query = { email: email.toLowerCase() };
    } else {
      const cleanPhone = email.trim();
      query = {
        $or: [
          { phone: cleanPhone },
          { email: `${cleanPhone}@emahu.com` }
        ]
      };
    }
    if (role) {
      query.role = role;
    }
    const user = await User.findOne(query).select('+password +twoFactorSecret');
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
        // Generate secure 6-digit OTP and save on user
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.otpCode = otpCode;
        user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
        user.otpAttempts = 0;
        await user.save();

        // Send verification code to email
        const sendEmail = require('../utils/sendEmail');
        const htmlContent = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 40px 32px; text-align: center; color: #ffffff;">
              <div style="font-size: 24px; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px;">EMAHU</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 1.8rem; font-weight: 700;">Admin 2FA Security Code</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 0.95rem;">Authorized Administrator Login Verification</p>
            </div>
            <div style="padding: 36px 32px; background: #ffffff;">
              <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 24px 0;">Hello,</p>
              <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 28px 0;">A login request was initiated for your Administrator account. Please enter the secure 6-digit verification code below to authorize access. This code is valid for <strong>5 minutes</strong>.</p>
              
              <div style="text-align: center; margin: 32px 0;">
                <div style="display: inline-block; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 16px 36px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4c1d95; font-family: monospace;">
                  ${otpCode}
                </div>
              </div>
    
              <p style="color: #64748b; font-size: 0.88rem; line-height: 1.6; margin: 28px 0 0 0;">If you did not request this login attempt, please secure your password immediately.</p>
            </div>
            <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 0.8rem;">
              <p style="margin: 0 0 4px 0;">Emahu Marketplace Inc.</p>
              <p style="margin: 0;">Securing premium local trade.</p>
            </div>
          </div>
        `;

        const emailResult = await sendEmail({
          to: user.email,
          subject: 'EMAHU Admin Login Verification Code',
          text: `Hello,\n\nYour 6-digit login verification code is: ${otpCode}\n\nThis code is valid for 5 minutes.\n\nRegards,\nThe Emahu Team`,
          html: htmlContent
        });

        if (!emailResult.success) {
          return res.status(500).json({ success: false, error: `Failed to send Admin 2FA verification email: ${emailResult.error}` });
        }

        return res.status(200).json({
          success: true,
          requires2FA: true,
          message: 'Admin 2FA verification code sent to your email',
          ...(process.env.NODE_ENV === 'development' ? { devOtp: otpCode } : {})
        });
      }
      
      let is2FAVerified = false;
      
      // Verify email OTP
      if (user.otpCode && user.otpExpiry && new Date() < user.otpExpiry) {
        if (user.otpCode === twoFactorCode) {
          is2FAVerified = true;
          user.otpCode = undefined;
          user.otpExpiry = undefined;
          user.otpAttempts = 0;
          await user.save();
        }
      }
      
      // Fallback to TOTP code
      if (!is2FAVerified && user.twoFactorSecret) {
        is2FAVerified = verifyTOTP(user.twoFactorSecret, twoFactorCode);
      }
      
      if (!is2FAVerified) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired 2FA verification code'
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
    let user = await User.findOne({ email: finalEmail, role: role || 'buyer' });

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
    if (role && user.role !== role && user.role !== 'admin') {
      console.warn(`Role mismatch: existing user has role '${user.role}' but requested role is '${role}'`);
      if (role === 'buyer') {
        return res.status(400).json({
          success: false,
          error: 'This email ID already exists.'
        });
      }
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
    // Auto-detect City and State for Sellers & Partners on update
    let resolvedCity = req.body.city !== undefined ? req.body.city : req.user.city;
    let resolvedState = req.body.state !== undefined ? req.body.state : req.user.state;
    if (req.user.role === 'seller' && (req.body.address !== undefined || req.body.city !== undefined || req.body.state !== undefined)) {
      if (!resolvedCity || !resolvedState) {
        const detected = detectCityAndState(req.body.address || req.user.address || '');
        if (detected.city) {
          if (!resolvedCity) resolvedCity = detected.city;
          if (!resolvedState) resolvedState = detected.state;
        }
      }
    }

    const fieldsToUpdate = {
      name: req.body.name || req.user.name,
      phone: req.body.phone !== undefined ? req.body.phone : req.user.phone,
      address: req.body.address !== undefined ? req.body.address : req.user.address,
      city: resolvedCity,
      state: resolvedState,
      storeName: req.body.storeName !== undefined ? req.body.storeName : req.user.storeName,
      latitude: req.body.latitude !== undefined ? req.body.latitude : req.user.latitude,
      longitude: req.body.longitude !== undefined ? req.body.longitude : req.user.longitude,
      bankHolder: req.body.bankHolder !== undefined ? req.body.bankHolder : req.user.bankHolder,
      accountNumber: req.body.accountNumber !== undefined ? req.body.accountNumber : req.user.accountNumber,
      ifscCode: req.body.ifscCode !== undefined ? req.body.ifscCode : req.user.ifscCode,
      bankName: req.body.bankName !== undefined ? req.body.bankName : req.user.bankName
    };

    if (req.body.email && req.body.email.trim()) {
      const newEmail = req.body.email.trim().toLowerCase();
      if (newEmail !== req.user.email) {
        if (!/\S+@\S+\.\S+/.test(newEmail)) {
          return res.status(400).json({
            success: false,
            error: 'Please enter a valid email address'
          });
        }
        const emailExists = await User.findOne({
          email: newEmail,
          role: req.user.role,
          _id: { $ne: req.user.id }
        });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            error: 'A user with this email already exists'
          });
        }
        fieldsToUpdate.email = newEmail;
      }
    }

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
        longitude: user.longitude,
        bankHolder: user.bankHolder,
        accountNumber: user.accountNumber,
        ifscCode: user.ifscCode,
        bankName: user.bankName
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

    // Fetch products (basic summary fields only), count orders, and get all seller documents in parallel
    const [allProducts, orderCounts, allDocs] = await Promise.all([
      Product.find({}).select('name brand price sales stock image approvalStatus seller').lean(),
      Order.aggregate([
        { $group: { _id: "$sellerId", count: { $sum: 1 } } }
      ]),
      SellerDocument.find({}).select('seller documentType status fileUrl feedback').lean()
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

    // Send Email to seller (Asynchronously in background)
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
      sendEmail({
        to: seller.email,
        subject: emailSubject,
        text: emailText
      }).catch(mailErr => {
        console.error('Failed to send status update email to seller:', mailErr.message);
      });
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
      if (doc.status === 'approved') {
        return res.status(400).json({
          success: false,
          error: 'This document has already been verified and approved. It cannot be updated or replaced.'
        });
      }
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

    if (doc.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'This document has already been approved and confirmed. Status changes are not permitted.'
      });
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
      partner.isActivePartner = true;
      partner.verificationFeedback = '';
    } else if (decision === 'reject') {
      partner.status = 'rejected';
      partner.verificationFeedback = feedback || '';
    } else {
      return res.status(400).json({ success: false, error: 'Invalid decision type' });
    }

    await partner.save();

    /*
    if (decision === 'approve') {
      try {
        const { autoAssignPendingOrdersToPartner } = require('./deliveryController');
        await autoAssignPendingOrdersToPartner(partner);
      } catch (assignErr) {
        console.error('Error auto-assigning pending orders to partner:', assignErr);
      }
    }
    */

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
    const query = { email: cleanEmail };
    if (req.body.role) {
      query.role = req.body.role;
    }
    const existingUser = await User.findOne(query);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user with this email already exists' });
    }

    const Otp = require('../models/Otp');

    // Rate limiting: 60 seconds cooldown for same email
    const existingOtp = await Otp.findOne({ email: cleanEmail });
    if (existingOtp && existingOtp.lastSentAt && (new Date() - new Date(existingOtp.lastSentAt) < 60 * 1000)) {
      const waitTime = Math.ceil((60 * 1000 - (new Date() - new Date(existingOtp.lastSentAt))) / 1000);
      return res.status(429).json({ success: false, error: `Please wait ${waitTime} seconds before requesting a new OTP.` });
    }

    // Check maximum resend attempts (3 sends limit) to prevent spam and save credit
    if (existingOtp && existingOtp.attempts >= 3) {
      return res.status(400).json({ success: false, error: 'Maximum OTP resend attempts (3) exceeded. Please try again later.' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    const newAttempts = existingOtp ? (existingOtp.attempts + 1) : 1;

    // Delete any old OTP for this email
    await Otp.deleteMany({ email: cleanEmail });

    // Save new OTP
    await Otp.create({
      email: cleanEmail,
      otp: otpCode,
      expiresAt,
      attempts: newAttempts,
      lastSentAt: new Date()
    });

    // Send email using Nodemailer utility in the background
    const sendEmail = require('../utils/sendEmail');
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #4f46e5, #3b82f6); padding: 40px 32px; text-align: center; color: #ffffff;">
          <div style="font-size: 24px; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px;">EMAHU</div>
          <h1 style="color: #ffffff; margin: 0; font-size: 1.8rem; font-weight: 700;">Verify Your Email</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 0.95rem;">Thank you for registering with Emahu Marketplace</p>
        </div>
        <div style="padding: 36px 32px; background: #ffffff;">
          <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 24px 0;">Hello,</p>
          <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0 0 28px 0;">To complete your registration and activate your account, please use the 6-digit verification code below. This code is valid for <strong>5 minutes</strong>.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px 36px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e1b4b; font-family: monospace;">
              ${otpCode}
            </div>
          </div>

          <p style="color: #64748b; font-size: 0.88rem; line-height: 1.6; margin: 28px 0 0 0;">If you did not request this verification code, you can safely ignore this email.</p>
        </div>
        <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 0.8rem;">
          <p style="margin: 0 0 4px 0;">Emahu Marketplace Inc.</p>
          <p style="margin: 0;">Securing premium local trade.</p>
        </div>
      </div>
    `;

    // ✅ Send email using Resend (HTTPS, fast — safe to await)
    const emailResult = await sendEmail({
      to: cleanEmail,
      subject: 'EMAHU Account Registration Verification Code',
      text: `Hello,\n\nThank you for choosing EMAHU. Your 6-digit verification code is:\n\n🔑 ${otpCode}\n\nPlease enter this code to confirm your email and complete your registration.\n\nBest regards,\nThe Emahu Team`,
      html: htmlContent
    });

    // Always include the OTP code in the response.
    // Without a verified domain the email may land in spam — showing it on
    // screen guarantees the user can always complete verification on Vercel.
    const emailOk = emailResult.success || emailResult.simulated;
    if (!emailOk) {
      console.warn(`⚠️  Email delivery failed for ${cleanEmail}: ${emailResult.error}`);
      if (emailResult.sandboxRestricted) {
        console.log(`ℹ️ Resend Sandbox restriction detected for ${cleanEmail}. Falling back to on-screen OTP for testing.`);
        return res.status(200).json({
          success: true,
          message: `Verification code generated. Resend Sandbox restriction: please check backend console or use the backup code shown below.`,
          otpCode,
          devOtp: otpCode,
          emailSent: false,
          isSandboxRestricted: true
        });
      }
      return res.status(500).json({
        success: false,
        error: emailResult.error || 'Failed to send OTP email via Resend'
      });
    }

    console.log(`✔️  OTP email delivered to ${cleanEmail} via Resend`);

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Check your inbox (or spam folder).`,
      otpCode,                   // Always returned — displayed in UI as backup
      devOtp: otpCode,           // Always returned — backward compatibility for test scripts
      emailSent: true,
      isSandboxRestricted: false
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

    // Check if user exists (forgot password verification) - search by email or phone
    let query = {};
    if (cleanEmail.includes('@')) {
      query = { email: cleanEmail };
    } else {
      const cleanPhone = cleanEmail.replace(/\D/g, '');
      const last10Digits = cleanPhone.slice(-10);
      query = {
        $or: [
          { phone: last10Digits },
          { phone: cleanEmail },
          { email: cleanEmail }
        ]
      };
    }
    const user = await User.findOne(query);
    if (user && user.otpCode) {
      if (user.otpAttempts >= 5) {
        return res.status(400).json({ success: false, error: 'Too many failed attempts. Verification locked. Please request a new OTP.' });
      }

      if (user.otpExpiry && new Date(user.otpExpiry) < new Date()) {
        return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
      }

      if (user.otpCode !== otpCode) {
        user.otpAttempts += 1;
        await user.save();
        const remaining = 5 - user.otpAttempts;
        return res.status(400).json({ 
          success: false, 
          error: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Verification locked.'}` 
        });
      }

      // Generate a secure reset token
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(20).toString('hex');
      
      user.otpVerified = true;
      user.passwordResetToken = resetToken;
      user.passwordResetExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
      user.otpCode = undefined; // clear otpCode so it can only be verified once
      user.otpAttempts = 0;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        passwordResetToken: resetToken
      });
    }

    // Default registration OTP verify flow
    const Otp = require('../models/Otp');
    const otpRecord = await Otp.findOne({ email: cleanEmail });
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'OTP has expired or does not exist. Please request a new one.' });
    }

    if (otpRecord.expiresAt && new Date(otpRecord.expiresAt) < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    if (otpRecord.otp !== otpCode) {
      return res.status(400).json({ success: false, error: 'Invalid OTP code. Please try again.' });
    }

    otpRecord.isVerified = true;
    otpRecord.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity for registration completion
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ success: false, error: 'Server error verifying OTP' });
  }
};

// @desc    Mark email as verified via Firebase frontend auth
// @route   POST /api/auth/firebase-verify
// @access  Public
exports.firebaseVerify = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user with this email already exists' });
    }

    const Otp = require('../models/Otp');
    // Upsert a verified OTP record for this email
    await Otp.deleteMany({ email: cleanEmail });
    await Otp.create({
      email: cleanEmail,
      otp: 'FIREBASE',
      isVerified: true,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
    });

    res.status(200).json({ success: true, message: 'Firebase verification recorded in backend' });
  } catch (error) {
    console.error('Firebase Verify Sync Error:', error);
    res.status(500).json({ success: false, error: 'Server error during verification sync' });
  }
};

// @desc    Send OTP code to mobile phone
// @route   POST /api/auth/send-phone-otp
// @access  Public
exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phone, role } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a phone number' });
    }

    const cleanPhone = phone.trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid 10-digit phone number' });
    }

    // Check if user with this phone already exists
    const query = { phone: cleanPhone };
    if (role) {
      query.role = role;
    }
    const existingUser = await User.findOne(query);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user with this phone number already exists' });
    }

    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID ? process.env.TWILIO_VERIFY_SERVICE_SID.trim() : '';
    const accountSid = process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.trim() : '';
    const authToken = process.env.TWILIO_AUTH_TOKEN ? process.env.TWILIO_AUTH_TOKEN.trim() : '';

    const has2Factor = process.env.TWOFACTOR_API_KEY && process.env.TWOFACTOR_API_KEY.trim() !== '' && process.env.TWOFACTOR_API_KEY.trim() !== 'your-2factor-api-key';
    if (!has2Factor && verifyServiceSid && verifyServiceSid !== 'your-twilio-verify-service-sid' && accountSid && authToken) {
      try {
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);
        const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
        
        await client.verify.v2.services(verifyServiceSid)
          .verifications.create({ to: formattedPhone, channel: 'sms' });

        return res.status(200).json({
          success: true,
          message: `OTP verification code sent to ${cleanPhone} via Twilio Verify.`
        });
      } catch (twilioErr) {
        console.error('Twilio Verify Send Error:', twilioErr);
        // Fallback for development if Twilio fails (like Authenticate or trial account issues)
        if (process.env.NODE_ENV === 'development') {
          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
          const Otp = require('../models/Otp');
          await Otp.deleteMany({ phone: cleanPhone });
          await Otp.create({ phone: cleanPhone, otp: otpCode, expiresAt });

          console.log(`⚠️ Twilio Verify failed. Falling back to simulated verification code for development.`);
          return res.status(200).json({
            success: true,
            message: `OTP verification simulated. (Twilio error: ${twilioErr.message})`,
            devOtp: otpCode
          });
        }
        return res.status(500).json({ success: false, error: `Twilio Verify error: ${twilioErr.message}` });
      }
    }

    // Default SMS sending logic (falls back to simulated if TWILIO_PHONE_NUMBER isn't set)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    const Otp = require('../models/Otp');
    await Otp.deleteMany({ phone: cleanPhone });
    await Otp.create({ phone: cleanPhone, otp: otpCode, expiresAt });

    const sendSms = require('../utils/sendSms');
    const smsResult = await sendSms({
      to: cleanPhone,
      body: `Your Emahu mobile verification code is: ${otpCode}. Valid for 5 minutes.`
    });

    if (!smsResult.success && !smsResult.simulated) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚠️ Twilio API failed with error: "${smsResult.error}". Falling back to simulated verification code for development.`);
        return res.status(200).json({
          success: true,
          message: `OTP verification simulated. (Twilio error: ${smsResult.error})`,
          devOtp: otpCode
        });
      }
      return res.status(500).json({ success: false, error: `Failed to send phone OTP: ${smsResult.error}` });
    }

    res.status(200).json({
      success: true,
      message: `OTP verification SMS sent successfully to ${cleanPhone}.`,
      ...(process.env.NODE_ENV === 'development' || smsResult.simulated ? { devOtp: otpCode } : {})
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
    const { phone, otp, email } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Please provide both phone number and OTP code' });
    }

    const cleanPhone = phone.trim();
    const otpCode = otp.trim();

    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID ? process.env.TWILIO_VERIFY_SERVICE_SID.trim() : '';
    const accountSid = process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.trim() : '';
    const authToken = process.env.TWILIO_AUTH_TOKEN ? process.env.TWILIO_AUTH_TOKEN.trim() : '';

    const has2Factor = process.env.TWOFACTOR_API_KEY && process.env.TWOFACTOR_API_KEY.trim() !== '' && process.env.TWOFACTOR_API_KEY.trim() !== 'your-2factor-api-key';
    if (!has2Factor && verifyServiceSid && verifyServiceSid !== 'your-twilio-verify-service-sid' && accountSid && authToken) {
      try {
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);
        const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;

        // Check if there is a local OTP fallback record (for development fallback mode)
        const Otp = require('../models/Otp');
        const localOtp = await Otp.findOne({ phone: cleanPhone });
        
        let isLocalValid = false;
        if (localOtp && localOtp.otp === otpCode) {
          if (!localOtp.expiresAt || new Date(localOtp.expiresAt) >= new Date()) {
            isLocalValid = true;
            await Otp.deleteOne({ _id: localOtp._id });
          }
        }

        if (!isLocalValid) {
          // Verify via Twilio Verify API
          const verification = await client.verify.v2.services(verifyServiceSid)
            .verificationChecks.create({ to: formattedPhone, code: otpCode });

          if (verification.status !== 'approved') {
            return res.status(400).json({ success: false, error: 'Invalid or expired verification code. Please try again.' });
          }
        }

        // Sync verification in MongoDB for registration check
        const OtpModel = require('../models/Otp');
        await OtpModel.deleteMany({ phone: cleanPhone });
        await OtpModel.create({
          phone: cleanPhone,
          otp: 'TWILIO_VERIFY_API',
          isVerified: true,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        return res.status(200).json({
          success: true,
          message: 'Phone verification succeeded.'
        });
      } catch (twilioErr) {
        console.error('Twilio Verify Check Error:', twilioErr);
        // Fallback check in local MongoDB for dev mode
        const Otp = require('../models/Otp');
        const localOtp = await Otp.findOne({ phone: cleanPhone });
        if (localOtp && localOtp.otp === otpCode) {
          if (localOtp.expiresAt && new Date(localOtp.expiresAt) < new Date()) {
            await Otp.deleteOne({ _id: localOtp._id });
            return res.status(400).json({ success: false, error: 'Simulated OTP has expired.' });
          }
          
          await Otp.deleteOne({ _id: localOtp._id });
          
          await Otp.deleteMany({ phone: cleanPhone });
          await Otp.create({
            phone: cleanPhone,
            otp: 'TWILIO_VERIFY_SIMULATED',
            isVerified: true,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
          });

          return res.status(200).json({
            success: true,
            message: 'Simulated OTP verified successfully'
          });
        }
        return res.status(500).json({ success: false, error: `Twilio Verify check error: ${twilioErr.message}` });
      }
    }

    // Default DB-based verification (if Verify Service is not set)
    const Otp = require('../models/Otp');
    const otpRecord = await Otp.findOne({ phone: cleanPhone });
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'OTP has expired or does not exist. Please request a new one.' });
    }

    if (otpRecord.expiresAt && new Date(otpRecord.expiresAt) < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    if (otpRecord.otp !== otpCode) {
      return res.status(400).json({ success: false, error: 'Invalid OTP code. Please try again.' });
    }

    // Mark current OTP record as verified instead of deleting it, so register checks can locate it
    otpRecord.isVerified = true;
    otpRecord.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: 'Phone OTP verified successfully'
    });
  } catch (error) {
    console.error('Verify Phone OTP Error:', error);
    res.status(500).json({ success: false, error: 'Server error verifying phone OTP' });
  }
};

// @desc    Initiate forgot password OTP flow
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide an email address or mobile number' });
    }

    const cleanInput = email.trim();
    let query = {};
    if (cleanInput.includes('@')) {
      query = { email: cleanInput.toLowerCase() };
    } else {
      const cleanPhone = cleanInput.replace(/\D/g, '');
      const last10Digits = cleanPhone.slice(-10);
      query = {
        $or: [
          { phone: last10Digits },
          { phone: cleanInput },
          { email: cleanInput.toLowerCase() }
        ]
      };
    }
    
    // Check if user exists
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ success: false, error: 'No user registered with this email address or mobile number' });
    }

    // Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    // Update user fields
    user.otpCode = otpCode;
    user.otpExpiry = expiresAt;
    user.otpAttempts = 0;
    user.otpResendAttempts = 0;
    user.otpVerified = false;
    user.lastOtpSentAt = new Date();
    
    await user.save();

    // Send SMS using twilio/fast2sms utility
    const sendSms = require('../utils/sendSms');
    const smsResult = await sendSms({
      to: user.phone,
      body: `Your Emahu password reset OTP is ${otpCode}. Valid for 10 minutes. Do not share this code.`
    });

    console.log(`✔️  Password reset OTP SMS sent to ${user.phone}`);

    res.status(200).json({
      success: true,
      message: `Reset code sent via SMS to your registered mobile number ending in ${user.phone.slice(-4)}.`,
      otpCode,
      devOtp: otpCode,
      emailSent: false,
      isSandboxRestricted: false
    });
  } catch (error) {
    console.error('Forgot Password API Error:', error);
    res.status(500).json({ success: false, error: 'Server error while sending password reset OTP' });
  }
};

// @desc    Resend password reset OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide an email address or mobile number' });
    }

    const cleanInput = email.trim();
    let query = {};
    if (cleanInput.includes('@')) {
      query = { email: cleanInput.toLowerCase() };
    } else {
      const cleanPhone = cleanInput.replace(/\D/g, '');
      const last10Digits = cleanPhone.slice(-10);
      query = {
        $or: [
          { phone: last10Digits },
          { phone: cleanInput },
          { email: cleanInput.toLowerCase() }
        ]
      };
    }

    // Check if user exists
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ success: false, error: 'No user registered with this email address or mobile number' });
    }

    // Check rate limit: 60 seconds
    if (user.lastOtpSentAt && (new Date() - new Date(user.lastOtpSentAt) < 60 * 1000)) {
      const waitTime = Math.ceil((60 * 1000 - (new Date() - new Date(user.lastOtpSentAt))) / 1000);
      return res.status(429).json({ success: false, error: `Please wait ${waitTime} seconds before requesting a new OTP.` });
    }

    // Check maximum resend attempts (3 attempts limit)
    if (user.otpResendAttempts >= 3) {
      return res.status(400).json({ success: false, error: 'Maximum OTP resend attempts (3) exceeded. Please try again later.' });
    }

    // Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    user.otpCode = otpCode;
    user.otpExpiry = expiresAt;
    user.otpAttempts = 0;
    user.otpResendAttempts += 1;
    user.otpVerified = false;
    user.lastOtpSentAt = new Date();
    
    await user.save();

    // Send SMS
    const sendSms = require('../utils/sendSms');
    const smsResult = await sendSms({
      to: user.phone,
      body: `Your Emahu password reset OTP is ${otpCode}. Valid for 10 minutes. Do not share this code.`
    });

    console.log(`✔️  Password reset OTP SMS re-sent to ${user.phone}`);

    res.status(200).json({
      success: true,
      message: `Reset code re-sent via SMS to your registered mobile number ending in ${user.phone.slice(-4)}.`,
      otpCode,
      devOtp: otpCode,
      emailSent: false,
      isSandboxRestricted: false
    });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ success: false, error: 'Server error while resending OTP' });
  }
};

// @desc    Reset password using reset token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, passwordResetToken, newPassword, confirmPassword } = req.body;
    if (!email || !passwordResetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, error: 'Please fill in all fields' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }

    // Password strength validation:
    // Min 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    const cleanInput = email.trim();
    let query = {};
    if (cleanInput.includes('@')) {
      query = { email: cleanInput.toLowerCase() };
    } else {
      const cleanPhone = cleanInput.replace(/\D/g, '');
      const last10Digits = cleanPhone.slice(-10);
      query = {
        $or: [
          { phone: last10Digits },
          { phone: cleanInput },
          { email: cleanInput.toLowerCase() }
        ]
      };
    }

    // Find user
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ success: false, error: 'No user registered with this email address or mobile number' });
    }

    // Verify token validity
    if (!user.otpVerified || user.passwordResetToken !== passwordResetToken) {
      return res.status(400).json({ success: false, error: 'Invalid or unauthorized password reset attempt.' });
    }

    if (user.passwordResetExpiry && new Date(user.passwordResetExpiry) < new Date()) {
      return res.status(400).json({ success: false, error: 'Password reset link has expired. Please verify OTP again.' });
    }

    // Update password
    user.password = newPassword;
    
    // Clear reset token state
    user.otpVerified = false;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.otpCode = undefined;
    user.otpAttempts = 0;
    user.otpResendAttempts = 0;

    await user.save();

    // Log password reset activity
    console.log(`[SECURITY] Password reset activity successfully completed for user: ${cleanEmail} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ success: false, error: 'Server error while resetting password' });
  }
};

// @desc    Serve dummy GST stub certificate PDF
// @route   GET /api/auth/gst_certificate_stub.pdf
// @access  Public
exports.getGstCertificateStub = (req, res) => {
  const minimalPDF = Buffer.from(
    'JVBERi0xLjQKMSAwIG9iagogIDw8L1R5cGUvQ2F0YWxvZwogICAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iagogIDw8L1R5cGUvUGFnZXMKICAgL0tpZHNbMyAwIFJdCiAgIC9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKICA8PC9UeXBlL1BhZ2UKICAgL1BhcmVudCAyIDAgUgogICAvTWVkaWFCb3hbMCAwIDU5NSA4NDJdCiAgIC9SZXNvdXJjZXMgPDwvRm9udDw8L0YxIDQgMCBSPj4+PgogICAvQ29udGVudHMgNSAwIFI+PgplbmRvYmoKNCAwIG9iagogIDw8L1R5cGUvRm9udAogICAvU3VidHlwZS9UeXBlMQogICAvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCjUgMCBvYmoKICA8PC9MZW5ndGggNDQ+PnN0cmVhbQpCVAovRjEgMjQgVGYKMTAwIDcwMCBUZAooRU1BSFUgR1NUIENFUlRJRklDQVRFIFNUVUIpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbCAKMDAwMDAwMDExNSAwMDAwMCBsIAowMDAwMDAwMjQ0IDAwMDAwIGwgCjAwMDAwMDAzMTggMDAwMDAgbCAKdHJhaWxlcgogIDw8L1NpemUgNgogICAvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozOTcKJSVFT0Y=',
    'base64'
  );
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="gst_certificate_stub.pdf"');
  res.send(minimalPDF);
};

// @desc    Serve dummy KYC stub image PNG
// @route   GET /api/auth/kyc_document.jpg
// @access  Public
exports.getKycDocumentStub = (req, res) => {
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
      <rect width="400" height="200" fill="#f1f5f9" rx="12"/>
      <rect x="20" y="20" width="360" height="160" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 4" rx="8"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#4f46e5">EMAHU KYC STUB DOCUMENT</text>
      <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#64748b">Verified &amp; Approved Placeholder</text>
    </svg>
  `.trim();
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgContent);
};

// @desc    Change user role (buyer <-> seller/delivery)
// @route   PUT /api/auth/change-role
// @access  Private
exports.changeRole = async (req, res) => {
  try {
    const { role: newRole, storeDetails, vehicleDetails } = req.body;
    const allowedRoles = ['buyer', 'seller', 'delivery'];
    if (!newRole || !allowedRoles.includes(newRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified. Allowed roles are: buyer, seller, delivery'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role === newRole) {
      return res.status(400).json({
        success: false,
        error: `User is already a ${newRole}`
      });
    }

    if (newRole === 'buyer') {
      // Seller/delivery to buyer: allowed directly with instant approval
      user.role = 'buyer';
      user.status = 'approved';
      await user.save();

      // Regenerate tokens and respond
      return await sendTokenResponse(user, 200, req, res);
    }

    // Changing to seller or delivery requires admin verification
    if (newRole === 'seller') {
      if (!storeDetails || !storeDetails.storeName || !storeDetails.category) {
        return res.status(400).json({
          success: false,
          error: 'Please provide store name and store category to request seller role'
        });
      }

      user.role = 'seller';
      user.status = 'pending';
      user.storeName = storeDetails.storeName;
      user.category = storeDetails.category;
      user.isPhoneVerified = true;

      // Optional details
      if (storeDetails.bankHolder) user.bankHolder = storeDetails.bankHolder;
      if (storeDetails.accountNumber) user.accountNumber = storeDetails.accountNumber;
      if (storeDetails.ifscCode) user.ifscCode = storeDetails.ifscCode;
      if (storeDetails.bankName) user.bankName = storeDetails.bankName;
      if (storeDetails.gstNumber) user.gstNumber = storeDetails.gstNumber;
      if (storeDetails.kycType) user.kycType = storeDetails.kycType;
      if (storeDetails.kycNumber) user.kycNumber = storeDetails.kycNumber;

      await user.save();

      // Submit placeholder documents for compliance reviews
      const SellerDocument = require('../models/SellerDocument');
      await SellerDocument.deleteMany({ seller: user._id });
      
      const docUrl = `${req.protocol}://${req.get('host')}/api/auth/kyc_document.jpg`;
      await SellerDocument.create({
        seller: user._id,
        documentType: 'id_proof',
        fileUrl: docUrl,
        status: 'pending'
      });

      await SellerDocument.create({
        seller: user._id,
        documentType: 'business_registration',
        fileUrl: `${req.protocol}://${req.get('host')}/api/auth/gst_certificate_stub.pdf`,
        status: 'pending'
      });

      // Notify admins
      const admins = await User.find({ role: 'admin' });
      const Notification = require('../models/Notification');
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          title: 'Role Upgrade Request: Seller',
          message: `User "${user.name}" has requested to switch role to Seller for store "${user.storeName}" and is pending approval.`,
          type: 'info'
        });
      }

      return await sendTokenResponse(user, 200, req, res);
    }

    if (newRole === 'delivery') {
      if (!vehicleDetails || !vehicleDetails.vehicleType || !vehicleDetails.vehicleNumber) {
        return res.status(400).json({
          success: false,
          error: 'Please provide vehicle type and vehicle number to request delivery role'
        });
      }

      user.role = 'delivery';
      user.status = 'pending';
      user.vehicleType = vehicleDetails.vehicleType;
      user.vehicleNumber = vehicleDetails.vehicleNumber;
      user.currentCity = vehicleDetails.currentCity || user.city || 'Ahmedabad';
      user.currentArea = vehicleDetails.currentArea || user.address || 'Gota';
      user.pincode = vehicleDetails.pincode || '382481';
      user.serviceRadius = vehicleDetails.serviceRadius ? parseFloat(vehicleDetails.serviceRadius) : 15;
      user.perItemCharge = vehicleDetails.perKmRate ? parseFloat(vehicleDetails.perKmRate) : 10;
      user.perKmRate = vehicleDetails.perKmRate ? parseFloat(vehicleDetails.perKmRate) : 5;
      user.coveredCities = vehicleDetails.coveredCities || [user.city || 'Ahmedabad'];
      user.deliveryScope = vehicleDetails.deliveryScope || 'local';
      user.operatingLocation = `${user.currentArea}, ${user.currentCity}`;
      user.isPhoneVerified = true;

      await user.save();

      // Notify admins
      const admins = await User.find({ role: 'admin' });
      const Notification = require('../models/Notification');
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          title: 'Role Upgrade Request: Delivery Partner',
          message: `User "${user.name}" has requested to switch role to Delivery Partner and is pending approval.`,
          type: 'info'
        });
      }

      return await sendTokenResponse(user, 200, req, res);
    }

  } catch (error) {
    console.error('Change Role Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during role transition'
    });
  }
};

