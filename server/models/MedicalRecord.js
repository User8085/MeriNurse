const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Record title is required'],
    trim: true,
    maxlength: 200
  },
  category: {
    type: String,
    required: true,
    enum: [
      'lab-report', 'prescription', 'imaging', 'vaccination',
      'surgery', 'consultation', 'discharge-summary', 'insurance', 'other'
    ]
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  files: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  doctorName: {
    type: String,
    trim: true
  },
  hospitalName: {
    type: String,
    trim: true
  },
  recordDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  // AI-extracted data from uploaded files
  aiAnalysis: {
    summary: String,
    extractedData: mongoose.Schema.Types.Mixed,
    analyzedAt: Date
  },
  tags: [{ type: String, trim: true }],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

medicalRecordSchema.index({ patient: 1, category: 1 });
medicalRecordSchema.index({ patient: 1, recordDate: -1 });
medicalRecordSchema.index({ tags: 1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
