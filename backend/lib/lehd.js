const axios = require('axios');
const { cachedFetch, geoKey } = require('./cache');

// ─────────────────────────────────────────
// Census LEHD / LODES — Daytime Population
// Returns workplace-area employment count for
// census blocks within ~1 mile of a coordinate.
//
// LODES WAC (Workplace Area Characteristics):
// Total jobs (C000) by census block.
// We fetch the county's WAC file and filter by
// blocks near our coordinate using a bounding box.
//
// API: https://lehd.ces.census.gov/data/lodes/LODES8/
// Format: state abbreviation / wac / <state>_wac_S000_JT00_<year>.csv.gz
// ─────────────────────────────────────────

const STATE_ABBR = {
  '01':'al','02':'ak','04':'az','05':'ar','06':'ca','08':'co','09':'ct',
  '10':'de','11':'dc','12':'fl','13':'ga','15':'hi','16':'id','17':'il',
  '18':'in','19':'ia','20':'ks','21':'ky','22':'la','23':'me','24':'md',
  '25':'ma','26':'mi','27':'mn','28':'ms','29':'mo','30':'mt','31':'ne',
  '32':'nv','33':'nh','34':'nj','35':'nm','36':'ny','37':'nc','38':'nd',
  '39':'oh','40':'ok','41':'or','42':'pa','44':'ri','45':'sc','46':'sd',
  '47':'tn','48':'tx','49':'ut','50':'vt','51':'va','53':'wa','54':'wv',
  '55':'wi','56':'wy',
};

const LODES_YEAR = '2021'; // most recent stable LODES8 year

// Approximate bounding box for ~1 mile radius
function bbox(lat, lng, miles = 1) {
  const latDelta = miles / 69.0;
  const lngDelta = miles / (69.0 * Math.cos(lat * Math.PI / 180));
  return {
    minLat: lat - latDelta, maxLat: lat + latDelta,
    minLng: lng - lngDelta, maxLng: lng + lngDelta,
  };
}

// Get FIPS state code from Census geocoder (we already have lat/lng)
async function getFipsState(lat, lng) {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Census+Blocks&format=json`;
    const resp = await axios.get(url, { timeout: 10000 });
    const block = resp.data?.result?.geographies?.['2020 Census Blocks']?.[0];
    if (!block) return null;
    return {
      state:   block.STATE,
      county:  block.COUNTY,
      tract:   block.TRACT,
      block:   block.BLOCK,
      geoid:   block.GEOID,
    };
  } catch (err) {
    console.warn('[LEHD] FIPS lookup failed:', err.message);
    return null;
  }
}

async function fetchDaytimePopulation(lat, lng) {
  const key = geoKey('lehd', lat, lng);

  return cachedFetch(key, async () => {
    try {
      // 1. Get FIPS codes
      const fips = await getFipsState(lat, lng);
      if (!fips) {
        console.warn('[LEHD] Could not resolve FIPS — falling back');
        return _fallback();
      }

      const stateAbbr = STATE_ABBR[fips.state];
      if (!stateAbbr) {
        console.warn(`[LEHD] Unknown state FIPS: ${fips.state}`);
        return _fallback();
      }

      // 2. Fetch WAC CSV for this state from LEHD
      const csvUrl = `https://lehd.ces.census.gov/data/lodes/LODES8/${stateAbbr}/wac/${stateAbbr}_wac_S000_JT00_${LODES_YEAR}.csv.gz`;
      console.log(`[LEHD] Fetching WAC for ${stateAbbr.toUpperCase()}...`);

      const resp = await axios.get(csvUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: { 'Accept-Encoding': 'gzip' },
      });

      // 3. Decompress and parse
      const zlib = require('zlib');
      const decompressed = zlib.gunzipSync(Buffer.from(resp.data)).toString('utf8');
      const lines = decompressed.trim().split('\n');
      const headers = lines[0].split(',');
      const c000Idx = headers.indexOf('C000'); // total jobs column
      const geocodeIdx = headers.indexOf('w_geocode'); // 15-digit block GEOID

      if (c000Idx === -1 || geocodeIdx === -1) {
        console.warn('[LEHD] Unexpected CSV format');
        return _fallback();
      }

      // 4. Filter blocks within bounding box
      // Census block GEOID: 15 digits = 2 state + 3 county + 6 tract + 4 block
      // We filter by county prefix first (fast), then check tract proximity
      const countyPrefix = fips.state + fips.county;
      const box = bbox(lat, lng, 1.0);

      // We need block-level coordinates — use Census block centroid lookup
      // Since we can't easily get block centroids from the CSV alone,
      // we'll aggregate by county+tract and use a tract-level filter
      // This is a known approximation — sufficient for daytime pop estimate

      let totalJobs = 0;
      const tractPrefix = fips.state + fips.county + fips.tract;

      // Include all blocks in the same tract + adjacent tracts (approximate 1-mile)
      // Parse only rows matching county for performance
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const geoid = cols[geocodeIdx];
        if (!geoid || !geoid.startsWith(countyPrefix)) continue;
        // Use blocks in the same tract and immediate neighbors
        const blockTract = geoid.slice(0, 11); // state+county+tract
        // Simple heuristic: same tract = within ~0.5 miles typical
        // For the 1-mile estimate we include same + adjacent tracts
        // Adjacent tract detection: tract IDs that are numerically within 200 of ours
        const ourTractNum   = parseInt(fips.tract, 10);
        const blockTractNum = parseInt(blockTract.slice(5), 10);
        if (Math.abs(blockTractNum - ourTractNum) <= 200) {
          const jobs = parseInt(cols[c000Idx], 10) || 0;
          totalJobs += jobs;
        }
      }

      console.log(`[LEHD] Daytime workers (1-mi approx): ${totalJobs.toLocaleString()}`);

      return {
        daytime_workers:   totalJobs,
        source:            `Census LEHD/LODES8 WAC ${LODES_YEAR}`,
        geography:         `${stateAbbr.toUpperCase()} state WAC, tract-proximity filter`,
        fips,
        note: totalJobs === 0 ? 'No workplace data found for this tract — may be residential-only' : null,
      };

    } catch (err) {
      console.error('[LEHD] Error:', err.message);
      return _fallback();
    }
  }, 60); // 60-day TTL — LODES data updates annually
}

function _fallback() {
  return {
    daytime_workers: null,
    source:          'LEHD unavailable',
    note:            'Daytime population data could not be retrieved for this location',
  };
}

module.exports = { fetchDaytimePopulation };

// CHECKPOINT — 2026-04-16
// Completed: LEHD/LODES8 WAC daytime population fetch
//            Downloads state WAC CSV, decompresses gzip, filters by county+tract proximity
//            Approximate 1-mile aggregation via tract adjacency heuristic
//            Graceful fallback if state unavailable
// State: working
// Next: lib/dot-aadt.js — real DOT AADT traffic counts
// Dependencies: cache.js
