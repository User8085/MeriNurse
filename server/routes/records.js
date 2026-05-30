const express = require('express');
const router = express.Router();
const MedicalRecord = require('../models/MedicalRecord');
const DoctorAccess = require('../models/DoctorAccess');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const geminiService = require('../services/geminiService');

// Helper to parse allergies, structured extracted data, and clean analysis summary
function processAnalysis(analysisText) {
  let detectedAllergies = [];
  let extractedData = {};
  let cleanSummary = analysisText || '';

  if (analysisText) {
    // 1. Extract detected allergies block
    const allergyMatch = analysisText.match(/DETECTED_ALLERGIES_JSON:\s*(\[.*?\])/s);
    if (allergyMatch) {
      try {
        detectedAllergies = JSON.parse(allergyMatch[1]);
        cleanSummary = cleanSummary.replace(/DETECTED_ALLERGIES_JSON:\s*\[.*?\]/gs, '').trim();
      } catch (e) {
        console.error('Failed to parse DETECTED_ALLERGIES_JSON:', e.message);
      }
    }

    // 2. Extract structured clinical data block (EXTRACTED_DATA_JSON)
    const dataMatch = cleanSummary.match(/EXTRACTED_DATA_JSON:\s*(\{[\s\S]*?\})\s*$/);
    if (dataMatch) {
      try {
        extractedData = JSON.parse(dataMatch[1]);
        cleanSummary = cleanSummary.replace(/EXTRACTED_DATA_JSON:\s*\{[\s\S]*?\}\s*$/, '').trim();
      } catch (e) {
        console.error('Failed to parse EXTRACTED_DATA_JSON:', e.message);
      }
    }
  }

  // Merge allergies into structured data
  if (detectedAllergies.length > 0) {
    extractedData.detectedAllergies = detectedAllergies;
  }

  return { detectedAllergies, extractedData, cleanSummary };
}

// @route   GET /api/records
// @desc    Get all records for current patient, or shared records for doctor
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } else if (req.user.role === 'doctor') {
      // Get patients who have shared access with this doctor
      const accessList = await DoctorAccess.find({ 
        doctor: req.user._id, 
        isActive: true 
      });
      const patientIds = accessList.map(a => a.patient);
      query.patient = { $in: patientIds };

      // Filter by granted categories
      if (req.query.patientId) {
        const access = accessList.find(a => a.patient.toString() === req.query.patientId);
        if (access && !access.grantedCategories.includes('all')) {
          query.category = { $in: access.grantedCategories };
        }
        query.patient = req.query.patientId;
      }
    }

    if (req.query.category) query.category = req.query.category;
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const records = await MedicalRecord.find(query)
      .populate('patient', 'firstName lastName email')
      .sort({ recordDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MedicalRecord.countDocuments(query);

    res.json({
      success: true,
      data: records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get Records Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching records' });
  }
});

// @route   GET /api/records/:id
// @desc    Get single record by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patient', 'firstName lastName email');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    // Check access
    if (req.user.role === 'patient' && record.patient._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.user.role === 'doctor') {
      const access = await DoctorAccess.findOne({
        patient: record.patient._id,
        doctor: req.user._id,
        isActive: true
      });
      if (!access) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Get Record Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/records
// @desc    Create a new medical record with file upload
router.post('/', protect, upload.array('files', 5), async (req, res) => {
  try {
    const { title, category, description, doctorName, hospitalName, recordDate, notes, tags } = req.body;

    // Determine patient ID based on role
    let patientId = req.user._id;
    if (req.user.role === 'doctor' && req.body.patientId) {
      // Doctor uploading for a patient - check access
      const access = await DoctorAccess.findOne({
        patient: req.body.patientId,
        doctor: req.user._id,
        isActive: true,
        accessLevel: { $in: ['view-upload', 'full'] }
      });
      if (!access) {
        return res.status(403).json({ success: false, message: 'No upload permission for this patient' });
      }
      patientId = req.body.patientId;
    }

    const files = req.files ? req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path
    })) : [];

    const recordData = {
      patient: patientId,
      title,
      category,
      description,
      files,
      doctorName,
      hospitalName,
      recordDate: recordDate || Date.now(),
      notes,
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : []
    };

    const record = await MedicalRecord.create(recordData);

    // If files uploaded, trigger AI analysis in background
    if (files.length > 0 && files[0].mimetype.startsWith('image/')) {
      // Map category to the most specific analysis type
      const analysisTypeMap = {
        'lab-report': 'lab-report',
        'prescription': 'prescription',
        'imaging': 'imaging',
        'discharge-summary': 'discharge-summary',
        'consultation': 'consultation',
      };
      const bgAnalysisType = analysisTypeMap[category] || 'general';
      geminiService.analyzeDocument(files[0].path, bgAnalysisType)
        .then(async (analysis) => {
          if (analysis.success) {
            const { extractedData, cleanSummary } = processAnalysis(analysis.analysis);
            await MedicalRecord.findByIdAndUpdate(record._id, {
              aiAnalysis: {
                summary: cleanSummary,
                extractedData,
                analyzedAt: analysis.analyzedAt
              }
            });
          }
        })
        .catch(err => console.error('Background AI analysis error:', err));
    }

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('Create Record Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating record' });
  }
});

// @route   PUT /api/records/:id
// @desc    Update a medical record
router.put('/:id', protect, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (record.patient.toString() !== req.user._id.toString() && req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const allowedUpdates = ['title', 'description', 'doctorName', 'hospitalName', 'notes', 'tags', 'category', 'isArchived'];
    const updates = {};
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const updated = await MedicalRecord.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update Record Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating record' });
  }
});

// @route   DELETE /api/records/:id
// @desc    Delete a medical record
router.delete('/:id', protect, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (record.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the patient can delete their records' });
    }

    await record.deleteOne();
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    console.error('Delete Record Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting record' });
  }
});

// @route   POST /api/records/:id/analyze
// @desc    Trigger AI analysis on a record's file (patient OR authorized doctor)
router.post('/:id/analyze', protect, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patient', 'firstName lastName email');
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    // Access check — patient owns it, OR doctor has an active access grant
    if (req.user.role === 'patient') {
      if (record.patient._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (req.user.role === 'doctor') {
      const access = await DoctorAccess.findOne({
        patient: record.patient._id,
        doctor: req.user._id,
        isActive: true
      });
      if (!access) {
        return res.status(403).json({ success: false, message: 'Access denied — patient has not shared records with you' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!record.files || record.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files to analyze' });
    }

    const file = record.files[0];
    const analysisTypeMap = {
      'lab-report': 'lab-report',
      'prescription': 'prescription',
      'imaging': 'imaging',
      'discharge-summary': 'discharge-summary',
      'consultation': 'consultation',
    };
    const analysisType = analysisTypeMap[record.category] || 'general';

    // Pass the viewing user so the AI can personalise the analysis perspective
    const analysis = await geminiService.analyzeDocument(file.path, analysisType, req.user, record.patient);

    if (analysis.success) {
      const { extractedData, cleanSummary } = processAnalysis(analysis.analysis);
      record.aiAnalysis = {
        summary: cleanSummary,
        extractedData,
        analyzedAt: analysis.analyzedAt
      };
      await record.save();
    }

    res.json({ success: true, data: { ...analysis, analysis: record.aiAnalysis?.summary } });
  } catch (error) {
    console.error('Analyze Record Error:', error);
    res.status(500).json({ success: false, message: 'Server error analyzing record' });
  }
});

module.exports = router;
