/**
 * Audit Log Model
 * Records all significant system events for security and compliance.
 */

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // Who performed the action
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  userEmail: String,  // Stored separately in case user is deleted
  userRole: String,

  // What action was performed
  action: {
    type: String,
    required: true,
    enum: [
      'USER_REGISTERED',
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_LOGIN_FAILED',
      'USER_LOCKED',
      'PASSWORD_RESET_REQUEST',
      'PASSWORD_RESET_SUCCESS',
      'EMAIL_VERIFIED',
      'OTP_SENT',
      'OTP_VERIFIED',
      'VOTE_CAST',
      'DUPLICATE_VOTE_ATTEMPT',
      'ELECTION_CREATED',
      'ELECTION_UPDATED',
      'ELECTION_STARTED',
      'ELECTION_ENDED',
      'ELECTION_RESULTS_PUBLISHED',
      'CANDIDATE_ADDED',
      'CANDIDATE_UPDATED',
      'CANDIDATE_DELETED',
      'ADMIN_CREATED',
      'USER_DEACTIVATED',
      'USER_ACTIVATED',
      'UNAUTHORIZED_ACCESS',
      'DATA_EXPORT',
      'SYSTEM_ERROR',
    ],
  },

  // Details about the action
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Request metadata
  ipAddress: String,
  userAgent: String,

  // Severity level
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical', 'error'],
    default: 'info',
  },

  // Related resources
  resourceType: String,  // 'election', 'candidate', 'vote', etc.
  resourceId: mongoose.Schema.Types.ObjectId,

  // Result
  success: {
    type: Boolean,
    default: true,
  },
  errorMessage: String,

}, { timestamps: true });

// ─── Indexes for fast querying ─────────────────────────
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 }); // For time-based queries

// ─── TTL Index: Auto-delete logs older than 2 years ───
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

// ─── Static: Create log entry ─────────────────────────
AuditLogSchema.statics.log = async function (data) {
  try {
    await this.create(data);
  } catch (error) {
    // Audit logging should never crash the main flow
    console.error('Audit log error:', error.message);
  }
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);
