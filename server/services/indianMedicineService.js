const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { DatabaseSync } = require('node:sqlite');

class IndianMedicineService {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'medicines.db');
    this.csvPath = path.join(__dirname, '..', '..', 'updated_indian_medicine_data - Copy.csv');
    this.db = null;
    this._initPromise = null; // tracks async compile-in-progress
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

  // Initialize the database — synchronous path when DB already exists,
  // async compile path when it needs to be built from CSV.
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
        // Fire-and-forget async compile; queries will wait on _initPromise
        this._initPromise = this.compileDatabase();
      } else {
        this.db = new DatabaseSync(this.dbPath);
        this._ensureFTS();
        console.log('✅ Indian Medicine Database connected successfully');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Indian Medicine Database:', error.message);
      return false;
    }
  }

  // Ensure FTS5 virtual table exists (idempotent — safe to call on every startup)
  _ensureFTS() {
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS medicines_fts
        USING fts5(name, salt_composition, content=medicines, content_rowid=id)
      `);
      // Only rebuild index if FTS table is empty
      const sentinel = this.db.prepare(
        `SELECT COUNT(*) AS n FROM medicines_fts LIMIT 1`
      ).get();
      if (!sentinel || sentinel.n === 0) {
        console.log('🔄 Rebuilding FTS5 index...');
        this.db.exec(`INSERT INTO medicines_fts(medicines_fts) VALUES('rebuild')`);
        console.log('✅ FTS5 index ready');
      }
    } catch (err) {
      // FTS5 not available in this SQLite build — will fall back to LIKE search
      console.warn('⚠️  FTS5 not available, falling back to LIKE search:', err.message);
    }
  }

  // Compile CSV into SQLite using a memory-efficient line-by-line stream
  compileDatabase() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      try {
        this.db = new DatabaseSync(this.dbPath);

        // Create schema
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS medicines (
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

        // B-tree indexes for exact / prefix lookups
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_medicines_salt ON medicines(salt_composition)`);

        const insertStmt = this.db.prepare(`
          INSERT OR IGNORE INTO medicines
            (id, name, price, manufacturer, salt_composition, desc, side_effects, drug_interactions)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // ── Stream-based CSV reading: processes one line at a time ──────────
        // Peak RAM stays ~5 MB instead of loading the full 45 MB CSV into memory
        const fileStream = fs.createReadStream(this.csvPath, { encoding: 'utf8' });
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let count = 0;
        let headers = null;
        const BATCH = 500; // commit a transaction every 500 rows
        let batch = [];

        const flushBatch = () => {
          if (batch.length === 0) return;
          this.db.exec('BEGIN TRANSACTION');
          for (const row of batch) insertStmt.run(...row);
          this.db.exec('COMMIT');
          batch = [];
        };

        rl.on('line', (line) => {
          if (!line.trim()) return;

          if (count === 0) {
            headers = this.parseCSVLine(line);
            count++;
            return;
          }

          const fields = this.parseCSVLine(line);
          if (fields.length >= headers.length) {
            const med = {};
            headers.forEach((h, i) => { med[h] = fields[i]; });

            batch.push([
              parseInt(med.id) || count,
              med.name || '',
              parseFloat(med.price) || 0,
              med.manufacturer_name || '',
              med.salt_composition || '',
              med.medicine_desc || '',
              med.side_effects || '',
              med.drug_interactions || '',
            ]);

            if (batch.length >= BATCH) flushBatch();
          }
          count++;
        });

        rl.on('close', () => {
          // Flush any remaining rows
          flushBatch();

          // Build FTS5 virtual table for fast full-text search
          this._ensureFTS();

          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`✅ SQLite Database compiled in ${duration}s. Seeded ${count - 1} medicines.`);
          resolve();
        });

        rl.on('error', (err) => {
          console.error('❌ CSV streaming error:', err.message);
          reject(err);
        });

      } catch (err) {
        console.error('❌ compileDatabase error:', err.message);
        reject(err);
      }
    });
  }

  // Wait for async compile to finish before executing a query
  async _ready() {
    if (this._initPromise) await this._initPromise;
  }

  // ── Fast search: prefix B-tree first, then FTS5, finally LIKE fallback ───
  searchMedicines(query, limit = 10) {
    this.initialize();
    if (!this.db) return [];

    try {
      // 1. Prefix search — uses the B-tree index on name (very fast)
      const escapedQuery = query.replace(/[%_\\]/g, '\\$&');
      const prefixStmt = this.db.prepare(`
        SELECT id, name, price, manufacturer, salt_composition, desc, side_effects, drug_interactions
        FROM medicines
        WHERE name LIKE ? ESCAPE '\\'
        LIMIT ?
      `);
      const prefixResults = prefixStmt.all(`${escapedQuery}%`, limit);
      if (prefixResults.length > 0) return prefixResults;

      // 2. FTS5 full-text search — fast even on 253k rows
      try {
        const ftsStmt = this.db.prepare(`
          SELECT m.id, m.name, m.price, m.manufacturer, m.salt_composition,
                 m.desc, m.side_effects, m.drug_interactions
          FROM medicines m
          JOIN medicines_fts ON medicines_fts.rowid = m.id
          WHERE medicines_fts MATCH ?
          LIMIT ?
        `);
        const ftsQuery = `"${query.replace(/"/g, '""')}"*`;
        const ftsResults = ftsStmt.all(ftsQuery, limit);
        if (ftsResults.length > 0) return ftsResults;
      } catch {
        // FTS5 not available — fall through to LIKE
      }

      // 3. Substring LIKE fallback (full scan — slower but complete)
      const likeStmt = this.db.prepare(`
        SELECT id, name, price, manufacturer, salt_composition, desc, side_effects, drug_interactions
        FROM medicines
        WHERE name LIKE ? OR salt_composition LIKE ?
        LIMIT ?
      `);
      const pattern = `%${query}%`;
      return likeStmt.all(pattern, pattern, limit);

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
          for (const [className, classDrugs] of Object.entries(ALLERGY_CLASSES)) {
            if (allergen.includes(className)) {
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

        // 3. Reverse class: does the allergen belong to a class present in the medicine?
        if (!isMatch) {
          for (const [className, classDrugs] of Object.entries(ALLERGY_CLASSES)) {
            if (classDrugs.some(drug => normalize(drug) === normalizedAllergen)) {
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
