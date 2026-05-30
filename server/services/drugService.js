const axios = require('axios');

class DrugService {
  constructor() {
    this.openfdaBase = 'https://api.fda.gov/drug';
    this.rxnavBase = 'https://rxnav.nlm.nih.gov/REST';
  }

  // Search for drug information using OpenFDA
  async searchDrug(drugName) {
    try {
      const params = {
        search: `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`,
        limit: 3
      };
      if (process.env.OPENFDA_API_KEY) {
        params.api_key = process.env.OPENFDA_API_KEY;
      }
      const response = await axios.get(`${this.openfdaBase}/label.json`, {
        params,
        timeout: 10000
      });

      if (response.data.results && response.data.results.length > 0) {
        const drug = response.data.results[0];
        return {
          success: true,
          data: {
            brandName: drug.openfda?.brand_name?.[0] || drugName,
            genericName: drug.openfda?.generic_name?.[0] || 'N/A',
            manufacturer: drug.openfda?.manufacturer_name?.[0] || 'N/A',
            purpose: drug.purpose?.[0] || drug.indications_and_usage?.[0]?.substring(0, 300) || 'N/A',
            warnings: drug.warnings?.[0]?.substring(0, 500) || 'No warnings available',
            dosage: drug.dosage_and_administration?.[0]?.substring(0, 500) || 'Consult your doctor',
            sideEffects: drug.adverse_reactions?.[0]?.substring(0, 500) || 'Consult package insert',
            interactions: drug.drug_interactions?.[0]?.substring(0, 500) || 'No interaction data available'
          }
        };
      }

      return { success: false, message: 'Drug not found in FDA database' };
    } catch (error) {
      console.error('OpenFDA Error:', error.message);
      return { success: false, message: 'Unable to fetch drug information' };
    }
  }

  // Get drug adverse events from OpenFDA
  async getDrugAdverseEvents(drugName) {
    try {
      const params = {
        search: `patient.drug.medicinalproduct:"${drugName}"`,
        count: 'patient.reaction.reactionmeddrapt.exact',
        limit: 10
      };
      if (process.env.OPENFDA_API_KEY) {
        params.api_key = process.env.OPENFDA_API_KEY;
      }
      const response = await axios.get(`${this.openfdaBase}/event.json`, {
        params,
        timeout: 10000
      });

      if (response.data.results) {
        return {
          success: true,
          data: response.data.results.map(r => ({
            reaction: r.term,
            count: r.count
          }))
        };
      }

      return { success: false, message: 'No adverse events found' };
    } catch (error) {
      console.error('OpenFDA Adverse Events Error:', error.message);
      return { success: false, message: 'Unable to fetch adverse events' };
    }
  }

  // Get RxCUI (RxNorm Concept Unique Identifier) for a drug
  async getRxCUI(drugName) {
    try {
      const response = await axios.get(`${this.rxnavBase}/rxcui.json`, {
        params: { name: drugName },
        timeout: 10000
      });

      const idGroup = response.data?.idGroup;
      if (idGroup?.rxnormId?.length > 0) {
        return {
          success: true,
          rxcui: idGroup.rxnormId[0],
          name: idGroup.name
        };
      }

      return { success: false, message: 'Drug not found in RxNorm' };
    } catch (error) {
      console.error('RxNav Error:', error.message);
      return { success: false, message: 'Unable to lookup drug identifier' };
    }
  }

  // Check drug interactions using RxNav
  async checkInteractions(rxcuiList) {
    if (!rxcuiList || rxcuiList.length < 2) {
      return { success: true, data: [], message: 'Need at least 2 drugs to check interactions' };
    }

    try {
      const response = await axios.get(`${this.rxnavBase}/interaction/list.json`, {
        params: { rxcuis: rxcuiList.join('+') },
        timeout: 15000
      });

      const interactions = [];
      const interactionGroups = response.data?.fullInteractionTypeGroup || [];

      for (const group of interactionGroups) {
        for (const type of (group.fullInteractionType || [])) {
          for (const pair of (type.interactionPair || [])) {
            interactions.push({
              severity: pair.severity || 'unknown',
              description: pair.description || 'No description available',
              drug1: type.minConcept?.[0]?.name || 'Unknown',
              drug2: type.minConcept?.[1]?.name || 'Unknown'
            });
          }
        }
      }

      return {
        success: true,
        data: interactions,
        count: interactions.length
      };
    } catch (error) {
      console.error('Drug Interaction Check Error:', error.message);
      return { success: false, message: 'Unable to check drug interactions' };
    }
  }

  // Get drug suggestions/autocomplete from RxNav
  async suggestDrugs(query) {
    try {
      const response = await axios.get(`${this.rxnavBase}/spellingsuggestions.json`, {
        params: { name: query },
        timeout: 5000
      });

      const suggestions = response.data?.suggestionGroup?.suggestionList?.suggestion || [];
      return {
        success: true,
        data: suggestions.slice(0, 10)
      };
    } catch (error) {
      console.error('Drug Suggestion Error:', error.message);
      return { success: false, message: 'Unable to fetch drug suggestions' };
    }
  }

  // Get drug class information from RxNav
  async getDrugClass(rxcui) {
    try {
      const response = await axios.get(`${this.rxnavBase}/rxclass/class/byRxcui.json`, {
        params: { rxcui: rxcui },
        timeout: 10000
      });

      const classes = response.data?.rxclassDrugInfoList?.rxclassDrugInfo || [];
      const classInfo = classes.map(c => ({
        className: c.rxclassMinConceptItem?.className || 'Unknown',
        classType: c.rxclassMinConceptItem?.classType || 'Unknown'
      }));

      return {
        success: true,
        data: [...new Map(classInfo.map(c => [c.className, c])).values()].slice(0, 5)
      };
    } catch (error) {
      console.error('Drug Class Error:', error.message);
      return { success: false, message: 'Unable to fetch drug classification' };
    }
  }
}

module.exports = new DrugService();
