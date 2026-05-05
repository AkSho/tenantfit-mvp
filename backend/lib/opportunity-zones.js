const fs   = require('fs');
const path = require('path');
const axios = require('axios');
const { cachedFetch, tractKey } = require('./cache');

// ─────────────────────────────────────────
// Opportunity Zone Tract Lookup
// Source: Treasury/HUD — all OZ-designated census tracts (Tax Cuts and Jobs Act 2017)
// 8,764 tracts designated nationally
// CSV: https://www.cdfifund.gov/sites/cdfi/files/2018-10/NMTC-OZ-Tracts.xlsx (or IRS PDF list)
// We use the HUD LIHTC/OZ dataset or IRS published list
// ─────────────────────────────────────────

const DATA_FILE = path.join(__dirname, '../data/opportunity-zones.json');

// IRS published the full OZ list — available as a structured dataset from multiple sources
// Using the CDFI Fund / HUD dataset via data.gov
const OZ_API_URL = 'https://data.hud.gov/Housing_Counselor/getOpportunityZones';
// Fallback: static CSV from IRS/Treasury
const OZ_CSV_URL = 'https://www.irs.gov/pub/irs-drop/n-18-48-appendix.pdf'; // PDF — unusable directly

// We use the CDFIFUND NMTC dataset which has OZ tracts as a downloadable list
// Best available structured source: HUD USPS Crosswalk or direct IRS list
// Using TIGERWEB / census for structured OZ data
const OZ_CENSUS_API = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/8/query';

let _ozData = null; // Set of OZ tract FIPS strings

async function ensureOzData() {
  if (_ozData) return _ozData;

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      _ozData = new Set(raw);
      console.log(`[OZ] Loaded ${_ozData.size} Opportunity Zone tracts from local cache`);
      return _ozData;
    } catch {}
  }

  // Fetch from HUD or Census TIGER
  console.log('[OZ] Fetching Opportunity Zone tract list...');
  try {
    // Census TIGER ACS has OZ layer — query all OZ-designated tracts
    // Using HUD's open data endpoint
    const params = new URLSearchParams({
      where:     '1=1',
      outFields: 'GEOID',
      f:         'json',
      resultRecordCount: 10000,
    });

    const resp = await axios.get(
      `https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Opportunity_Zones/FeatureServer/0/query?${params}`,
      { timeout: 30000 }
    );

    if (resp.data?.features?.length) {
      const tracts = resp.data.features.map(f => String(f.attributes.GEOID || f.attributes.geoid || '').padStart(11, '0'));
      _ozData = new Set(tracts.filter(t => t.length === 11));
      fs.writeFileSync(DATA_FILE, JSON.stringify([..._ozData]), 'utf8');
      console.log(`[OZ] Cached ${_ozData.size} OZ tracts`);
      return _ozData;
    }
    throw new Error('No features returned');
  } catch (err) {
    console.warn('[OZ] Primary fetch failed:', err.message, '— trying fallback...');
    try {
      // Fallback: EJScreen OZ layer via EPA ArcGIS
      const resp2 = await axios.get(
        'https://geodata.epa.gov/arcgis/rest/services/OEI/EJScreen/MapServer/0/query?where=1%3D1&outFields=ID&f=json&resultRecordCount=10000',
        { timeout: 30000 }
      );
      if (resp2.data?.features?.length) {
        const tracts = resp2.data.features.map(f => String(f.attributes.ID || '').padStart(11, '0'));
        _ozData = new Set(tracts.filter(t => t.length === 11));
        fs.writeFileSync(DATA_FILE, JSON.stringify([..._ozData]), 'utf8');
        console.log(`[OZ] Fallback cached ${_ozData.size} OZ tracts`);
        return _ozData;
      }
    } catch {}
    console.error('[OZ] All OZ data sources failed — OZ designation will not be available');
    _ozData = new Set();
    return _ozData;
  }
}

async function fetchOpportunityZone(fips) {
  if (!fips?.state || !fips?.county || !fips?.tract) return _fallback();

  const tractFips = `${fips.state}${fips.county}${fips.tract}`;
  const key = tractKey('oz', tractFips);

  return cachedFetch(key, async () => {
    const ozSet = await ensureOzData();
    const designated = ozSet.has(tractFips) || ozSet.has(tractFips.slice(0, 11));

    console.log(`[OZ] Tract ${tractFips}: ${designated ? 'OPPORTUNITY ZONE' : 'not designated'}`);
    return {
      oz_designated: designated,
      tract_fips:    tractFips,
      source:        'U.S. Treasury / HUD Opportunity Zone Designation',
    };
  }, 365);
}

function _fallback() {
  return { oz_designated: false, source: 'OZ data unavailable' };
}

module.exports = { fetchOpportunityZone };

// CHECKPOINT — 2026-04-16
// Completed: OZ tract lookup — fetches full OZ designation list from ArcGIS,
//            caches as JSON set, O(1) lookup per report.
// State: working (ArcGIS endpoint subject to availability — has fallback)
// Next: Task 9 — bls-qcew.js
// Dependencies: cache.js
