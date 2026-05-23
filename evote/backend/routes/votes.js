/**
 * Vote Routes
 * POST /api/votes/cast      — Cast a vote (voter)
 * GET  /api/votes/status/:electionId — Check if voted
 * GET  /api/votes/verify/:hash       — Verify vote hash
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Vote = require('../models/Vote');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect, authorize, requireEmailVerification } = require('../middleware/auth');
const emailUtil = require('../utils/email');

// ════════════════════════════════════════════════════════
// POST /api/votes/cast
// ════════════════════════════════════════════════════════
router.post('/cast', protect, requireEmailVerification, async (req, res, next) => {
  try {
    const { electionId, candidateId } = req.body;
    if (!electionId || !candidateId) {
      return res.status(400).json({ success: false, message: 'Election ID and Candidate ID are required.' });
    }

    // 1. Check election exists and is active
    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found.' });
    if (election.status !== 'active') {
      return res.status(400).json({ success: false, message: `Election is ${election.status}. Voting is not allowed.` });
    }

    // 2. Check voter hasn't already voted (primary check via User model)
    const voter = await User.findById(req.user._id);
    if (voter.hasVotedIn(electionId)) {
      await AuditLog.log({
        user: req.user._id, userEmail: req.user.email,
        action: 'DUPLICATE_VOTE_ATTEMPT',
        details: { electionId, candidateId },
        ipAddress: req.ip, severity: 'critical',
      });
      return res.status(403).json({ success: false, message: 'You have already voted in this election.' });
    }

    // 3. Validate candidate belongs to this election
    const candidate = await Candidate.findOne({ _id: candidateId, election: electionId });
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found in this election.' });

    // 4. Create anonymous voter token (hash of userId + electionId + secret)
    const voterToken = crypto
      .createHash('sha256')
      .update(`${req.user._id}:${electionId}:${process.env.JWT_SECRET}`)
      .digest('hex');

    // 5. Secondary duplicate check via voterToken (tamper-evident)
    const existingVote = await Vote.findOne({ election: electionId, voterToken });
    if (existingVote) {
      await AuditLog.log({
        user: req.user._id, userEmail: req.user.email,
        action: 'DUPLICATE_VOTE_ATTEMPT',
        details: { electionId, method: 'token_check' },
        ipAddress: req.ip, severity: 'critical',
      });
      return res.status(403).json({ success: false, message: 'Duplicate vote detected.' });
    }

    // 6. Cast the vote
    const vote = await Vote.create({
      election: electionId,
      candidate: candidateId,
      voterToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      voteHash: crypto.randomBytes(32).toString('hex'), // Unique hash for public verification
    });

    // 7. Update candidate vote count (atomic)
    await Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } });

    // 8. Update election total votes
    await Election.findByIdAndUpdate(electionId, { $inc: { totalVotesCast: 1 } });

    // 9. Mark voter as having voted
    await User.findByIdAndUpdate(req.user._id, {
      $push: { votedElections: electionId },
    });

    // 10. Audit log
    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, userRole: 'voter',
      action: 'VOTE_CAST',
      details: { electionId, electionTitle: election.title },
      resourceType: 'vote', resourceId: vote._id,
      ipAddress: req.ip,
    });

    // 11. Send confirmation email (non-blocking)
    emailUtil.sendVoteConfirmation(
      req.user.email, req.user.name,
      election.title, candidate.name, vote.voteHash
    ).catch(err => console.error('Vote confirmation email failed:', err.message));

    res.json({
      success: true,
      message: 'Your vote has been cast successfully!',
      data: {
        voteHash: vote.voteHash,
        candidateName: candidate.name,
        candidateParty: candidate.party,
        electionTitle: election.title,
        timestamp: vote.timestamp,
      },
    });

  } catch (error) {
    // Handle duplicate key error (race condition safety net)
    if (error.code === 11000) {
      return res.status(403).json({ success: false, message: 'You have already voted in this election.' });
    }
    next(error);
  }
});

// ════════════════════════════════════════════════════════
// GET /api/votes/status/:electionId
// ════════════════════════════════════════════════════════
router.get('/status/:electionId', protect, async (req, res, next) => {
  try {
    const voter = await User.findById(req.user._id);
    const hasVoted = voter.hasVotedIn(req.params.electionId);
    res.json({ success: true, hasVoted });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// GET /api/votes/verify/:hash — Public verification
// ════════════════════════════════════════════════════════
router.get('/verify/:hash', async (req, res, next) => {
  try {
    const vote = await Vote.findOne({ voteHash: req.params.hash })
      .populate('election', 'title status')
      .populate('candidate', 'name party');

    if (!vote) {
      return res.status(404).json({ success: false, message: 'Vote not found. Hash may be invalid.' });
    }

    res.json({
      success: true,
      message: 'Vote verified successfully.',
      data: {
        election: vote.election?.title,
        candidate: vote.candidate?.name,
        party: vote.candidate?.party,
        timestamp: vote.timestamp,
        verified: true,
      },
    });
  } catch (error) { next(error); }
});

// ════════════════════════════════════════════════════════
// GET /api/votes/live/:electionId — Live counts (admin)
// ════════════════════════════════════════════════════════
router.get('/live/:electionId', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const candidates = await Candidate.find({ election: req.params.electionId })
      .select('name party partyColor voteCount photo serialNumber')
      .sort({ voteCount: -1 });

    const election = await Election.findById(req.params.electionId)
      .select('totalVotesCast totalVoters status title');

    res.json({
      success: true,
      data: {
        election,
        candidates,
        turnout: election.totalVoters > 0
          ? ((election.totalVotesCast / election.totalVoters) * 100).toFixed(2)
          : '0',
      },
    });
  } catch (error) { next(error); }
});

module.exports = router;
