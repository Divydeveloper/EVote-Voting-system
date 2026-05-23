/**
 * Candidate Routes
 * GET    /api/candidates/:electionId       — List candidates for election
 * GET    /api/candidates/detail/:id        — Single candidate
 * POST   /api/candidates                   — Add candidate (admin)
 * PUT    /api/candidates/:id               — Update candidate (admin)
 * DELETE /api/candidates/:id               — Delete candidate (admin)
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// GET /api/candidates/:electionId
router.get('/:electionId', protect, async (req, res, next) => {
  try {
    const { search, party } = req.query;
    const filter = { election: req.params.electionId };
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (party) filter.party = { $regex: party, $options: 'i' };

    const candidates = await Candidate.find(filter).sort({ serialNumber: 1 });
    res.json({ success: true, data: candidates });
  } catch (error) { next(error); }
});

// GET /api/candidates/detail/:id
router.get('/detail/:id', protect, async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('election', 'title status');
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    res.json({ success: true, data: candidate });
  } catch (error) { next(error); }
});

// POST /api/candidates
router.post('/', protect, authorize('admin', 'superadmin'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('party').trim().notEmpty().withMessage('Party is required'),
  body('election').notEmpty().withMessage('Election ID is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const election = await Election.findById(req.body.election);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found.' });
    if (election.status === 'active') return res.status(400).json({ success: false, message: 'Cannot add candidates to active election.' });

    // Auto-assign serial number
    const count = await Candidate.countDocuments({ election: req.body.election });
    const candidate = await Candidate.create({ ...req.body, serialNumber: count + 1 });

    // Add to election
    election.candidates.push(candidate._id);
    await election.save();

    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, userRole: req.user.role,
      action: 'CANDIDATE_ADDED', resourceType: 'candidate', resourceId: candidate._id,
      details: { candidateName: candidate.name, electionId: election._id },
    });

    res.status(201).json({ success: true, data: candidate });
  } catch (error) { next(error); }
});

// PUT /api/candidates/:id
router.put('/:id', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('election');
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    if (candidate.election.status === 'active') return res.status(400).json({ success: false, message: 'Cannot edit candidate in active election.' });

    const allowed = ['name', 'age', 'gender', 'photo', 'party', 'partySymbol', 'partyColor',
      'partyAbbreviation', 'qualification', 'occupation', 'constituency', 'manifesto', 'keyPolicies', 'socialLinks'];
    allowed.forEach(f => { if (req.body[f] !== undefined) candidate[f] = req.body[f]; });
    await candidate.save();

    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, action: 'CANDIDATE_UPDATED',
      resourceType: 'candidate', resourceId: candidate._id,
    });

    res.json({ success: true, data: candidate });
  } catch (error) { next(error); }
});

// DELETE /api/candidates/:id
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('election');
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    if (candidate.election.status === 'active') return res.status(400).json({ success: false, message: 'Cannot delete from active election.' });

    await Election.findByIdAndUpdate(candidate.election._id, { $pull: { candidates: candidate._id } });
    await candidate.deleteOne();

    await AuditLog.log({
      user: req.user._id, userEmail: req.user.email, action: 'CANDIDATE_DELETED',
      resourceType: 'candidate', resourceId: req.params.id,
    });

    res.json({ success: true, message: 'Candidate deleted.' });
  } catch (error) { next(error); }
});

module.exports = router;
