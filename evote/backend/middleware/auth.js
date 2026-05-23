/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// ─── Protect: Verify JWT ──────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from DB (ensures account still exists and is active)
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Token is invalid. User not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact support.' });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.', expired: true });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    next(error);
  }
};

// ─── Authorize: Role-based access control ────────────
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      // Log unauthorized access attempt
      AuditLog.log({
        user: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'UNAUTHORIZED_ACCESS',
        details: { attemptedResource: req.originalUrl, requiredRoles: roles },
        ipAddress: req.ip,
        severity: 'warning',
        success: false,
      });

      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires: ${roles.join(', ')} role.`,
      });
    }
    next();
  };
};

// ─── Verify Email ─────────────────────────────────────
exports.requireEmailVerification = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address before proceeding.',
      requiresVerification: true,
    });
  }
  next();
};
