/**
 * Authentication Routes
 * POST /api/auth/register        — Voter registration
 * POST /api/auth/login           — Voter/Admin login
 * POST /api/auth/admin/login     — Admin-specific login
 * POST /api/auth/verify-otp      — Verify email OTP
 * POST /api/auth/resend-otp      — Resend OTP
 * POST /api/auth/forgot-password — Request password reset
 * POST /api/auth/reset-password  — Reset password with token
 * GET  /api/auth/me              — Get current user
 * POST /api/auth/refresh         — Refresh JWT
 * POST /api/auth/logout          — Logout
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const emailUtil = require('../utils/email');

// ─── Helper: Send token response ─────────────────────
const sendTokenResponse = async (user, statusCode, res) => {
  const token = user.generateJWT();
  const refreshToken = user.generateRefreshToken();

  // Save hashed refresh token
  user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    token,
    refreshToken,
    user: user.toJSON(),
  });
};

// ─── Helper: Get client IP ────────────────────────────
const getClientIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

// ════════════════════════════════════════════════════════
// POST /api/auth/register — Voter Registration
// ════════════════════════════════════════════════════════
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Enter a valid Indian phone number'),
], async (req, res, next) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, phone, dateOfBirth } = req.body;

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Create voter
    const user = await User.create({
      name, email, password, phone, dateOfBirth,
      role: 'voter',
    });

    // Generate and send OTP
    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    // Send welcome + OTP emails
    try {
      await emailUtil.sendWelcome(email, name, user.voterId);
      await emailUtil.sendOTP(email, name, otp, 'verification');
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
      // Don't fail registration if email fails
    }

    // Audit log
    await AuditLog.log({
      user: user._id, userEmail: email, userRole: 'voter',
      action: 'USER_REGISTERED',
      details: { voterId: user.voterId },
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email with the OTP sent.',
      userId: user._id,
      email: user.email,
    });

  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// POST /api/auth/login — Unified Login
// ════════════════════════════════════════════════════════
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, role } = req.body;
    const clientIP = getClientIP(req);

    // Find user with password
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
    if (!user) {
      await AuditLog.log({
        userEmail: email, action: 'USER_LOGIN_FAILED',
        details: { reason: 'User not found' }, ipAddress: clientIP, severity: 'warning',
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check if account is locked
    if (user.isLocked()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked due to multiple failed attempts. Try again in ${remaining} minutes.`,
      });
    }

    // Role validation
    if (role && user.role !== role && user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: `No ${role} account found with this email.` });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
        await user.save({ validateBeforeSave: false });
        await AuditLog.log({
          user: user._id, userEmail: email, action: 'USER_LOCKED',
          details: { attempts: user.loginAttempts }, ipAddress: clientIP, severity: 'critical',
        });
        return res.status(423).json({ success: false, message: 'Account locked for 30 minutes after 5 failed attempts.' });
      }
      await user.save({ validateBeforeSave: false });

      await AuditLog.log({
        user: user._id, userEmail: email, action: 'USER_LOGIN_FAILED',
        details: { attempt: user.loginAttempts }, ipAddress: clientIP, severity: 'warning',
      });
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${5 - user.loginAttempts} attempts remaining.`,
      });
    }

    // Reset login attempts on success
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginIP = clientIP;

    await AuditLog.log({
      user: user._id, userEmail: email, userRole: user.role,
      action: 'USER_LOGIN', ipAddress: clientIP, userAgent: req.headers['user-agent'],
    });

    await sendTokenResponse(user, 200, res);

  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// POST /api/auth/verify-otp
// ════════════════════════════════════════════════════════
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: 'User ID and OTP are required.' });
    }

    const user = await User.findById(userId).select('+otp +otpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'No pending OTP. Please request a new one.' });
    }

    if (new Date() > user.otpExpiry) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (user.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
    }

    // Mark verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpVerifiedAt = new Date();
    await user.save({ validateBeforeSave: false });

    await AuditLog.log({
      user: user._id, userEmail: user.email, action: 'EMAIL_VERIFIED',
      ipAddress: getClientIP(req),
    });

    await sendTokenResponse(user, 200, res);

  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// POST /api/auth/resend-otp
// ════════════════════════════════════════════════════════
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { userId, email } = req.body;
    const user = userId ? await User.findById(userId) : await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified.' });
    }

    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    await emailUtil.sendOTP(user.email, user.name, otp, 'verification');
    await AuditLog.log({ user: user._id, userEmail: user.email, action: 'OTP_SENT' });

    res.json({ success: true, message: 'OTP resent to your email.' });

  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// ════════════════════════════════════════════════════════
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
], async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    const genericResponse = {
      success: true,
      message: 'If this email is registered, you will receive a password reset link.',
    };

    if (!user) return res.json(genericResponse);

    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await emailUtil.sendPasswordReset(email, user.name, resetUrl);
    } catch (emailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Email could not be sent.' });
    }

    await AuditLog.log({
      user: user._id, userEmail: email, action: 'PASSWORD_RESET_REQUEST',
      ipAddress: getClientIP(req),
    });

    res.json(genericResponse);

  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// POST /api/auth/reset-password/:token
// ════════════════════════════════════════════════════════
router.post('/reset-password/:token', [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and a number'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await AuditLog.log({
      user: user._id, userEmail: user.email, action: 'PASSWORD_RESET_SUCCESS',
      ipAddress: getClientIP(req), severity: 'warning',
    });

    await sendTokenResponse(user, 200, res);

  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// GET /api/auth/me — Get current user
// ════════════════════════════════════════════════════════
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('votedElections', 'title status');
  res.json({ success: true, user });
});

// ════════════════════════════════════════════════════════
// POST /api/auth/logout
// ════════════════════════════════════════════════════════
router.post('/logout', protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, userRole: req.user.role,
      action: 'USER_LOGOUT', ipAddress: getClientIP(req),
    });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) { next(error); }
});

module.exports = router;
