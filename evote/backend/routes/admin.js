/**
 * Admin Routes
 * GET  /api/admin/dashboard         — Analytics overview
 * GET  /api/admin/voters            — List all voters
 * GET  /api/admin/voters/:id        — Voter detail
 * PATCH /api/admin/voters/:id/status — Activate/deactivate voter
 * POST  /api/admin/create-admin     — Create admin (superadmin only)
 * GET  /api/admin/export/elections  — Export results
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// ════════════════════════════════════════════════════════
// GET /api/admin/dashboard
// ════════════════════════════════════════════════════════
router.get('/dashboard', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const [
      totalVoters,
      verifiedVoters,
      totalElections,
      activeElections,
      totalCandidates,
      totalVotes,
      recentVoters,
      recentAuditLogs,
    ] = await Promise.all([
      User.countDocuments({ role: 'voter' }),
      User.countDocuments({ role: 'voter', isVerified: true }),
      Election.countDocuments(),
      Election.countDocuments({ status: 'active' }),
      Candidate.countDocuments(),
      Vote.countDocuments(),
      User.find({ role: 'voter' }).sort({ createdAt: -1 }).limit(5).select('name email voterId createdAt isVerified'),
      AuditLog.find({ severity: { $in: ['warning', 'critical'] } })
        .sort({ createdAt: -1 }).limit(10)
        .select('action userEmail severity createdAt details ipAddress'),
    ]);

    // Election status breakdown
    const electionStats = await Election.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Votes over last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const votesByDay = await Vote.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Registrations over last 7 days
    const regsByDay = await User.aggregate([
      { $match: { role: 'voter', createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalVoters,
          verifiedVoters,
          unverifiedVoters: totalVoters - verifiedVoters,
          totalElections,
          activeElections,
          totalCandidates,
          totalVotes,
        },
        electionStats,
        votesByDay,
        regsByDay,
        recentVoters,
        recentAlerts: recentAuditLogs,
      },
    });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// GET /api/admin/voters
// ════════════════════════════════════════════════════════
router.get('/voters', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { search, status, verified, page = 1, limit = 20 } = req.query;
    const filter = { role: 'voter' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { voterId: { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (verified === 'true') filter.isVerified = true;
    if (verified === 'false') filter.isVerified = false;

    const voters = await User.find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: voters,
      pagination: { total, pages: Math.ceil(total / limit), page: parseInt(page) },
    });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// GET /api/admin/voters/:id
// ════════════════════════════════════════════════════════
router.get('/voters/:id', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const voter = await User.findById(req.params.id)
      .select('-password -refreshToken')
      .populate('votedElections', 'title status startDate endDate');
    if (!voter) return res.status(404).json({ success: false, message: 'Voter not found.' });

    const auditLogs = await AuditLog.find({ user: voter._id })
      .sort({ createdAt: -1 }).limit(20);

    res.json({ success: true, data: { voter, auditLogs } });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// PATCH /api/admin/voters/:id/status
// ════════════════════════════════════════════════════════
router.patch('/voters/:id/status', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const voter = await User.findByIdAndUpdate(
      req.params.id, { isActive }, { new: true }
    ).select('-password');

    if (!voter) return res.status(404).json({ success: false, message: 'Voter not found.' });

    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, userRole: req.user.role,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      details: { targetUser: voter.email },
      resourceType: 'user', resourceId: voter._id,
    });

    res.json({ success: true, data: voter, message: `Voter ${isActive ? 'activated' : 'deactivated'}.` });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// POST /api/admin/create-admin (superadmin only)
// ════════════════════════════════════════════════════════
router.post('/create-admin', protect, authorize('superadmin'), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered.' });

    const admin = await User.create({ name, email, password, role: 'admin', isVerified: true });

    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, action: 'ADMIN_CREATED',
      details: { newAdmin: email },
    });

    res.status(201).json({ success: true, data: admin });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// GET /api/admin/export/election/:id — JSON export
// ════════════════════════════════════════════════════════
router.get('/export/election/:id', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('candidates')
      .populate('createdBy', 'name email');

    if (!election) return res.status(404).json({ success: false, message: 'Election not found.' });

    const candidates = await Candidate.find({ election: req.params.id }).sort({ voteCount: -1 });
    const totalVotes = election.totalVotesCast;

    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, action: 'DATA_EXPORT',
      details: { electionId: req.params.id, electionTitle: election.title },
    });

    res.json({
      success: true,
      data: {
        election: {
          title: election.title,
          type: election.electionType,
          startDate: election.startDate,
          endDate: election.endDate,
          status: election.status,
          totalVoters: election.totalVoters,
          totalVotesCast: totalVotes,
          turnout: election.totalVoters > 0 ? ((totalVotes / election.totalVoters) * 100).toFixed(2) : '0',
        },
        results: candidates.map((c, i) => ({
          rank: i + 1,
          name: c.name,
          party: c.party,
          votes: c.voteCount,
          percentage: totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(2) : '0',
          isWinner: i === 0,
        })),
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.email,
      },
    });
  } catch (error) { next(error); }
});

module.exports = router;
