const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const DoctorAccess = require('../models/DoctorAccess');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const geminiService = require('../services/geminiService');
const drugService = require('../services/drugService');

// @route   GET /api/prescriptions
// @desc    Get prescriptions for patient or shared patients
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } else {
      // Doctor: show prescriptions they created (prescribedBy) OR from access-granted patients
      const accessList = await DoctorAccess.find({ doctor: req.user._id, isActive: true });
      const accessPatientIds = accessList.map(a => a.patient);

      if (req.query.patientId) {
        query.patient = req.query.patientId;
        // Allow doctor to view if they created it or have access
        query.$or = [
          { prescribedBy: req.user._id },
          { patient: { $in: accessPatientIds } }
        ];
      } else {
        // Show all prescriptions the doctor created or has access to
        query.$or = [
          { prescribedBy: req.user._id },
          { patient: { $in: accessPatientIds } }
        ];
      }
    }

    if (req.query.active === 'true') query.isActive = true;

    const prescriptions = await Prescription.find(query)
      .populate('patient', 'firstName lastName email')
      .populate('prescribedBy', 'firstName lastName specialization')
      .sort({ prescriptionDate: -1 });

    res.json({ success: true, data: prescriptions });
  } catch (error) {
    console.error('Get Prescriptions Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/prescriptions
// @desc    Create prescription (by doctor or patient upload)
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    const { medications, diagnosis, notes, patientId, doctorName } = req.body;

    let parsedMedications = [];
    if (medications) {
      parsedMedications = typeof medications === 'string' ? JSON.parse(medications) : medications;
    }

    let patient = req.user._id;
    let prescribedBy = null;

    if (req.user.role === 'doctor' && patientId) {
      // Verify the patient exists
      const patientUser = await require('../models/User').findOne({ _id: patientId, role: 'patient', isActive: true });
      if (!patientUser) return res.status(404).json({ success: false, message: 'Patient not found' });
      patient = patientId;
      prescribedBy = req.user._id;
    }

    const prescriptionData = {
      patient,
      prescribedBy,
      doctorName: doctorName || (req.user.role === 'doctor' ? req.user.fullName : undefined),
      medications: parsedMedications,
      diagnosis,
      notes
    };

    if (req.file) {
      prescriptionData.file = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      };

      // AI extraction from prescription image
      if (req.file.mimetype.startsWith('image/')) {
        const extraction = await geminiService.analyzeDocument(req.file.path, 'prescription');
        if (extraction.success) {
          prescriptionData.aiExtraction = {
            rawText: extraction.analysis,
            extractedAt: extraction.analyzedAt
          };
        }
      }
    }

    // Check drug interactions if multiple medications
    if (parsedMedications.length >= 2) {
      const rxcuiList = [];
      for (const med of parsedMedications) {
        if (med.rxcui) {
          rxcuiList.push(med.rxcui);
        } else {
          const result = await drugService.getRxCUI(med.name);
          if (result.success) {
            rxcuiList.push(result.rxcui);
            med.rxcui = result.rxcui;
          }
        }
      }

      if (rxcuiList.length >= 2) {
        const interactions = await drugService.checkInteractions(rxcuiList);
        if (interactions.success && interactions.data.length > 0) {
          prescriptionData.interactionWarnings = interactions.data.map(i => ({
            drug1: i.drug1,
            drug2: i.drug2,
            severity: i.severity === 'high' ? 'severe' : i.severity === 'low' ? 'mild' : 'moderate',
            description: i.description
          }));
        }
      }
    }

    // Detect allergies
    const Allergy = require('../models/Allergy');
    const indianMedicineService = require('../services/indianMedicineService');
    const patientAllergies = await Allergy.find({ patient, isActive: true });
    
    const allergyWarnings = indianMedicineService.detectAllergies(patientAllergies, parsedMedications);
    if (allergyWarnings && allergyWarnings.length > 0) {
      prescriptionData.allergyWarnings = allergyWarnings;
    }

    const prescription = await Prescription.create(prescriptionData);
    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    console.error('Create Prescription Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating prescription' });
  }
});

// @route   PUT /api/prescriptions/:id
// @desc    Update prescription
router.put('/:id', protect, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ success: false, message: 'Not found' });

    if (prescription.patient.toString() !== req.user._id.toString() && req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updates = {};
    const allowed = ['medications', 'diagnosis', 'notes', 'isActive'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const updated = await Prescription.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update Prescription Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/prescriptions/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ success: false, message: 'Not found' });
    if (prescription.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await prescription.deleteOne();
    res.json({ success: true, message: 'Prescription deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
