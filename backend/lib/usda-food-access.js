const fs   = require('fs');
const path = require('path');
const axios = require('axios');
const { cachedFetch, tractKey } = require('./cache');

// ─────────────────────────────────────────
// USDA ERS Food Access Research Atlas
// Identifies food deserts by census tract
// Source: https://www.ers.usda.gov/data-products/food-access-research-atlas/
// Download: Food Access Research Atlas Data (2019) — CSV
//
// Key flags used:
//   LILATracts_1And10 — Low income + low access (1 mile urban / 10 miles rural) = food desert
//   LILATracts_halfAnd10 — stricter urban threshold (0.5 miles)
//   LA1and10 — Low access regardless of income
// ─────────────────────────────────────────

const DATA_FILE    = path.join(__dirname, '../data/usda-food-access.json');
const SOURCE_CSV   = path.join(__dirname, '../data/2019_Food_Access_Research_Atlas_Data/Food Access Research Atlas.csv');

let _atlasData = null;

async function ensureAtlasData() {
  if (_atlasData) return _atlasData;

  // 1. Check pre-processed JSON cache (fast path)
  if (fs.existsSync(DATA_FILE)) {
    try {
      _atlasData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      console.log(`[USDA-FoodAccess] Loaded ${Object.keys(_atlasData).length} tracts from local cache`);
      return _atlasData;
    } catch {}
  }

  // 2. Parse from local CSV (shipped with the repo)
  if (fs.existsSync(SOURCE_CSV)) {
    console.log('[USDA-FoodAccess] Parsing local Food Access Atlas CSV...');
    try {
      const csv = fs.readFileSync(SOURCE_CSV, 'utf8');
      _atlasData = parseAtlasCsv(csv);
      fs.writeFileSync(DATA_FILE, JSON.stringify(_atlasData), 'utf8');
      console.log(`[USDA-FoodAccess] Processed and cached ${Object.keys(_atlasData).length} tracts`);
      return _atlasData;
    } catch (err) {
      console.error('[USDA-FoodAccess] CSV parse failed:', err.message);
    }
  }

  console.error('[USDA-FoodAccess] No data source available — place CSV in backend/data/2019_Food_Access_Research_Atlas_Data/');
  return null;
}

function parseAtlasCsv(csv) {
  const lines   = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toUpperCase());

  // Headers in the local CSV are mixed case — normalize to uppercase for lookup
  const tractIdx  = headers.indexOf('CENSUSTRACT');
  const lilaIdx   = headers.indexOf('LILATRACTS_1AND10');
  const lilaHIdx  = headers.indexOf('LILATRACTS_HALFAND10');
  const la1Idx    = headers.indexOf('LA1AND10');
  const urbanIdx  = headers.indexOf('URBAN');
  const lowIncIdx = headers.indexOf('LOWINCOMETRACTS');

  const result = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    // CensusTract may come as float string (e.g. "34013003800.0") — normalize to 11-digit string
    const rawTract = cols[tractIdx] || '';
    const tract = String(Math.round(parseFloat(rawTract))).padStart(11, '0');
    if (!tract || tract.length !== 11 || tract === '00000000000') continue;

    result[tract] = {
      food_desert:        cols[lilaIdx]  === '1',
      food_desert_strict: cols[lilaHIdx] === '1',
      low_access:         cols[la1Idx]   === '1',
      low_income:         cols[lowIncIdx] === '1',
      is_urban:           cols[urbanIdx] === '1',
    };
  }
  return result;
}

async function fetchFoodAccess(fips) {
  if (!fips?.state || !fips?.county || !fips?.tract) return _fallback();

  // Build 11-digit census tract FIPS: state(2) + county(3) + tract(6)
  const tractFips = `${fips.state}${fips.county}${fips.tract}`;
  const key = tractKey('usda-food', tractFips);

  return cachedFetch(key, async () => {
    const data = await ensureAtlasData();
    if (!data) return _fallback();

    const record = data[tractFips];
    if (!record) {
      return { food_desert: false, low_access: false, source: 'USDA ERS 2019', note: 'Tract not found in atlas' };
    }

    console.log(`[USDA-FoodAccess] Tract ${tractFips}: food_desert=${record.food_desert}, low_access=${record.low_access}`);
    return {
      food_desert:        record.food_desert,
      food_desert_strict: record.food_desert_strict,
      low_access:         record.low_access,
      low_income:         record.low_income,
      is_urban:           record.is_urban,
      source:             'USDA ERS Food Access Research Atlas 2019',
    };
  }, 365);
}

function _fallback() {
  return { food_desert: false, low_access: false, source: 'USDA food access unavailable', note: null };
}

module.exports = { fetchFoodAccess };

// CHECKPOINT — 2026-04-16
// Completed: USDA Food Access Atlas integration — food desert flag by census tract
//            Downloads + caches CSV locally as JSON. Flags: food_desert, low_access, is_urban.
//            Used in grocery void scoring and trajectory narrative.
// State: working
// Next: Task 8 — opportunity-zones.js
// Dependencies: cache.js
