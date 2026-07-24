const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - Verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header (Bearer <token>)
      token = req.headers.authorization.split(' ')[1];
      console.log('[DEBUG AUTH] Received token:', token.substring(0, 20) + '...');

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[DEBUG AUTH] Decoded token:', decoded);

      // Get user from the token, exclude password
      req.user = await User.findById(decoded.id);
      console.log('[DEBUG AUTH] Found user in DB:', req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : 'NULL');

      if (!req.user) {
        console.warn('[DEBUG AUTH] User not found in database for ID:', decoded.id);
        return res.status(401).json({
          success: false,
          error: 'Not authorized, user not found'
        });
      }

      next();
    } catch (error) {
      console.error('[DEBUG AUTH] JWT Verification Error:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Not authorized, token failed or expired'
      });
    }
  }

  if (!token) {
    console.warn('[DEBUG AUTH] No token provided in headers:', req.headers);
    return res.status(401).json({
      success: false,
      error: 'Not authorized, no token provided'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({
        success: false,
        error: 'Authorization middleware error: protect middleware must be called first'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
