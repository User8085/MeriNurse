const express = require('express');
const router = express.Router();
const DoctorAccess = require('../models/DoctorAccess');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/access/my-doctors (patient)
// @desc    Get list of doctors who have access to patient's records
router.get('/my-doctors', protect, authorize('patient'), async (req, res) => {
  try {
    const accessList = await DoctorAccess.find({ patient: req.user._id, isActive: true })
      .populate('doctor', 'firstName lastName email specialization hospital');
    res.json({ success: true, data: accessList });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/access/my-patients (doctor)
// @desc    Get list of patients who have shared access
router.get('/my-patients', protect, authorize('doctor'), async (req, res) => {
  try {
    const accessList = await DoctorAccess.find({ doctor: req.user._id, isActive: true })
      .populate('patient', 'firstName lastName email dateOfBirth gender bloodGroup');
    res.json({ success: true, data: accessList });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/access/all-patients (doctor)
// @desc    Get all registered patients on the portal
router.get('/all-patients', protect, authorize('doctor'), async (req, res) => {
  try {
    const { q } = req.query;

    let filter = { role: 'patient', isActive: true };

    if (q && q.length >= 1) {
      const mongoose = require('mongoose');
      let idMatch = [];
      if (mongoose.Types.ObjectId.isValid(q)) {
        idMatch = [{ _id: new mongoose.Types.ObjectId(q) }];
      }
      filter.$or = [
        ...idMatch,
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { bloodGroup: { $regex: q, $options: 'i' } }
      ];
    }

    const patients = await User.find(filter)
      .select('firstName lastName email dateOfBirth gender bloodGroup')
      .sort({ firstName: 1 })
      .limit(100);

    res.json({ success: true, data: patients });
  } catch (error) {
    console.error('All patients error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/access/grant
// @desc    Patient grants access to a doctor
router.post('/grant', protect, authorize('patient'), async (req, res) => {
  try {
    const { doctorEmail, accessLevel, grantedCategories, expiresAt, notes } = req.body;

    // Find the doctor by email
    const doctor = await User.findOne({ email: doctorEmail, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found. Please verify the email.' });
    }

    // Check if access already exists
    const existing = await DoctorAccess.findOne({ patient: req.user._id, doctor: doctor._id });
    if (existing) {
      if (existing.isActive) {
        return res.status(400).json({ success: false, message: 'Access already granted to this doctor' });
      }
      // Reactivate
      existing.isActive = true;
      existing.accessLevel = accessLevel || 'view';
      existing.grantedCategories = grantedCategories || ['all'];
      existing.grantedAt = Date.now();
      existing.expiresAt = expiresAt;
      existing.revokedAt = undefined;
      existing.notes = notes;
      await existing.save();
      
      const populated = await DoctorAccess.findById(existing._id)
        .populate('doctor', 'firstName lastName email specialization hospital');
      return res.json({ success: true, data: populated });
    }

    const access = await DoctorAccess.create({
      patient: req.user._id,
      doctor: doctor._id,
      accessLevel: accessLevel || 'view',
      grantedCategories: grantedCategories || ['all'],
      expiresAt,
      notes
    });

    const populated = await DoctorAccess.findById(access._id)
      .populate('doctor', 'firstName lastName email specialization hospital');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Grant Access Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/access/:id
// @desc    Update access permissions
router.put('/:id', protect, authorize('patient'), async (req, res) => {
  try {
    const access = await DoctorAccess.findById(req.params.id);
    if (!access || access.patient.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Access not found' });
    }

    const { accessLevel, grantedCategories, expiresAt } = req.body;
    if (accessLevel) access.accessLevel = accessLevel;
    if (grantedCategories) access.grantedCategories = grantedCategories;
    if (expiresAt !== undefined) access.expiresAt = expiresAt;

    await access.save();
    const populated = await DoctorAccess.findById(access._id)
      .populate('doctor', 'firstName lastName email specialization hospital');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/access/:id
// @desc    Patient revokes doctor access
router.delete('/:id', protect, authorize('patient'), async (req, res) => {
  try {
    const access = await DoctorAccess.findById(req.params.id);
    if (!access || access.patient.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Access not found' });
    }

    access.isActive = false;
    access.revokedAt = Date.now();
    await access.save();

    res.json({ success: true, message: 'Access revoked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/access/doctors/search
// @desc    Search for doctors by name, specialization, or email
router.get('/doctors/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query too short' });
    }

    const doctors = await User.find({
      role: 'doctor',
      isActive: true,
      $or: [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { specialization: { $regex: q, $options: 'i' } }
      ]
    }).select('firstName lastName email specialization hospital').limit(10);

    res.json({ success: true, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/access/patients/search
// @desc    Doctor searches their accessible patients by name, email, or patient unique ID
router.get('/patients/search', protect, authorize('doctor'), async (req, res) => {
  try {
    const { q } = req.query;

    // Get doctor's accessible patient IDs
    const accessList = await DoctorAccess.find({ doctor: req.user._id, isActive: true });
    const patientIds = accessList.map(a => a.patient);

    if (!q || q.length < 1) {
      // Return all patients if no query
      const patients = await User.find({
        _id: { $in: patientIds },
        isActive: true
      }).select('firstName lastName email dateOfBirth gender bloodGroup hospital');
      return res.json({ success: true, data: patients.map(p => ({ patient: p })) });
    }

    // Try to match by ObjectId (unique patient ID) first
    const mongoose = require('mongoose');
    let idMatch = [];
    if (mongoose.Types.ObjectId.isValid(q)) {
      idMatch = [{ _id: new mongoose.Types.ObjectId(q) }];
    }

    const patients = await User.find({
      _id: { $in: patientIds },
      isActive: true,
      $or: [
        ...idMatch,
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { bloodGroup: { $regex: q, $options: 'i' } }
      ]
    }).select('firstName lastName email dateOfBirth gender bloodGroup');

    res.json({ success: true, data: patients.map(p => ({ patient: p })) });
  } catch (error) {
    console.error('Patient search error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
