const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const drugService = require('../services/drugService');
const indianMedicineService = require('../services/indianMedicineService');

// @route   GET /api/drugs/search?name=aspirin
// @desc    Search for drug information
router.get('/search', protect, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, message: 'Drug name is required' });

    // Check Indian Medicine SQLite DB first
    const localMed = indianMedicineService.getMedicineByName(name);
    if (localMed) {
      return res.json({
        success: true,
        source: 'local',
        data: {
          brandName: localMed.name,
          genericName: localMed.salt_composition || 'N/A',
          manufacturer: localMed.manufacturer || 'N/A',
          purpose: localMed.desc || 'N/A',
          dosage: 'Consult physician or pharmacist.',
          warnings: 'Consult doctor before taking.',
          sideEffects: localMed.side_effects || 'N/A',
          interactions: localMed.drug_interactions || 'N/A',
          price: localMed.price,
          isIndianMedicine: true
        }
      });
    }

    // Fallback to FDA
    const result = await drugService.searchDrug(name);
    res.json(result);
  } catch (error) {
    console.error('Drug search error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/drugs/adverse-events?name=aspirin
// @desc    Get drug adverse events
router.get('/adverse-events', protect, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, message: 'Drug name is required' });

    const result = await drugService.getDrugAdverseEvents(name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/drugs/interactions
// @desc    Check drug interactions
router.post('/interactions', protect, async (req, res) => {
  try {
    const { drugNames } = req.body;
    if (!drugNames || drugNames.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 drug names required' });
    }

    // Get RxCUI for each drug
    const rxcuiList = [];
    const drugMap = {};

    for (const name of drugNames) {
      const result = await drugService.getRxCUI(name);
      if (result.success) {
        rxcuiList.push(result.rxcui);
        drugMap[result.rxcui] = name;
      }
    }

    if (rxcuiList.length < 2) {
      return res.json({ success: true, data: [], message: 'Could not identify enough drugs for interaction check' });
    }

    const interactions = await drugService.checkInteractions(rxcuiList);
    res.json(interactions);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/drugs/suggest?q=asp
// @desc    Get drug name suggestions
router.get('/suggest', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    // Search local database
    const localMatches = indianMedicineService.searchMedicines(q, 10);
    const localSuggestions = localMatches.map(m => m.name);

    if (localSuggestions.length > 0) {
      return res.json({ success: true, data: localSuggestions });
    }

    // Fallback to RxNav FDA Spellings Suggestions
    const result = await drugService.suggestDrugs(q);
    res.json(result);
  } catch (error) {
    console.error('Drug suggestion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/drugs/class/:rxcui
// @desc    Get drug classification
router.get('/class/:rxcui', protect, async (req, res) => {
  try {
    const result = await drugService.getDrugClass(req.params.rxcui);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
