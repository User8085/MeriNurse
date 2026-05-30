const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // What the patient originally requested
  requestedDate: {
    type: Date,
    required: [true, 'Requested date is required']
  },
  requestedTime: {
    type: String,
    required: [true, 'Requested time is required'],
    trim: true
  },
  reason: {
    type: String,
    required: [true, 'Reason for appointment is required'],
    trim: true,
    maxlength: 500
  },
  // Status lifecycle: pending → confirmed | declined; pending → cancelled by patient
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'declined', 'cancelled'],
    default: 'pending',
    index: true
  },
  // Doctor's confirmed slot (may differ from requested)
  confirmedDate: {
    type: Date
  },
  confirmedTime: {
    type: String,
    trim: true
  },
  // Doctor's note on confirm / decline
  doctorNote: {
    type: String,
    trim: true,
    maxlength: 500
  },
  // Soft-delete flag
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

appointmentSchema.index({ patient: 1, status: 1 });
appointmentSchema.index({ doctor: 1, status: 1 });
appointmentSchema.index({ confirmedDate: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
