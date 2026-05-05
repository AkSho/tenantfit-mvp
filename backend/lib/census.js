/**
 * Census ACS demographics — true radius aggregation.
 *
 * Ring 1 (1-mile):  TIGERweb → all block groups within 1609m → ACS batch query → weighted aggregate
 * Ring 3 (3-mile):  county-level ACS (fast proxy, acceptable at that distance)
 * Ring 5 (5-mile):  county-level ACS
 *
 * Ring 1 is the credibility-critical number. A single Census tract covering
 * ~0.2–0.4 sq mi understates trade area population in nearly every suburban
 * market. Aggregating all intersecting block groups fixes that.
 */

const axios = require('axios');
const { get: cacheGet, set: cacheSet, geoKey } = require('./cache');
const CENSUS_KEY = process.env.CENSUS_API_KEY;

// ── ACS variables pulled at block-group level ────────────────────────────────
const ACS_BG_VARS = [
  'B01003_001E', // Total Population
  'B11001_001E', // Total Households
  'B19013_001E', // Median HH Income
  'B01002_001E', // Median Age
  'B15003_001E', 'B15003_022E', 'B15003_023E', 'B15003_024E', 'B15003_025E', // Education
  'B25003_001E', 'B25003_002E', // Housing tenure
  'B23025_002E', 'B23025_004E', // Labor force
  'B08301_001E', 'B08301_003E', 'B08301_004E', 'B08301_010E', 'B08301_019E', 'B08301_021E', // Commute
  'B01001_011E', 'B01001_012E', 'B01001_013E', 'B01001_014E', 'B01001_015E', 'B01001_016E', // Age M
  'B01001_035E', 'B01001_036E', 'B01001_037E', 'B01001_038E', 'B01001_039E', 'B01001_040E', // Age F
].join(',');

// ── FCC block lookup → FIPS (state, county, tract) ──────────────────────────
async function getFIPS(lat, lng) {
  const url = `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&showall=true&format=json`;
  const resp = await axios.get(url, { timeout: 8000 });
  const fips = resp.data?.Block?.FIPS;
  if (!fips) throw new Error('FCC FIPS lookup failed');
  return {
    state:  fips.substring(0, 2),
    county: fips.substring(2, 5),
    tract:  fips.substring(5, 11),
    block:  fips.substring(11),
  };
}

// ── TIGERweb: all block groups whose geometry intersects a ~1-mile bounding box ─
// Layer 8 = ACS 2022 block groups. Envelope geometry is more reliable than
// point+distance on the TIGERweb MapServer.
async function getBlockGroupsInRadius(lat, lng, radiusMiles = 1) {
  const dLat = radiusMiles / 69.0;
  const dLng = radiusMiles / (69.0 * Math.cos(lat * Math.PI / 180));
  const envelope = {
    xmin: lng - dLng, ymin: lat - dLat,
    xmax: lng + dLng, ymax: lat + dLat,
    spatialReference: { wkid: 4326 },
  };

  const url = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/8/query';
  const params = {
    geometry:       JSON.stringify(envelope),
    geometryType:   'esriGeometryEnvelope',
    inSR:           '4326',
    spatialRel:     'esriSpatialRelIntersects',
    outFields:      'GEOID,STATE,COUNTY,TRACT,BLKGRP',
    returnGeometry: false,
    f:              'json',
  };
  const resp = await axios.get(url, { params, timeout: 12000 });
  const features = resp.data?.features || [];
  if (!features.length && resp.data?.error) {
    throw new Error(`TIGERweb error: ${resp.data.error.message}`);
  }
  return features.map(f => ({
    geoid:  String(f.attributes.GEOID),
    state:  String(f.attributes.STATE).padStart(2, '0'),
    county: String(f.attributes.COUNTY).padStart(3, '0'),
    tract:  String(f.attributes.TRACT).padStart(6, '0'),
    blkgrp: String(f.attributes.BLKGRP),
  }));
}

// ── ACS query for all block groups within one tract ──────────────────────────
async function getBlockGroupDataForTract(state, county, tract, targetBlkGrps) {
  const url = `https://api.census.gov/data/2022/acs/acs5?get=${ACS_BG_VARS}&for=block+group:*&in=state:${state}%20county:${county}%20tract:${tract}&key=${CENSUS_KEY}`;
  const resp = await axios.get(url, { timeout: 12000 });
  if (!resp.data || resp.data.length < 2) return [];

  const headers = resp.data[0];
  const rows    = resp.data.slice(1);

  // Filter to only the block groups we need
  const bgIdx = headers.indexOf('block group');
  return rows
    .filter(row => targetBlkGrps.has(row[bgIdx]))
    .map(row => {
      const n = (k) => {
        const i = headers.indexOf(k);
        const v = i >= 0 ? parseInt(row[i]) : 0;
        return (v < 0) ? 0 : (v || 0); // Census uses -666666666 for missing
      };
      const f = (k) => {
        const i = headers.indexOf(k);
        const v = i >= 0 ? parseFloat(row[i]) : 0;
        return (v < 0) ? 0 : (v || 0);
      };
      return {
        pop:           n('B01003_001E'),
        hh:            n('B11001_001E'),
        income:        n('B19013_001E'),
        medAge:        f('B01002_001E'),
        edu25plus:     n('B15003_001E'),
        collegeUp:     n('B15003_022E') + n('B15003_023E') + n('B15003_024E') + n('B15003_025E'),
        totalUnits:    n('B25003_001E'),
        ownerOcc:      n('B25003_002E'),
        laborForce:    n('B23025_002E'),
        employed:      n('B23025_004E'),
        totalCommute:  n('B08301_001E'),
        driveAlone:    n('B08301_003E'),
        carpool:       n('B08301_004E'),
        transit:       n('B08301_010E'),
        walk:          n('B08301_019E'),
        wfh:           n('B08301_021E'),
        age25_34:      n('B01001_011E') + n('B01001_012E') + n('B01001_035E') + n('B01001_036E'),
        age35_44:      n('B01001_013E') + n('B01001_014E') + n('B01001_037E') + n('B01001_038E'),
        age45_54:      n('B01001_015E') + n('B01001_016E') + n('B01001_039E') + n('B01001_040E'),
      };
    });
}

// ── Aggregate block group rows into a single ring object ─────────────────────
function aggregateBlockGroups(rows) {
  if (!rows.length) return null;

  const totalPop    = rows.reduce((s, r) => s + r.pop, 0);
  const totalHH     = rows.reduce((s, r) => s + r.hh, 0);
  const totalLabor  = rows.reduce((s, r) => s + r.laborForce, 0);
  const totalEmp    = rows.reduce((s, r) => s + r.employed, 0);
  const totalEdu    = rows.reduce((s, r) => s + r.edu25plus, 0);
  const totalCol    = rows.reduce((s, r) => s + r.collegeUp, 0);
  const totalUnits  = rows.reduce((s, r) => s + r.totalUnits, 0);
  const totalOwn    = rows.reduce((s, r) => s + r.ownerOcc, 0);
  const totalCom    = rows.reduce((s, r) => s + r.totalCommute, 0);
  const totalDrive  = rows.reduce((s, r) => s + r.driveAlone, 0);
  const totalCarp   = rows.reduce((s, r) => s + r.carpool, 0);
  const totalTrans  = rows.reduce((s, r) => s + r.transit, 0);
  const totalWalk   = rows.reduce((s, r) => s + r.walk, 0);
  const totalWfh    = rows.reduce((s, r) => s + r.wfh, 0);
  const total25_44  = rows.reduce((s, r) => s + r.age25_34 + r.age35_44, 0);
  const total45_54  = rows.reduce((s, r) => s + r.age45_54, 0);

  // Population-weighted average for medians (approximation — better than single tract)
  const weightedIncome = totalPop > 0
    ? rows.reduce((s, r) => s + (r.income > 0 ? r.income * r.pop : 0), 0) / Math.max(rows.filter(r => r.income > 0).reduce((s, r) => s + r.pop, 0), 1)
    : 0;
  const weightedAge = totalPop > 0
    ? rows.reduce((s, r) => s + (r.medAge > 0 ? r.medAge * r.pop : 0), 0) / Math.max(rows.filter(r => r.medAge > 0).reduce((s, r) => s + r.pop, 0), 1)
    : 0;

  const income   = Math.round(weightedIncome);
  const medAge   = +weightedAge.toFixed(1);
  const pctColl  = totalEdu > 0  ? +(totalCol / totalEdu).toFixed(3) : null;
  const pctOwner = totalUnits > 0 ? +(totalOwn / totalUnits).toFixed(3) : null;

  const commuteMode = totalCom > 0 ? {
    drive_alone_pct: +(totalDrive / totalCom).toFixed(3),
    carpool_pct:     +(totalCarp  / totalCom).toFixed(3),
    transit_pct:     +(totalTrans / totalCom).toFixed(3),
    walk_pct:        +(totalWalk  / totalCom).toFixed(3),
    wfh_pct:         +(totalWfh  / totalCom).toFixed(3),
    total_commuters: totalCom,
  } : null;

  return {
    population:         totalPop,
    households:         totalHH,
    median_income:      income > 0 ? income : null,
    median_age:         medAge > 0 ? medAge : null,
    pct_college_plus:   pctColl,
    pct_owner_occupied: pctOwner,
    pct_renter:         pctOwner != null ? +(1 - pctOwner).toFixed(3) : null,
    labor_force:        totalLabor,
    employed:           totalEmp,
    commute_mode:       commuteMode,
    pct_25_44:          totalPop > 0 ? +(total25_44 / totalPop).toFixed(3) : null,
    pct_45_54:          totalPop > 0 ? +(total45_54 / totalPop).toFixed(3) : null,
    spending_index:     income > 0 ? Math.round((income / 65000) * 100) : null,
    block_groups_count: rows.length,
  };
}

// ── Ring 1: aggregate all block groups within 1 mile ─────────────────────────
async function getRing1Data(lat, lng) {
  // Step 1: get block group GEOIDs within 1 mile
  const bgList = await getBlockGroupsInRadius(lat, lng, 1);
  if (!bgList.length) throw new Error('TIGERweb returned no block groups');
  console.log(`[Census] Ring 1 — ${bgList.length} block groups within 1 mile`);

  // Step 2: group by tract (one Census API call per unique tract)
  const byTract = new Map();
  for (const bg of bgList) {
    const tractKey = `${bg.state}|${bg.county}|${bg.tract}`;
    if (!byTract.has(tractKey)) byTract.set(tractKey, { state: bg.state, county: bg.county, tract: bg.tract, blkgrps: new Set() });
    byTract.get(tractKey).blkgrps.add(bg.blkgrp);
  }

  // Step 3: fetch ACS data for each tract's block groups in parallel
  const tractResults = await Promise.allSettled(
    [...byTract.values()].map(({ state, county, tract, blkgrps }) =>
      getBlockGroupDataForTract(state, county, tract, blkgrps)
    )
  );

  const allRows = tractResults
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  if (!allRows.length) throw new Error('No ACS block group data returned');

  // Step 4: aggregate
  return aggregateBlockGroups(allRows);
}

// ── County-level data (ring 3 / ring 5 proxy) ─────────────────────────────
async function getCountyData(state, county) {
  const vars = 'B01003_001E,B11001_001E,B19013_001E,B01002_001E';
  const url   = `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=county:${county}&in=state:${state}&key=${CENSUS_KEY}`;
  const resp  = await axios.get(url, { timeout: 10000 });
  if (!resp.data || resp.data.length < 2) return null;

  const headers = resp.data[0];
  const row     = resp.data[1];
  const n = (k) => { const i = headers.indexOf(k); const v = parseInt(row[i]); return (v < 0 || isNaN(v)) ? 0 : v; };

  return {
    population:    n('B01003_001E'),
    households:    n('B11001_001E'),
    median_income: n('B19013_001E') || null,
    median_age:    parseFloat(row[headers.indexOf('B01002_001E')]) || null,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────
async function fetchDemographics(lat, lng) {
  const key = geoKey('census-acs-v2', lat, lng); // v2 key — avoids serving old tract-only cache

  const cached = cacheGet(key);
  if (cached !== null && cached.ring1 && (cached.ring1.block_groups_count || 0) > 0) {
    console.log(`[Cache] HIT — ${key}`);
    return cached;
  }

  const fips = await getFIPS(lat, lng);

  const [ring1Result, countyResult] = await Promise.allSettled([
    getRing1Data(lat, lng),
    getCountyData(fips.state, fips.county),
  ]);

  if (ring1Result.status === 'rejected') {
    console.error('[Census] Ring 1 radius aggregation failed:', ring1Result.reason?.message);
  }

  const ring1  = ring1Result.status  === 'fulfilled' ? ring1Result.value  : null;
  const county = countyResult.status === 'fulfilled' ? countyResult.value : null;

  const result = {
    ring1,
    ring3: county,
    ring5: county,
    fips,
    source: 'Census ACS 5-Year (2022) — 1-mile radius aggregation',
  };

  if (ring1 && ring1.block_groups_count > 0) {
    cacheSet(key, result, 30);
  }

  return result;
}

module.exports = { fetchDemographics };

// CHECKPOINT — 2026-04-17
// Completed: Ring 1 now aggregates all Census block groups within a true 1-mile radius.
//   1. TIGERweb ACS 2022 MapServer/10 query → block group GEOIDs within 1609m
//   2. Group by tract → one Census ACS call per unique tract (typically 3-8 calls)
//   3. Population-weighted aggregate of income, age, education, tenure, commute
//   4. Cache key uses 'census-acs-v2' to avoid serving old single-tract entries
//   5. Falls back gracefully — if TIGERweb fails, ring1 is null (scoring uses ring3 fallback)
// State: working
// Next: Verify ring1 pop on Freehold NJ (should be 15K+, not 3,733)
// Dependencies: cache.js
