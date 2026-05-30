const express = require('express');
const router = express.Router();
const ChatConversation = require('../models/ChatConversation');
const { protect } = require('../middleware/auth');
const geminiService = require('../services/geminiService');

// @route   GET /api/chat/conversations
// @desc    Get all conversations for the user
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await ChatConversation.find({ 
      user: req.user._id, 
      isActive: true 
    })
      .select('title context updatedAt messages')
      .sort({ updatedAt: -1 });

    // Return conversations with just the last message preview
    const data = conversations.map(c => ({
      _id: c._id,
      title: c.title,
      context: c.context,
      updatedAt: c.updatedAt,
      messageCount: c.messages.length,
      lastMessage: c.messages.length > 0 ? c.messages[c.messages.length - 1].content.substring(0, 100) : ''
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/chat/conversations/:id
// @desc    Get a specific conversation with all messages
router.get('/conversations/:id', protect, async (req, res) => {
  try {
    const conversation = await ChatConversation.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/chat/conversations
// @desc    Create a new conversation
router.post('/conversations', protect, async (req, res) => {
  try {
    const { title, context } = req.body;
    const conversation = await ChatConversation.create({
      user: req.user._id,
      title: title || 'New Conversation',
      context: context || 'general'
    });
    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/chat/conversations/:id/messages
// @desc    Send a message and get AI response
router.post('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const conversation = await ChatConversation.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: message
    });

    // Get AI response
    const aiResponse = await geminiService.chat(
      message, 
      conversation.messages.slice(0, -1), // Previous messages for context 
      conversation.context,
      req.user
    );

    // Add AI response
    let cleanResponseText = aiResponse.success ? aiResponse.message : 'I apologize, but I\'m having trouble responding right now. Please try again.';
    
    if (aiResponse.success) {
      const addAllergyRegex = /\[ADD_ALLERGY:\s*({.*?})\s*\]/;
      const match = cleanResponseText.match(addAllergyRegex);
      if (match) {
        try {
          const allergyData = JSON.parse(match[1]);
          const Allergy = require('../models/Allergy');

          let targetPatientId = req.user._id; // default: patient records for themselves

          if (req.user.role === 'doctor') {
            // For doctors: try to find the named patient in their accessible patients
            if (allergyData.patientName) {
              const DoctorAccess = require('../models/DoctorAccess');
              const User = require('../models/User');
              const accessList = await DoctorAccess.find({ doctor: req.user._id, isActive: true })
                .populate('patient', 'firstName lastName');
              const namedPatient = accessList.find(a => {
                const fullName = `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase();
                return fullName.includes(allergyData.patientName.toLowerCase());
              });
              if (namedPatient) targetPatientId = namedPatient.patient._id;
            } else {
              // Doctor didn't specify a patient name — skip auto-recording
              cleanResponseText = cleanResponseText.replace(addAllergyRegex, '').trim();
              targetPatientId = null;
            }
          }

          if (targetPatientId) {
            await Allergy.create({
              patient: targetPatientId,
              allergen: allergyData.allergen,
              type: allergyData.type || 'drug',
              severity: allergyData.severity || 'moderate',
              reaction: allergyData.reaction || 'Not specified',
              notes: req.user.role === 'doctor'
                ? `Recorded by Dr. ${req.user.firstName} ${req.user.lastName} via AI Clinical Assistant.`
                : 'Added conversationally via AI Health Assistant.'
            });
            cleanResponseText = cleanResponseText.replace(addAllergyRegex, '').trim();
          }
        } catch (err) {
          console.error('Error parsing and adding allergy from chatbot:', err.message);
          cleanResponseText = cleanResponseText.replace(addAllergyRegex, '').trim();
        }
      }
    }

    const assistantMessage = {
      role: 'assistant',
      content: cleanResponseText
    };
    conversation.messages.push(assistantMessage);

    // Auto-title from first message
    if (conversation.messages.length === 2 && conversation.title === 'New Conversation') {
      conversation.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    await conversation.save();

    res.json({
      success: true,
      data: {
        userMessage: conversation.messages[conversation.messages.length - 2],
        assistantMessage: conversation.messages[conversation.messages.length - 1]
      }
    });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/chat/quick
// @desc    Quick chat without saving conversation
router.post('/quick', protect, async (req, res) => {
  try {
    const { message, context } = req.body;
    const response = await geminiService.chat(message, [], context || 'general', req.user);
    
    let cleanResponseText = response.success ? response.message : 'I apologize, but I\'m having trouble responding right now. Please try again.';
    
    if (response.success) {
      const addAllergyRegex = /\[ADD_ALLERGY:\s*({.*?})\s*\]/;
      const match = cleanResponseText.match(addAllergyRegex);
      if (match) {
        try {
          const allergyData = JSON.parse(match[1]);
          const Allergy = require('../models/Allergy');
          let targetPatientId = req.user._id;
          if (req.user.role === 'doctor') {
            if (allergyData.patientName) {
              const DoctorAccess = require('../models/DoctorAccess');
              const accessList = await DoctorAccess.find({ doctor: req.user._id, isActive: true })
                .populate('patient', 'firstName lastName');
              const namedPatient = accessList.find(a => {
                const fullName = `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase();
                return fullName.includes(allergyData.patientName.toLowerCase());
              });
              if (namedPatient) targetPatientId = namedPatient.patient._id;
              else targetPatientId = null;
            } else {
              targetPatientId = null;
            }
          }
          if (targetPatientId) {
            await Allergy.create({
              patient: targetPatientId,
              allergen: allergyData.allergen,
              type: allergyData.type || 'drug',
              severity: allergyData.severity || 'moderate',
              reaction: allergyData.reaction || 'Not specified',
              notes: req.user.role === 'doctor'
                ? `Recorded by Dr. ${req.user.firstName} ${req.user.lastName} via AI Clinical Assistant (Quick Chat).`
                : 'Added conversationally via AI Health Assistant (Quick Chat).'
            });
          }
          cleanResponseText = cleanResponseText.replace(addAllergyRegex, '').trim();
        } catch (err) {
          console.error('Error parsing and adding allergy from quick chatbot:', err.message);
          cleanResponseText = cleanResponseText.replace(addAllergyRegex, '').trim();
        }
      }
    }
    
    res.json({ success: true, data: { success: response.success, message: cleanResponseText } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/chat/conversations/:id
router.delete('/conversations/:id', protect, async (req, res) => {
  try {
    const conversation = await ChatConversation.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!conversation) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
