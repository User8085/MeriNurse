const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { DatabaseSync } = require('node:sqlite');

class IndianMedicineService {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'medicines.db');
    this.csvPath = path.join(__dirname, '..', '..', 'updated_indian_medicine_data - Copy.csv');
    this.db = null;
  }

  // Parse a CSV line handling quotes and escaped characters
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // Initialize the database and compile from CSV if necessary
  initialize() {
    if (this.db) return true;

    try {
      const dbExists = fs.existsSync(this.dbPath);
      
      if (!dbExists) {
        console.log('📦 Indian Medicine SQLite DB not found. Compiling from CSV...');
        if (!fs.existsSync(this.csvPath)) {
          console.error(`❌ CSV File not found at: ${this.csvPath}`);
          return false;
        }
        
        this.compileDatabase();
      } else {
        this.db = new DatabaseSync(this.dbPath);
        console.log('✅ Indian Medicine Database connected successfully');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Indian Medicine Database:', error.message);
      return false;
    }
  }

  // Compile CSV into SQLite
  compileDatabase() {
    const startTime = Date.now();
    this.db = new DatabaseSync(this.dbPath);

    // Create schema
    this.db.exec(`
      CREATE TABLE medicines (
        id INTEGER PRIMARY KEY,
        name TEXT,
        price REAL,
        manufacturer TEXT,
        salt_composition TEXT,
        desc TEXT,
        side_effects TEXT,
        drug_interactions TEXT
      )
    `);

    // Create index for name searches
    this.db.exec(`CREATE INDEX idx_medicines_name ON medicines(name)`);

    const insertStmt = this.db.prepare(`
      INSERT INTO medicines (id, name, price, manufacturer, salt_composition, desc, side_effects, drug_interactions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const fileStream = fs.createReadStream(this.csvPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let count = 0;
    let headers = null;

    // Use synchronous reading because database execution is synchronous
    // We will accumulate lines and perform batch inserts or transact
    this.db.exec('BEGIN TRANSACTION');

    const lines = [];
    
    // We can parse line-by-line using a generator or async iterator
    // In Node.js readline, we can process sync in loop
    // But since this runs once, let's parse it efficiently
    console.log('Reading CSV rows and building index...');
    
    // We run a sync loop to insert all rows
    const fileContent = fs.readFileSync(this.csvPath, 'utf8');
    const allLines = fileContent.split(/\r?\n/);
    
    for (const line of allLines) {
      if (!line.trim()) continue;
      
      if (count === 0) {
        headers = this.parseCSVLine(line);
        count++;
        continue;
      }

      const fields = this.parseCSVLine(line);
      if (fields.length >= headers.length) {
        const med = {};
        headers.forEach((header, index) => {
          med[header] = fields[index];
        });

        const priceNum = parseFloat(med.price) || 0;

        try {
          insertStmt.run(
            parseInt(med.id) || count,
            med.name || '',
            priceNum,
            med.manufacturer_name || '',
            med.salt_composition || '',
            med.medicine_desc || '',
            med.side_effects || '',
            med.drug_interactions || ''
          );
        } catch (err) {
          // Ignore duplicate keys or malformed entries
        }
      }
      count++;
    }

    this.db.exec('COMMIT');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ SQLite Database compiled in ${duration}s. Seeded ${count - 1} medicines.`);
  }

  // Pattern search by brand name or salt composition
  searchMedicines(query, limit = 10) {
    this.initialize();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT id, name, price, manufacturer, salt_composition, desc, side_effects, drug_interactions 
        FROM medicines 
        WHERE name LIKE ? OR salt_composition LIKE ? 
        LIMIT ?
      `);
      const searchPattern = `%${query}%`;
      return stmt.all(searchPattern, searchPattern, limit);
    } catch (error) {
      console.error('Search query error:', error.message);
      return [];
    }
  }

  // Exact or closest search by brand name
  getMedicineByName(name) {
    this.initialize();
    if (!this.db) return null;

    try {
      // Direct exact match
      const stmtExact = this.db.prepare(`SELECT * FROM medicines WHERE name = ? LIMIT 1`);
      const exact = stmtExact.get(name);
      if (exact) return exact;

      // Fuzzy / containing match
      const stmtLike = this.db.prepare(`SELECT * FROM medicines WHERE name LIKE ? LIMIT 1`);
      return stmtLike.get(`%${name}%`);
    } catch (error) {
      console.error('Lookup by name error:', error.message);
      return null;
    }
  }

  // Get medicine by ID
  getMedicineById(id) {
    this.initialize();
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare(`SELECT * FROM medicines WHERE id = ?`);
      return stmt.get(id);
    } catch (error) {
      console.error('Lookup by ID error:', error.message);
      return null;
    }
  }

  // Check prescribed medicines against patient allergies
  detectAllergies(patientAllergies, prescribedMeds) {
    if (!patientAllergies || patientAllergies.length === 0 || !prescribedMeds || prescribedMeds.length === 0) {
      return [];
    }

    const ALLERGY_CLASSES = {
      penicillin: ['amoxicillin', 'amoxycillin', 'ampicillin', 'cloxacillin', 'penicillin', 'piperacillin', 'clavulanic', 'clavulanate', 'augmentin'],
      nsaid: ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen', 'aceclofenac', 'ketorolac', 'mefenamic', 'indomethacin', 'piroxicam', 'meloxicam'],
      aspirin: ['aspirin', 'salicylic', 'salicylate'],
      sulfa: ['sulfamethoxazole', 'trimethoprim', 'sulfa', 'dapsone', 'sulfasalazine'],
      sulfonamide: ['sulfamethoxazole', 'trimethoprim', 'sulfa', 'dapsone', 'sulfasalazine'],
      fluoroquinolone: ['ciprofloxacin', 'ofloxacin', 'levofloxacin', 'norfloxacin', 'moxifloxacin'],
      macrolide: ['azithromycin', 'erythromycin', 'clarithromycin', 'roxithromycin'],
      cephalosporin: ['ceftriaxone', 'cefuroxime', 'cefixime', 'cephalexin', 'cefaclor', 'cefadroxil']
    };

    const warnings = [];

    // Helper to normalize string for comparison (handling alternate spellings)
    const normalize = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/y/g, 'i') // normalize amoxycillin -> amoxicillin
        .trim();
    };

    for (const med of prescribedMeds) {
      // Find the medicine in local DB to get its composition
      const dbMed = this.getMedicineByName(med.name);
      const brandName = med.name;
      const saltComposition = dbMed ? dbMed.salt_composition : '';
      const description = dbMed ? dbMed.desc : '';

      const normalizedBrand = normalize(brandName);
      const normalizedSalt = normalize(saltComposition);
      const normalizedDesc = normalize(description);

      for (const allergy of patientAllergies) {
        if (!allergy.allergen || allergy.isActive === false) continue;

        const allergen = allergy.allergen.toLowerCase().trim();
        const normalizedAllergen = normalize(allergen);

        let isMatch = false;
        let matchReason = '';

        // 1. Direct name match (e.g. allergen "augmentin" or "amoxicillin")
        if (
          normalizedBrand.includes(normalizedAllergen) || 
          normalizedSalt.includes(normalizedAllergen)
        ) {
          isMatch = true;
          matchReason = `Prescribed medicine '${brandName}' contains or matches allergen '${allergy.allergen}'.`;
        }

        // 2. Class-based matching
        if (!isMatch) {
          // Check if allergy represents a class
          for (const [className, classDrugs] of Object.entries(ALLERGY_CLASSES)) {
            if (allergen.includes(className)) {
              // Allergen is something like "Penicillin" or "NSAID". Let's check if the drug matches
              for (const drug of classDrugs) {
                const normalizedDrug = normalize(drug);
                if (
                  normalizedBrand.includes(normalizedDrug) || 
                  normalizedSalt.includes(normalizedDrug) ||
                  normalizedDesc.includes(normalizedDrug)
                ) {
                  isMatch = true;
                  matchReason = `Prescribed medicine '${brandName}' belongs to or contains components of the '${allergy.allergen}' drug class (matched: ${drug}).`;
                  break;
                }
              }
            }
            if (isMatch) break;
          }
        }

        // 3. Check reverse class: does the allergen belong to a class that is present in the medicine description/salt?
        if (!isMatch) {
          // If allergen is a specific drug (e.g. "amoxicillin"), find if it belongs to a class and if the prescribed med is of that class
          for (const [className, classDrugs] of Object.entries(ALLERGY_CLASSES)) {
            if (classDrugs.some(drug => normalize(drug) === normalizedAllergen)) {
              // The allergen is in this class. Let's see if the prescribed med belongs to the same class
              const isMedInClass = classDrugs.some(drug => {
                const normalizedDrug = normalize(drug);
                return normalizedBrand.includes(normalizedDrug) || normalizedSalt.includes(normalizedDrug);
              });
              if (isMedInClass) {
                isMatch = true;
                matchReason = `Prescribed medicine '${brandName}' has cross-reactivity with '${allergy.allergen}' because both belong to the same drug family/class.`;
                break;
              }
            }
          }
        }

        if (isMatch) {
          warnings.push({
            allergen: allergy.allergen,
            severity: allergy.severity,
            reaction: allergy.reaction || 'Unknown reaction',
            matchedMedication: brandName,
            description: matchReason
          });
        }
      }
    }

    return warnings;
  }
}

module.exports = new IndianMedicineService();
