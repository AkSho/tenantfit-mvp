const express  = require('express');
const cors     = require('cors');
const axios    = require('axios');
const path     = require('path');
require('dotenv').config();

const { generatePdf }                = require('./pdf');
const { fetchDemographics }          = require('./lib/census');
const { fetchCompetitorsAndTraffic } = require('./lib/overpass');
const { fetchBusinessDensity }       = require('./lib/zbp');
const { fetchDaytimePopulation }     = require('./lib/lehd');
const { fetchDotAADT }               = require('./lib/dot-aadt');
const { fetchPermits }               = require('./lib/permits');
const { fetchIrsSoi }                = require('./lib/irs-soi');
const { fetchFoodAccess }            = require('./lib/usda-food-access');
const { fetchOpportunityZone }       = require('./lib/opportunity-zones');
const { fetchBLSQCEW }               = require('./lib/bls-qcew');
const { fetchEpaSmartLocation }      = require('./lib/epa-smart-location');
const { computeWalkability }         = require('./lib/walkability');
const { runScoring }                 = require('./lib/scoring');
const { computeConsumerSpending }    = require('./lib/bls-consumer-spending');

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_GEOCODING_KEY = process.env.GOOGLE_GEOCODING_KEY || process.env.Maps_KEY;
const GOOGLE_PLACES_KEY    = process.env.Maps_KEY;
const MAPBOX_TOKEN         = process.env.MAPBOX_TOKEN;


// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

async function getGeocode(address) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_GEOCODING_KEY}`;
    const resp = await axios.get(url, { timeout: 8000 });
    if (resp.data.status === 'OK' && resp.data.results.length > 0) {
      const loc  = resp.data.results[0].geometry.location;
      const comps = resp.data.results[0].address_components || [];
      const zipComp = comps.find(c => c.types.includes('postal_code'));
      return {
        lat: loc.lat,
        lng: loc.lng,
        zip: zipComp?.short_name || null,
        formatted: resp.data.results[0].formatted_address,
      };
    }
    throw new Error(`Geocoding failed: ${resp.data.status}`);
  } catch (err) {
    console.error('[Geocode] Error:', err.message);
    return null;
  }
}

function getStaticMap(lat, lng, zoom = 13) {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-building+1B2A4A(${lng},${lat})/${lng},${lat},${zoom}/640x360?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;
}

// ─────────────────────────────────────────
// MAP PREVIEW ENDPOINT — lightweight, no scoring
// Used by the wizard to show pin + isochrone after address entry
// ─────────────────────────────────────────

// Default US overview map — shown before any address is entered
app.get('/api/default-map', (req, res) => {
  const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/-98,39,3/1280x720?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;
  res.json({ mapUrl: url });
});

app.get('/api/map-preview', async (req, res) => {
  try {
    const { address, lat, lng } = req.query;
    let geo;
    if (lat && lng) {
      // Coordinates already known (from typeahead selection) — skip geocoding
      geo = { lat: parseFloat(lat), lng: parseFloat(lng), formatted: address || '', zip: null };
    } else {
      if (!address) return res.status(400).json({ error: 'address required' });
      geo = await getGeocode(address);
      if (!geo) return res.status(400).json({ error: 'Address not found' });
    }
    const pinMap = getStaticMap(geo.lat, geo.lng, 11);
    res.json({ lat: geo.lat, lng: geo.lng, formatted: geo.formatted, zip: geo.zip, mapUrl: pinMap });
  } catch (err) {
    console.error('[MapPreview] Error:', err.message);
    res.status(500).json({ error: 'Preview failed' });
  }
});

app.get('/api/isochrone-preview', (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng required' });
  // Zoom out to 12 to show trade area context (no isochrone — Google Static Maps)
  res.json({ mapUrl: getStaticMap(parseFloat(lat), parseFloat(lng), 12) });
});

// Mapbox Geocoding typeahead — returns address suggestions for the wizard address field
app.get('/api/geocode-suggest', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) return res.json({ suggestions: [] });
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?country=us&types=address,poi&autocomplete=true&limit=5&access_token=${MAPBOX_TOKEN}`;
    const resp = await axios.get(url, { timeout: 5000 });
    const suggestions = (resp.data.features || []).map(f => ({
      place_name: f.place_name,
      center: f.center, // [lng, lat]
    }));
    res.json({ suggestions });
  } catch (err) {
    console.error('[GeocodeSuggest] Error:', err.message);
    res.json({ suggestions: [] });
  }
});

// Radius trade area map — circle GeoJSON overlay + pin on Mapbox Static
app.get('/api/radius-preview', (req, res) => {
  try {
    const { lat, lng, miles } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat/lng required' });
    const radiusMiles = parseFloat(miles) || 3;
    const clat = parseFloat(lat);
    const clng = parseFloat(lng);

    // Generate circle polygon (20 points)
    const dLat = radiusMiles / 69;
    const dLng = radiusMiles / (69 * Math.cos(clat * Math.PI / 180));
    const pts  = 20;
    const coords = Array.from({ length: pts + 1 }, (_, i) => {
      const a = (i / pts) * 2 * Math.PI;
      return [+(clng + dLng * Math.sin(a)).toFixed(4), +(clat + dLat * Math.cos(a)).toFixed(4)];
    });
    const geojson = {
      type: 'Feature',
      properties: { stroke: '#1B2A4A', 'stroke-width': 2, fill: '#1B2A4A', 'fill-opacity': 0.1 },
      geometry: { type: 'Polygon', coordinates: [coords] },
    };
    const encoded = encodeURIComponent(JSON.stringify(geojson));
    const zoom = radiusMiles <= 1 ? 13 : radiusMiles <= 3 ? 11 : 10;
    const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/geojson(${encoded}),pin-l-building+1B2A4A(${clng},${clat})/${clng},${clat},${zoom}/640x360?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;
    res.json({ mapUrl });
  } catch (err) {
    console.error('[RadiusPreview] Error:', err.message);
    res.status(500).json({ error: 'Radius preview failed' });
  }
});

// ─────────────────────────────────────────
// REPORT ENDPOINT
// ─────────────────────────────────────────
app.post('/api/report', async (req, res) => {
  try {
    const { addressData, leasingObjective, isVented, availableSf, propertyType } = req.body;
    const LEASING_MAP = { credit:'rent', speed:'speed', fnb:'traffic', health:'rent', convenience:'traffic', experiential:'traffic', neighborhood:'fit' };
    const scoringObjective = LEASING_MAP[leasingObjective] || leasingObjective || 'traffic';
    const address = addressData?.formatted_address;
    const sf      = parseInt(availableSf) || 0;

    console.log(`[Report] ${address} | SF: ${sf} | Vent: ${isVented}`);

    // 1. Geocode
    const geo = await getGeocode(address);
    if (!geo) {
      return res.status(400).json({ success: false, error: 'Could not geocode address. Check the address and try again.' });
    }
    const { lat, lng, zip, formatted } = geo;
    console.log(`[Geocode] ${lat}, ${lng} | ZIP: ${zip}`);

    // 2a. Phase 1 — geo-based sources, all parallel
    const [
      mapUrlResult,
      demographicsResult,
      competitorsResult,
      businessDensityResult,
      lehdResult,
      dotAadtResult,
      permitsResult,
      irsSoiResult,
      epaResult,
    ] = await Promise.allSettled([
      Promise.resolve(getStaticMap(lat, lng, 13)),
      fetchDemographics(lat, lng),
      fetchCompetitorsAndTraffic(lat, lng),
      fetchBusinessDensity(zip),
      fetchDaytimePopulation(lat, lng),
      fetchDotAADT(lat, lng),
      fetchPermits(lat, lng),
      fetchIrsSoi(zip),
      fetchEpaSmartLocation(lat, lng),
    ]);

    const mapUrlValue     = mapUrlResult.status === 'fulfilled'     ? mapUrlResult.value     : null;
    const demographics    = demographicsResult.status === 'fulfilled' ? demographicsResult.value : null;
    const competitorsData = competitorsResult.status === 'fulfilled' ? competitorsResult.value : null;
    const businessDensity = businessDensityResult.status === 'fulfilled' ? businessDensityResult.value : null;
    const lehdData        = lehdResult.status === 'fulfilled'        ? lehdResult.value        : null;
    const dotAadt         = dotAadtResult.status === 'fulfilled'     ? dotAadtResult.value     : null;
    const permitsData     = permitsResult.status === 'fulfilled'     ? permitsResult.value     : null;
    const irsSoiData      = irsSoiResult.status === 'fulfilled'      ? irsSoiResult.value      : null;
    const epaData         = epaResult.status === 'fulfilled'         ? epaResult.value         : null;

    // Log failures
    if (demographicsResult.status === 'rejected') console.error('[Census] Failed:', demographicsResult.reason?.message);
    if (competitorsResult.status === 'rejected')  console.error('[Overpass] Failed:', competitorsResult.reason?.message);
    if (dotAadtResult.status === 'rejected')      console.error('[DOT-AADT] Failed:', dotAadtResult.reason?.message);

    // 2b. Phase 2 — FIPS-dependent sources (need demographics to resolve first)
    const fips = demographics?.fips || null;
    const [foodAccessResult, ozResult, blsResult] = await Promise.allSettled([
      fetchFoodAccess(fips),
      fetchOpportunityZone(fips),
      fetchBLSQCEW(fips),
    ]);

    const foodAccess = foodAccessResult.status === 'fulfilled' ? foodAccessResult.value : null;
    const ozData     = ozResult.status === 'fulfilled'         ? ozResult.value         : null;
    const blsData    = blsResult.status === 'fulfilled'        ? blsResult.value        : null;

    const voidAnalysis = competitorsData?.void_analysis || [];

    // 3. Walkability index (no API key — built from EPA + Overpass)
    const walkability = computeWalkability(epaData, competitorsData);

    // 4. Scoring — pass dotAadt as the traffic source, not the OSM estimate
    const scoringResult = runScoring({
      sf, isVented, propertyType, leasingObjective: scoringObjective,
      demographics,
      voidAnalysis,
      lehd:       lehdData,
      dotAadt,
      permits:    permitsData,
      blsData,
      ozData,
      foodAccess,
    });

    // 5. Consumer spending lookup (pure computation — no latency)
    const ring1pop = demographics?.ring1;
    const consumerSpending = computeConsumerSpending(
      ring1pop?.median_income,
      ring1pop?.households
    );

    // 6. Metrics object (frontend-compat)
    const ring1 = demographics?.ring1;
    const metrics = {
      population:     ring1?.population         || null,
      median_income:  ring1?.median_income       || null,
      median_age:     ring1?.median_age          || null,
      pct_college:    ring1?.pct_college_plus    || null,
      pct_owner:      ring1?.pct_owner_occupied  || null,
      traffic_counts: dotAadt?.aadt_count        || null,
      spending_index: ring1?.spending_index      || null,
      pct_25_44:      ring1?.pct_25_44           || null,
      pct_45_54:      ring1?.pct_45_54           || null,
      daytime_workers: lehdData?.daytime_workers || null,
      walkability_score: walkability?.walk_score || null,
    };

    const topScore = scoringResult.scores[0];
    console.log(`[Report] Done — top: ${topScore?.category_name} (${topScore?.total_score}) | Profile: ${scoringResult.profile_label} | Trajectory: ${scoringResult.trajectory_label}`);

    res.json({
      success: true,
      address: formatted || address,
      lat, lng, zip,
      metrics,
      demographics,
      scores:        scoringResult.scores,
      profile:       scoringResult.profile,
      profile_label: scoringResult.profile_label,
      trajectory:    scoringResult.trajectory,
      trajectory_label: scoringResult.trajectory_label,
      daytime_ratio: scoringResult.daytime_ratio,
      oz_designated: scoringResult.oz_designated,
      food_desert:   scoringResult.food_desert,
      void_analysis: voidAnalysis,
      voidAnalysis:  voidAnalysis.map(v => ({ category: v.category, status: v.status })),
      dot_aadt:      dotAadt,
      permits:       permitsData,
      bls_data:      blsData,
      food_access:   foodAccess,
      oz_data:       ozData,
      irs_soi:       irsSoiData,
      walkability,
      business_density:  businessDensity,
      consumer_spending: consumerSpending,
      pop_growth_pct:    demographics?.pop_growth_pct ?? null,
      pop_2018:          demographics?.pop_2018       ?? null,
      pop_2022:          demographics?.pop_2022       ?? null,
      mapUrl:            mapUrlValue,
    });

  } catch (err) {
    console.error('[Report] Fatal error:', err);
    res.status(500).json({ success: false, error: 'Report generation failed. Please try again.' });
  }
});

// ─────────────────────────────────────────
// PDF ENDPOINT
// ─────────────────────────────────────────
app.post('/api/pdf', async (req, res) => {
  try {
    const { inputData, resultData, targetConcept, docType } = req.body;
    if (!inputData || !resultData) {
      return res.status(400).json({ error: 'Missing inputData or resultData' });
    }
    const pdfBuffer = await generatePdf(inputData, resultData, targetConcept || null, docType || 'both');
    const filename  = `tenantfit-${(inputData.addressRaw || 'report').replace(/[^a-z0-9]/gi, '-').slice(0, 40)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[PDF] Error:', err?.message, err?.stack);
    res.status(500).json({ error: 'PDF generation failed', detail: err?.message });
  }
});

// Serve frontend in production
const frontendDist = path.join(__dirname, 'frontend/dist');
app.use(express.static(frontendDist));
app.use((req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`TenantFit Engine running on port ${PORT}`);
});

// CHECKPOINT — 2026-04-16
// Completed: Task 14 — server.js full integration
//   - Removed old SCORING_MODELS array and old runScoring function
//   - Phase 1 parallel fetch: map, demographics, competitors, business density,
//     LEHD daytime pop, DOT AADT, building permits, IRS SOI, EPA Smart Location
//   - Phase 2 parallel fetch (FIPS-dependent): food access, opportunity zone, BLS QCEW
//   - Walkability computed via computeWalkability(epaData, competitorsData) — no API key
//   - Scoring via runScoring() from lib/scoring.js — 0-10 scale, full weaving
//   - Response includes: profile, trajectory, daytime_ratio, oz_designated, food_desert,
//     dot_aadt, permits, bls_data, food_access, oz_data, irs_soi, walkability
// State: working
// Next: Task 15 — end-to-end test on 3 property types (QSR pad, boutique strip, big box)
// Dependencies: All lib files, .env keys
