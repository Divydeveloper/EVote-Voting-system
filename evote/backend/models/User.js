/**
 * User Model
 * Handles both Admin and Voter accounts.
 * Passwords are hashed with bcryptjs before saving.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  // ─── Identity ───────────────────────────────────────
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Never return password in queries
  },

  // ─── Role & Status ──────────────────────────────────
  role: {
    type: String,
    enum: ['voter', 'admin', 'superadmin'],
    default: 'voter',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },

  // ─── Voter-specific fields ──────────────────────────
  voterId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
  },
  dateOfBirth: Date,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
  },
  aadhaarLastFour: { // Only last 4 digits for reference
    type: String,
    match: [/^\d{4}$/, 'Only last 4 digits of Aadhaar'],
  },
  profilePhoto: String,

  // ─── Voting Record ──────────────────────────────────
  votedElections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
  }],

  // ─── OTP & Password Reset ───────────────────────────
  otp: String,
  otpExpiry: Date,
  otpVerifiedAt: Date,
  resetPasswordToken: String,
  resetPasswordExpiry: Date,
  emailVerificationToken: String,

  // ─── Security & Audit ───────────────────────────────
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: Date,
  lastLogin: Date,
  lastLoginIP: String,
  refreshToken: String,

}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────
UserSchema.index({ email: 1 });
UserSchema.index({ voterId: 1 });
UserSchema.index({ role: 1 });

// ─── Pre-save: Hash password ───────────────────────────
UserSchema.pre('save', async function (next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Pre-save: Generate Voter ID ───────────────────────
UserSchema.pre('save', function (next) {
  if (this.role === 'voter' && !this.voterId) {
    // Format: EV + YEAR + 6-digit random number
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(100000 + Math.random() * 900000);
    this.voterId = `EV${year}${random}`;
  }
  next();
});

// ─── Method: Compare password ──────────────────────────
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Method: Generate JWT ──────────────────────────────
UserSchema.methods.generateJWT = function () {
  return jwt.sign(
    { id: this._id, role: this.role, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// ─── Method: Generate Refresh Token ───────────────────
UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

// ─── Method: Generate OTP ─────────────────────────────
UserSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60 * 1000);
  return otp;
};

// ─── Method: Generate Password Reset Token ────────────
UserSchema.methods.generateResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

// ─── Method: Check if account is locked ───────────────
UserSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// ─── Virtual: hasVotedIn ──────────────────────────────
UserSchema.methods.hasVotedIn = function (electionId) {
  return this.votedElections.some(id => id.toString() === electionId.toString());
};

// ─── Remove sensitive fields from JSON output ─────────
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpiry;
  delete obj.refreshToken;
  delete obj.loginAttempts;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
