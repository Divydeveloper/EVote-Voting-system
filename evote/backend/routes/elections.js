/**
 * Election Routes
 * GET    /api/elections          — List active/upcoming elections (voter)
 * GET    /api/elections/:id      — Get election details
 * POST   /api/elections          — Create election (admin)
 * PUT    /api/elections/:id      — Update election (admin)
 * DELETE /api/elections/:id      — Delete election (admin)
 * PATCH  /api/elections/:id/status — Change status (admin)
 * GET    /api/elections/:id/results — Get results
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// ─── Helper: Auto-sync election status ────────────────
const syncStatus = async (election) => {
  const now = new Date();
  let changed = false;
  if (election.status === 'upcoming' && now >= election.startDate) {
    election.status = 'active'; changed = true;
  } else if (election.status === 'active' && now > election.endDate) {
    election.status = 'ended'; changed = true;
  }
  if (changed) await election.save({ validateBeforeSave: false });
  return election;
};

// ════════════════════════════════════════════════════════
// GET /api/elections — List elections
// ════════════════════════════════════════════════════════
router.get('/', protect, async (req, res, next) => {
  try {
    const { status, type, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    // Voters see only non-draft elections
    if (req.user.role === 'voter') {
      filter.status = { $in: ['upcoming', 'active', 'ended', 'results_declared'] };
    }
    if (status) filter.status = status;
    if (type) filter.electionType = type;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const elections = await Election.find(filter)
      .populate('createdBy', 'name email')
      .populate('candidates', 'name party voteCount photo partyColor')
      .sort({ startDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Sync status for each
    const synced = await Promise.all(
      elections.map(async (e) => {
        const doc = await Election.findById(e._id);
        return await syncStatus(doc);
      })
    );

    const total = await Election.countDocuments(filter);

    res.json({
      success: true,
      data: synced,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// GET /api/elections/:id — Single election
// ════════════════════════════════════════════════════════
router.get('/:id', protect, async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('candidates');

    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    await syncStatus(election);

    // Check if current voter has voted
    const hasVoted = req.user.role === 'voter'
      ? req.user.hasVotedIn(req.params.id)
      : false;

    // If results declared or ended, include vote counts
    let candidatesWithVotes = election.candidates;
    if (['ended', 'results_declared'].includes(election.status)) {
      candidatesWithVotes = election.candidates.map(c => ({
        ...c.toObject(),
        votePercentage: election.totalVotesCast > 0
          ? ((c.voteCount / election.totalVotesCast) * 100).toFixed(1)
          : '0',
      }));
    } else if (req.user.role === 'voter') {
      // Hide vote counts from voters during active election
      candidatesWithVotes = election.candidates.map(c => {
        const obj = c.toObject();
        delete obj.voteCount;
        return obj;
      });
    }

    res.json({
      success: true,
      data: { ...election.toObject(), candidates: candidatesWithVotes, hasVoted },
    });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// POST /api/elections — Create election (admin)
// ════════════════════════════════════════════════════════
router.post('/', protect, authorize('admin', 'superadmin'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, description, startDate, endDate, electionType, constituency, region, bannerImage } = req.body;

    // Determine initial status
    const now = new Date();
    const start = new Date(startDate);
    let status = 'draft';
    if (start > now) status = 'upcoming';
    else if (start <= now) status = 'active';

    const election = await Election.create({
      title, description, startDate, endDate, electionType,
      constituency, region, bannerImage, status,
      createdBy: req.user._id,
    });

    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, userRole: req.user.role,
      action: 'ELECTION_CREATED', resourceType: 'election', resourceId: election._id,
      details: { title, electionType },
    });

    res.status(201).json({ success: true, data: election });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// PUT /api/elections/:id — Update election (admin)
// ════════════════════════════════════════════════════════
router.put('/:id', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found.' });

    if (election.status === 'active') {
      return res.status(400).json({ success: false, message: 'Cannot edit an active election.' });
    }

    const allowed = ['title', 'description', 'startDate', 'endDate', 'electionType',
                     'constituency', 'region', 'bannerImage', 'requireEmailVerification'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) election[field] = req.body[field];
    });

    await election.save();
    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, userRole: req.user.role,
      action: 'ELECTION_UPDATED', resourceType: 'election', resourceId: election._id,
    });

    res.json({ success: true, data: election });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// PATCH /api/elections/:id/status — Change status (admin)
// ════════════════════════════════════════════════════════
router.patch('/:id/status', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'upcoming', 'active', 'ended', 'results_declared'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const election = await Election.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!election) return res.status(404).json({ success: false, message: 'Election not found.' });

    const actionMap = {
      active: 'ELECTION_STARTED',
      ended: 'ELECTION_ENDED',
      results_declared: 'ELECTION_RESULTS_PUBLISHED',
    };

    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, userRole: req.user.role,
      action: actionMap[status] || 'ELECTION_UPDATED',
      resourceType: 'election', resourceId: election._id,
      details: { newStatus: status },
    });

    res.json({ success: true, data: election });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// DELETE /api/elections/:id (admin only)
// ════════════════════════════════════════════════════════
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found.' });

    if (['active', 'ended'].includes(election.status)) {
      return res.status(400).json({ success: false, message: 'Cannot delete an active or ended election.' });
    }

    // Delete related candidates and votes
    await Candidate.deleteMany({ election: election._id });
    await Vote.deleteMany({ election: election._id });
    await election.deleteOne();

    res.json({ success: true, message: 'Election deleted successfully.' });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// GET /api/elections/:id/results
// ════════════════════════════════════════════════════════
router.get('/:id/results', protect, async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('candidates')
      .lean();

    if (!election) return res.status(404).json({ success: false, message: 'Election not found.' });

    if (!['ended', 'results_declared'].includes(election.status) && req.user.role === 'voter') {
      return res.status(403).json({ success: false, message: 'Results not yet declared.' });
    }

    // Sort candidates by votes
    const sorted = [...election.candidates].sort((a, b) => b.voteCount - a.voteCount);
    const total = election.totalVotesCast;

    const results = sorted.map((c, idx) => ({
      ...c,
      rank: idx + 1,
      votePercentage: total > 0 ? ((c.voteCount / total) * 100).toFixed(2) : '0.00',
    }));

    res.json({
      success: true,
      data: {
        election: { ...election, candidates: undefined },
        results,
        summary: {
          totalVoters: election.totalVoters,
          totalVotesCast: total,
          turnout: election.totalVoters > 0 ? ((total / election.totalVoters) * 100).toFixed(2) : '0',
          winner: results[0] || null,
        },
      },
    });
  } catch (error) { next(error); }
});

module.exports = router;
