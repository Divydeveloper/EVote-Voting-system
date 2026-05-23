/**
 * Audit Log Routes
 * GET /api/audit        — List audit logs (admin)
 * GET /api/audit/stats  — Audit statistics
 */

const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { action, severity, userId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (severity) filter.severity = severity;
    if (userId) filter.user = userId;

    const logs = await AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      pagination: { total, pages: Math.ceil(total / limit), page: parseInt(page) },
    });
  } catch (error) { next(error); }
});

router.get('/stats', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const stats = await AuditLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const bySeverity = await AuditLog.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);
    res.json({ success: true, data: { byAction: stats, bySeverity } });
  } catch (error) { next(error); }
});

module.exports = router;
