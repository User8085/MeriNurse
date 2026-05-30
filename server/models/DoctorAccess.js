const mongoose = require('mongoose');

const doctorAccessSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accessLevel: {
    type: String,
    enum: ['view', 'view-upload', 'full'],
    default: 'view'
    // view: can only view records
    // view-upload: can view and upload prescriptions
    // full: can view, upload, and add notes
  },
  grantedCategories: [{
    type: String,
    enum: [
      'lab-report', 'prescription', 'imaging', 'vaccination',
      'surgery', 'consultation', 'discharge-summary', 'insurance', 'other', 'all'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  grantedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  revokedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Compound index to ensure unique doctor-patient pair
doctorAccessSchema.index({ patient: 1, doctor: 1 }, { unique: true });
doctorAccessSchema.index({ doctor: 1, isActive: 1 });
doctorAccessSchema.index({ patient: 1, isActive: 1 });

module.exports = mongoose.model('DoctorAccess', doctorAccessSchema);
