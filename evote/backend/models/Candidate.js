/**
 * Candidate Model
 * Represents a candidate standing in an election.
 */

const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  // ─── Identity ───────────────────────────────────────
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  age: {
    type: Number,
    min: [18, 'Candidate must be at least 18 years old'],
    max: [120, 'Please enter a valid age'],
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  photo: {
    type: String,
    default: '', // URL or base64
  },

  // ─── Political Info ─────────────────────────────────
  party: {
    type: String,
    required: [true, 'Party name is required'],
    trim: true,
  },
  partySymbol: String, // URL to party symbol image
  partyAbbreviation: String,
  partyColor: {
    type: String,
    default: '#1e40af',
  },

  // ─── Election ────────────────────────────────────────
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
  },
  serialNumber: {
    type: Number,
    required: true,
  },

  // ─── Profile ─────────────────────────────────────────
  qualification: String,
  occupation: String,
  constituency: String,
  manifesto: {
    type: String,
    maxlength: [5000, 'Manifesto cannot exceed 5000 characters'],
  },
  keyPolicies: [String],   // Bullet-point policies
  socialLinks: {
    twitter: String,
    facebook: String,
    website: String,
  },

  // ─── Results ─────────────────────────────────────────
  voteCount: {
    type: Number,
    default: 0,
  },
  isWinner: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────
CandidateSchema.index({ election: 1 });
CandidateSchema.index({ election: 1, serialNumber: 1 }, { unique: true });

// ─── Virtual: vote percentage (needs total in context) ─
// Computed at query time using aggregation

module.exports = mongoose.model('Candidate', CandidateSchema);
