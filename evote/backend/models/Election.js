/**
 * Election Model
 * Represents an election event with timing, status, and metadata.
 */

const mongoose = require('mongoose');

const ElectionSchema = new mongoose.Schema({
  // ─── Basic Info ─────────────────────────────────────
  title: {
    type: String,
    required: [true, 'Election title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  electionType: {
    type: String,
    enum: ['general', 'state', 'local', 'college', 'corporate', 'other'],
    default: 'general',
  },

  // ─── Timing ─────────────────────────────────────────
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function (v) { return v > this.startDate; },
      message: 'End date must be after start date',
    },
  },

  // ─── Status ─────────────────────────────────────────
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'active', 'ended', 'results_declared'],
    default: 'draft',
  },
  isResultPublished: {
    type: Boolean,
    default: false,
  },

  // ─── Statistics ─────────────────────────────────────
  totalVoters: {
    type: Number,
    default: 0,
  },
  totalVotesCast: {
    type: Number,
    default: 0,
  },

  // ─── Administration ─────────────────────────────────
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  candidates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
  }],

  // ─── Settings ───────────────────────────────────────
  allowedVoters: {
    // If empty array, all verified voters can vote
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
  requireEmailVerification: {
    type: Boolean,
    default: true,
  },

  // ─── Banner / Image ─────────────────────────────────
  bannerImage: String,
  constituency: String,
  region: String,

}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────
ElectionSchema.index({ status: 1 });
ElectionSchema.index({ startDate: 1, endDate: 1 });

// ─── Virtual: Voter turnout percentage ───────────────
ElectionSchema.virtual('turnoutPercentage').get(function () {
  if (!this.totalVoters) return 0;
  return ((this.totalVotesCast / this.totalVoters) * 100).toFixed(2);
});

// ─── Virtual: Time remaining ──────────────────────────
ElectionSchema.virtual('timeRemaining').get(function () {
  const now = new Date();
  if (this.status === 'active') {
    return Math.max(0, this.endDate - now);
  }
  if (this.status === 'upcoming') {
    return Math.max(0, this.startDate - now);
  }
  return 0;
});

// ─── Method: Auto-update status ──────────────────────
ElectionSchema.methods.updateStatus = function () {
  const now = new Date();
  if (this.status === 'draft') return;
  if (now >= this.startDate && now < this.endDate) {
    this.status = 'active';
  } else if (now >= this.endDate && this.status === 'active') {
    this.status = 'ended';
  }
};

ElectionSchema.set('toJSON', { virtuals: true });
ElectionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Election', ElectionSchema);
