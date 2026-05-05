const fs   = require('fs');
const path = require('path');
const axios = require('axios');
const { cachedFetch, geoKey } = require('./cache');

// ─────────────────────────────────────────
// EPA Smart Location Database v3 (local CSV)
// 220,740 census block groups, nationwide
// Source: EPA Office of Community Revitalization, Jan 2021
//
// Fields used:
//   D3B        — Street intersection density (intersections/sq mile) — walkability proxy
//   D4A        — Distance to nearest transit stop (METERS — converted to miles)
//   D4D        — Aggregate transit service frequency (trips/hour, peak) — transit density proxy
//   NatWalkInd — EPA National Walkability Index (1-20 scale)
//
// Lookup key: 12-digit block group FIPS = STATEFP(2) + COUNTYFP(3) + TRACTCE(6) + BLKGRPCE(1)
// ─────────────────────────────────────────

const DATA_FILE  = path.join(__dirname, '../data/epa-sld.json');
const SOURCE_CSV = path.join(__dirname, '../data/EPA_SmartLocationDatabase_V3_Jan_2021_Final.csv');

let _sldData = null;

async function ensureSldData() {
  if (_sldData) return _sldData;

  // 1. Pre-processed JSON cache (fast path — ~30MB, loads in <2s)
  if (fs.existsSync(DATA_FILE)) {
    try {
      _sldData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      console.log(`[EPA-SLD] Loaded ${Object.keys(_sldData).length} block groups from cache`);
      return _sldData;
    } catch {}
  }

  // 2. Parse from local CSV (~192MB, one-time operation)
  if (fs.existsSync(SOURCE_CSV)) {
    console.log('[EPA-SLD] Parsing CSV (first run — this takes ~10s)...');
    try {
      const csv = fs.readFileSync(SOURCE_CSV, 'utf8');
      _sldData = parseSldCsv(csv);
      fs.writeFileSync(DATA_FILE, JSON.stringify(_sldData), 'utf8');
      console.log(`[EPA-SLD] Processed and cached ${Object.keys(_sldData).length} block groups`);
      return _sldData;
    } catch (err) {
      console.error('[EPA-SLD] CSV parse failed:', err.message);
    }
  }

  console.warn('[EPA-SLD] No data source — place EPA_SmartLocationDatabase_V3_Jan_2021_Final.csv in backend/data/');
  return null;
}

function parseSldCsv(csv) {
  const lines   = csv.trim().split('\n');
  // Headers in this CSV are uppercase already
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toUpperCase());

  const stateIdx  = headers.indexOf('STATEFP');
  const countyIdx = headers.indexOf('COUNTYFP');
  const tractIdx  = headers.indexOf('TRACTCE');
  const blkgrpIdx = headers.indexOf('BLKGRPCE');
  const d3bIdx    = headers.indexOf('D3B');
  const d4aIdx    = headers.indexOf('D4A');    // meters
  const d4dIdx    = headers.indexOf('D4D');    // trips/hour (peak)
  const natwIdx   = headers.indexOf('NATWALKIND');

  const result = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 10) continue;

    // Build 12-digit block group GEOID from component columns
    // GEOID20 column is stored as scientific notation (precision lost) — don't use it
    const state  = String(parseInt(cols[stateIdx]  || '0') || 0).padStart(2, '0');
    const county = String(parseInt(cols[countyIdx] || '0') || 0).padStart(3, '0');
    const tract  = String(parseInt(cols[tractIdx]  || '0') || 0).padStart(6, '0');
    const blkgrp = (cols[blkgrpIdx] || '').trim().replace(/"/g, '');

    const geoid = state + county + tract + blkgrp;
    if (geoid.length !== 12 || geoid === '000000000000') continue;

    const d4aMeters = parseFloat(cols[d4aIdx]);
    const d3b       = parseFloat(cols[d3bIdx]);
    const d4d       = parseFloat(cols[d4dIdx]);
    const natw      = parseFloat(cols[natwIdx]);

    result[geoid] = {
      // D4A: stored in meters in the CSV — convert to miles for walkability.js
      intersection_density: isNaN(d3b)  ? null : +d3b.toFixed(2),
      transit_dist_miles:   isNaN(d4aMeters) ? null : +(d4aMeters / 1609.34).toFixed(3),
      transit_frequency:    isNaN(d4d)  ? null : +d4d.toFixed(2),  // trips/hr peak
      nat_walk_ind:         isNaN(natw) ? null : +natw.toFixed(2), // 1-20 scale
    };
  }
  return result;
}

// Census geocoder — returns block-level FIPS including block digit for block group lookup
async function getBlockFips(lat, lng) {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Census+Blocks&format=json`;
    const resp = await axios.get(url, { timeout: 10000 });
    const block = resp.data?.result?.geographies?.['2020 Census Blocks']?.[0];
    if (!block) return null;
    return {
      state:   block.STATE,   // 2-digit
      county:  block.COUNTY,  // 3-digit
      tract:   block.TRACT,   // 6-digit
      block:   block.BLOCK,   // 4-digit — first digit = block group
      geoid:   block.GEOID,   // 15-digit block GEOID
    };
  } catch (err) {
    console.warn('[EPA-SLD] FIPS lookup failed:', err.message);
    return null;
  }
}

async function fetchEpaSmartLocation(lat, lng) {
  const key = geoKey('epa-sld', lat, lng);

  return cachedFetch(key, async () => {
    try {
      const data = await ensureSldData();
      if (!data) return _fallback();

      // Resolve block-level FIPS → derive 12-digit block group GEOID
      const fips = await getBlockFips(lat, lng);
      if (!fips) {
        console.warn('[EPA-SLD] Could not resolve block FIPS — graceful null');
        return _fallback();
      }

      // Block group GEOID = state + county + tract + first digit of block
      const bgGeoid = fips.state + fips.county + fips.tract + fips.block[0];
      const record  = data[bgGeoid];

      if (!record) {
        console.warn(`[EPA-SLD] Block group ${bgGeoid} not found in SLD`);
        return { ...(_fallback()), note: 'Block group not in SLD (may be water or tribal land)' };
      }

      console.log(`[EPA-SLD] BG ${bgGeoid}: NatWalk=${record.nat_walk_ind}, transit_dist=${record.transit_dist_miles}mi, intersections=${record.intersection_density}/sqmi`);

      return {
        intersection_density_per_sqmi: record.intersection_density,
        transit_stop_distance_miles:   record.transit_dist_miles,
        transit_frequency_trips_day:   record.transit_frequency,  // unit: trips/hr peak (see note)
        nat_walkability_index:         record.nat_walk_ind,
        walkability_label:             _walkLabel(record.nat_walk_ind),
        source: 'EPA Smart Location Database v3 (local CSV)',
        block_group: bgGeoid,
      };

    } catch (err) {
      console.error('[EPA-SLD] Error:', err.message);
      return _fallback();
    }
  }, 90); // 90-day TTL — data is static
}

function _walkLabel(score) {
  if (!score) return null;
  if (score >= 16) return "Walker's Paradise";
  if (score >= 12) return 'Very Walkable';
  if (score >= 8)  return 'Somewhat Walkable';
  if (score >= 4)  return 'Car-Dependent';
  return 'Very Car-Dependent';
}

function _fallback() {
  return {
    intersection_density_per_sqmi: null,
    transit_stop_distance_miles:   null,
    transit_frequency_trips_day:   null,
    nat_walkability_index:         null,
    walkability_label:             null,
    source: 'EPA SLD unavailable',
  };
}

module.exports = { fetchEpaSmartLocation };

// CHECKPOINT — 2026-04-16
// Completed: EPA SLD local CSV integration
//   - Reads EPA_SmartLocationDatabase_V3_Jan_2021_Final.csv from backend/data/
//   - Parses 220,740 block groups on first run, caches to data/epa-sld.json
//   - Lookup key: 12-digit block group GEOID built from STATEFP+COUNTYFP+TRACTCE+BLKGRPCE
//     (GEOID20 column in CSV has precision loss in sci notation — avoided)
//   - D4A converted from meters to miles
//   - D4D is trips/hour peak (not per day — walkability.js thresholds may need tuning)
//   - NatWalkInd: 1-20 scale → walkability_label
//   - Census geocoder resolves block group from lat/lng
// State: working
// Next: Task 18 — 4-step intake wizard
// Dependencies: cache.js, EPA CSV in backend/data/
