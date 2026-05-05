const fs   = require('fs');
const path = require('path');
const axios = require('axios');
const { cachedFetch, zipKey } = require('./cache');

// ─────────────────────────────────────────
// IRS Statistics of Income (SOI) — ZIP-Level AGI
// Source: https://www.irs.gov/statistics/soi-tax-stats-individual-income-tax-statistics-zip-code-data-soi
// File: 2021 ZIP Code Data (most recent available)
// Returns: adjusted gross income per return for ZIP — more current than Census ACS 5-year
// ─────────────────────────────────────────

const DATA_FILE = path.join(__dirname, '../data/irs-soi.json');
const SOI_CSV_URL = 'https://www.irs.gov/pub/irs-soi/21zpallagi.csv';

let _soiData = null; // in-memory after first load

async function ensureSoiData() {
  if (_soiData) return _soiData;

  // Try loading from cached local file first
  if (fs.existsSync(DATA_FILE)) {
    try {
      _soiData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      console.log(`[IRS-SOI] Loaded ${Object.keys(_soiData).length} ZIP records from local cache`);
      return _soiData;
    } catch {}
  }

  // Download and process
  console.log('[IRS-SOI] Downloading SOI ZIP data from IRS...');
  try {
    const resp = await axios.get(SOI_CSV_URL, { timeout: 60000, responseType: 'text' });
    _soiData = parseSoiCsv(resp.data);
    fs.writeFileSync(DATA_FILE, JSON.stringify(_soiData), 'utf8');
    console.log(`[IRS-SOI] Processed and cached ${Object.keys(_soiData).length} ZIP records`);
    return _soiData;
  } catch (err) {
    console.error('[IRS-SOI] Download failed:', err.message);
    return null;
  }
}

function parseSoiCsv(csv) {
  const lines  = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toUpperCase());

  // Key columns in IRS SOI ZIP file:
  // ZIPCODE, N1 (returns), A00100 (AGI $000s), A02650 (total income $000s), N2 (exemptions)
  const zipIdx  = headers.indexOf('ZIPCODE');
  const n1Idx   = headers.indexOf('N1');    // number of returns
  const agiIdx  = headers.indexOf('A00100'); // total AGI in $000s
  const incIdx  = headers.indexOf('A02650'); // total income $000s (fallback)

  const result = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const zip  = (cols[zipIdx] || '').padStart(5, '0');
    if (!zip || zip === '00000' || zip === '99999') continue;

    const returns = parseInt(cols[n1Idx]) || 0;
    const agiTotal = parseFloat(cols[agiIdx]) || parseFloat(cols[incIdx]) || 0;

    if (returns === 0) continue;

    // AGI per return in actual dollars (SOI reports in $000s)
    const agiPerReturn = Math.round((agiTotal * 1000) / returns);

    if (!result[zip] || result[zip].returns < returns) {
      // SOI has multiple income brackets per ZIP — sum them
      if (!result[zip]) {
        result[zip] = { returns: 0, agi_total_000s: 0 };
      }
      result[zip].returns       += returns;
      result[zip].agi_total_000s += agiTotal;
    }
  }

  // Compute per-return after aggregation
  Object.keys(result).forEach(zip => {
    const d = result[zip];
    d.agi_per_return = d.returns > 0
      ? Math.round((d.agi_total_000s * 1000) / d.returns)
      : null;
    delete d.agi_total_000s;
  });

  return result;
}

async function fetchIrsSoi(zip) {
  if (!zip) return _fallback(zip);
  const cleanZip = String(zip).padStart(5, '0');
  const key = zipKey('irs-soi', cleanZip);

  return cachedFetch(key, async () => {
    const data = await ensureSoiData();
    if (!data) return _fallback(cleanZip);

    const record = data[cleanZip];
    if (!record) {
      console.warn(`[IRS-SOI] No data for ZIP ${cleanZip}`);
      return _fallback(cleanZip);
    }

    console.log(`[IRS-SOI] ZIP ${cleanZip}: AGI/return = $${record.agi_per_return?.toLocaleString()}`);
    return {
      zip:            cleanZip,
      agi_per_return: record.agi_per_return,
      returns:        record.returns,
      source:         'IRS SOI ZIP Code Data 2021',
      note:           'Adjusted Gross Income per tax return — more current than Census ACS',
    };
  }, 365); // annual data — cache for a year
}

function _fallback(zip) {
  return { zip, agi_per_return: null, source: 'IRS SOI unavailable', note: null };
}

module.exports = { fetchIrsSoi };

// CHECKPOINT — 2026-04-16
// Completed: IRS SOI ZIP-level AGI fetch with local CSV download + JSON cache
//            Parses 21zpallagi.csv, aggregates brackets per ZIP, stores in data/irs-soi.json
//            In-memory after first load — fast subsequent lookups
// State: working
// Next: Task 6 — commute mode added to census.js
// Dependencies: cache.js
