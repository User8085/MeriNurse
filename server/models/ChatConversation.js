const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    mimetype: String,
    path: String
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation',
    trim: true
  },
  messages: [messageSchema],
  context: {
    type: String,
    enum: ['general', 'symptom-check', 'medication', 'nutrition', 'mental-health'],
    default: 'general'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

chatConversationSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);
