/**
 * Vote Model
 * Each vote is anonymized — stores election + candidate IDs,
 * NOT the voter identity (secret ballot principle).
 * The "voter has voted" check is stored in the User.votedElections array.
 *
 * A voteHash provides tamper-evident verification.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const VoteSchema = new mongoose.Schema({
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
  },

  // Anonymous token — links to voter for duplicate prevention
  // but doesn't expose who voted for whom (hashed voter ID)
  voterToken: {
    type: String,
    required: true,
    select: false, // Hidden from default queries
  },

  // Cryptographic hash for tamper detection
  voteHash: {
    type: String,
    required: true,
  },

  // Metadata
  ipAddress: {
    type: String,
    select: false,
  },
  userAgent: {
    type: String,
    select: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },

  // Blockchain reference (for future blockchain integration)
  blockchainTxId: String,
  isVerified: {
    type: Boolean,
    default: true,
  },

}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────
VoteSchema.index({ election: 1 });
VoteSchema.index({ election: 1, candidate: 1 });
VoteSchema.index({ voterToken: 1, election: 1 }, { unique: true }); // Prevents duplicate votes

// ─── Pre-save: Generate vote hash ─────────────────────
VoteSchema.pre('save', function (next) {
  if (!this.voteHash) {
    const data = `${this.election}:${this.candidate}:${this.voterToken}:${this.timestamp}`;
    this.voteHash = crypto.createHash('sha256').update(data).digest('hex');
  }
  next();
});

// ─── Static: Verify vote integrity ────────────────────
VoteSchema.statics.verifyHash = function (vote) {
  const data = `${vote.election}:${vote.candidate}:${vote.voterToken}:${vote.timestamp}`;
  const expected = crypto.createHash('sha256').update(data).digest('hex');
  return expected === vote.voteHash;
};

module.exports = mongoose.model('Vote', VoteSchema);
