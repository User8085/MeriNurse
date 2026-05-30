const express = require('express');
const router = express.Router();
const Allergy = require('../models/Allergy');
const { protect } = require('../middleware/auth');

// @route   GET /api/allergies
router.get('/', protect, async (req, res) => {
  try {
    let patient = req.user._id;
    if (req.user.role === 'doctor') {
      if (!req.query.patientId) {
        return res.status(400).json({ success: false, message: 'patientId is required for doctors' });
      }
      const DoctorAccess = require('../models/DoctorAccess');
      const access = await DoctorAccess.findOne({ patient: req.query.patientId, doctor: req.user._id, isActive: true });
      if (!access) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      patient = req.query.patientId;
    }

    const allergies = await Allergy.find({ patient }).sort({ createdAt: -1 });
    res.json({ success: true, data: allergies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/allergies
router.post('/', protect, async (req, res) => {
  try {
    const { allergen, type, severity, reaction, diagnosedDate, notes, patientId } = req.body;
    
    let patient = req.user._id;
    if (req.user.role === 'doctor') {
      if (!patientId) {
        return res.status(400).json({ success: false, message: 'patientId is required for doctors' });
      }
      const DoctorAccess = require('../models/DoctorAccess');
      const access = await DoctorAccess.findOne({ patient: patientId, doctor: req.user._id, isActive: true });
      if (!access) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      patient = patientId;
    }

    const allergy = await Allergy.create({
      patient,
      allergen, type, severity, reaction, diagnosedDate, notes
    });
    res.status(201).json({ success: true, data: allergy });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/allergies/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const allergy = await Allergy.findById(req.params.id);
    if (!allergy || allergy.patient.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Not found or access denied' });
    }
    const updated = await Allergy.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/allergies/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const allergy = await Allergy.findById(req.params.id);
    if (!allergy || allergy.patient.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Not found or access denied' });
    }
    await allergy.deleteOne();
    res.json({ success: true, message: 'Allergy removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
