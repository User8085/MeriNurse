const mongoose = require('mongoose');

const allergySchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  allergen: {
    type: String,
    required: [true, 'Allergen name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['drug', 'food', 'environmental', 'other'],
    required: true
  },
  severity: {
    type: String,
    enum: ['mild', 'moderate', 'severe', 'life-threatening'],
    required: true
  },
  reaction: {
    type: String,
    trim: true
  },
  diagnosedDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

allergySchema.index({ patient: 1, type: 1 });

module.exports = mongoose.model('Allergy', allergySchema);
