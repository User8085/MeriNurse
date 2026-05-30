const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// ─────────────────────────────────────────────
// @route   POST /api/appointments
// @desc    Patient requests a new appointment
// @access  Patient only
// ─────────────────────────────────────────────
router.post('/', protect, authorize('patient'), async (req, res) => {
  try {
    const { doctorId, requestedDate, requestedTime, reason } = req.body;

    if (!doctorId || !requestedDate || !requestedTime || !reason) {
      return res.status(400).json({ success: false, message: 'doctorId, requestedDate, requestedTime, and reason are required' });
    }

    // Verify doctor exists
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor', isActive: true });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      requestedDate: new Date(requestedDate),
      requestedTime,
      reason
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName specialization');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating appointment' });
  }
});

// ─────────────────────────────────────────────
// @route   GET /api/appointments
// @desc    Get appointments for the logged-in user
//          Patient: their own; Doctor: for them
// @access  Both
// ─────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    const query = { isActive: true };

    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } else {
      query.doctor = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    // upcoming=true: only future confirmed appointments
    if (upcoming === 'true') {
      query.status = 'confirmed';
      query.confirmedDate = { $gte: new Date() };
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName specialization')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: appointments });
  } catch (error) {
    console.error('Get Appointments Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// @route   PUT /api/appointments/:id/confirm
// @desc    Doctor confirms an appointment (can adjust date/time, add note)
// @access  Doctor only
// ─────────────────────────────────────────────
router.put('/:id/confirm', protect, authorize('doctor'), async (req, res) => {
  try {
    const { confirmedDate, confirmedTime, doctorNote } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctor: req.user._id,
      isActive: true
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot confirm an appointment with status "${appointment.status}"` });
    }

    appointment.status = 'confirmed';
    appointment.confirmedDate = confirmedDate ? new Date(confirmedDate) : appointment.requestedDate;
    appointment.confirmedTime = confirmedTime || appointment.requestedTime;
    if (doctorNote) appointment.doctorNote = doctorNote;

    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName specialization');

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Confirm Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// @route   PUT /api/appointments/:id/decline
// @desc    Doctor declines an appointment with optional note
// @access  Doctor only
// ─────────────────────────────────────────────
router.put('/:id/decline', protect, authorize('doctor'), async (req, res) => {
  try {
    const { doctorNote } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctor: req.user._id,
      isActive: true
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot decline an appointment with status "${appointment.status}"` });
    }

    appointment.status = 'declined';
    if (doctorNote) appointment.doctorNote = doctorNote;

    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName specialization');

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Decline Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// @route   DELETE /api/appointments/:id
// @desc    Patient cancels their own pending appointment
// @access  Patient only
// ─────────────────────────────────────────────
router.delete('/:id', protect, authorize('patient'), async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patient: req.user._id,
      isActive: true
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ success: false, message: 'Only pending or confirmed appointments can be cancelled' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Cancel Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
