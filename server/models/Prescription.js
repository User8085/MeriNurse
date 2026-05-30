const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  prescribedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  doctorName: {
    type: String,
    trim: true
  },
  medications: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    dosage: {
      type: String,
      trim: true
    },
    frequency: {
      type: String,
      trim: true
    },
    duration: {
      type: String,
      trim: true
    },
    instructions: {
      type: String,
      trim: true
    },
    rxcui: {
      type: String // RxNorm Concept Unique Identifier
    }
  }],
  diagnosis: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  file: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  },
  // AI-extracted data from prescription image
  aiExtraction: {
    rawText: String,
    medications: mongoose.Schema.Types.Mixed,
    extractedAt: Date
  },
  // Drug interaction warnings
  interactionWarnings: [{
    drug1: String,
    drug2: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    description: String
  }],
  // Allergy warnings
  allergyWarnings: [{
    allergen: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe', 'life-threatening'] },
    reaction: String,
    matchedMedication: String,
    description: String
  }],
  prescriptionDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

prescriptionSchema.index({ patient: 1, isActive: 1 });
prescriptionSchema.index({ patient: 1, prescriptionDate: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
