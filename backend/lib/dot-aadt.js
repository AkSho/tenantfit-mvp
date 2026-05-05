const axios = require('axios');
const { cachedFetch, geoKey } = require('./cache');

// ─────────────────────────────────────────
// State DOT AADT — Real traffic counts
// Covers: NJ, NY, TX, FL, CA, IL, PA, GA, OH, AZ, WA, CO, NC, VA, MA, MI
// All use ArcGIS REST except NY which uses Socrata (more stable).
// Falls back to OSM road classification estimate for uncovered states.
//
// NOTE: ArcGIS org IDs in service URLs may drift over time.
// Verify at each state's open data portal if a service starts returning 0 results.
// Portals listed below each service definition.
// ─────────────────────────────────────────

const DOT_SERVICES = {
  NJ: {
    // Portal: njogis-newjersey.opendata.arcgis.com — dataset id 3380b1ffc18c4b50bf3b786f8a2f94d2
    // Org ID confirmed working 2026-04-16 (old XVOqAjTOJ5P6ngMu org ID is dead)
    // Fields use year suffix: AADT_2024, AADT_2023, etc. — pick most recent non-null.
    type:      'arcgis',
    url:       'https://services.arcgis.com/HggmsDF7UJsNN1FK/arcgis/rest/services/New_jersey_Annual_Average_Daily_Traffic_2017/FeatureServer/0/query',
    aadtField: 'AADT_2024',              // primary — may be null for some stations
    aadtYearFields: ['AADT_2024','AADT_2023','AADT_2022','AADT_2021','AADT_2020'],
    yearField: null,                      // year encoded in field name
    nameField: 'ROAD_TYPE',
  },
  NY: {
    // Socrata — resource IDs are permanent, most stable access method
    // Portal: data.ny.gov, resource qbf5-7hte
    type:      'socrata',
    url:       'https://data.ny.gov/resource/qbf5-7hte.json',
    aadtField: 'aadt',
    yearField: 'year',
    nameField: 'route_name',
  },
  TX: {
    // Portal: gis-txdot.opendata.arcgis.com — search "AADT"
    // Segment-level (polylines) — better spatial precision than point stations
    type:      'arcgis',
    url:       'https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_AADT/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'AADT_YEAR',
    nameField: 'RTE_NM',
  },
  FL: {
    // Portal: gis-fdot.opendata.arcgis.com — search "AADT" or "Traffic Counts"
    type:      'arcgis',
    url:       'https://services1.arcgis.com/O1JpcwDW8sjYuddV/arcgis/rest/services/Traffic_Counts/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'YEAR_RCRD',
    nameField: 'RDWAY_NAM',
  },
  CA: {
    // Self-hosted Caltrans server — most stable of the six, maintained consistently
    // Portal: gisdata-caltrans.opendata.arcgis.com
    // BACK_AADT / AHEAD_AADT = directional — take max
    type:      'arcgis',
    url:       'https://caltrans-gis.dot.ca.gov/arcgis/rest/services/CHhighway/AADT_Volumes/FeatureServer/0/query',
    aadtField: 'BACK_AADT',
    aadtField2:'AHEAD_AADT',
    yearField: 'YEAR',
    nameField: 'ROUTE',
  },
  IL: {
    // Portal: data-idot.opendata.arcgis.com — search "AADT"
    // Point-based count stations — nearest may be 0.5-2mi from subject property
    type:      'arcgis',
    url:       'https://services1.arcgis.com/YbBpEPMPfBmEoTeA/arcgis/rest/services/IDOT_Annual_Average_Daily_Traffic/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'YEAR',
    nameField: 'ROUTE_NAME',
  },

  // ── Expansion states ──────────────────────────────────────────────────────
  PA: {
    // Portal: pennshare.maps.arcgis.com — search "Traffic Counts" or "AADT"
    // PennDOT point count stations; nearest station within 2000m radius
    type:      'arcgis',
    url:       'https://services2.arcgis.com/aqtMKFbOb7yvFEle/arcgis/rest/services/PennDOT_Traffic_Counts/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'COUNT_YEAR',
    nameField: 'ST_RT_NO',
  },
  GA: {
    // Portal: gisdata-dot-ga-gdot.opendata.arcgis.com — search "AADT"
    // GDOT count stations statewide; fields vary by service version
    type:      'arcgis',
    url:       'https://services3.arcgis.com/S3qONdHkRLXX5cxE/arcgis/rest/services/GDOT_AADT/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'YEAR',
    nameField: 'RDNAME',
  },
  OH: {
    // Portal: odot-mopit.opendata.arcgis.com — search "Annual Average Daily Traffic"
    // ODOT TrafficCount stations; COUNT_YEAR field
    type:      'arcgis',
    url:       'https://services1.arcgis.com/nKQKv6pFXGn0l8V6/arcgis/rest/services/ODOT_AADT/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'COUNT_YEAR',
    nameField: 'ROUTE',
  },
  AZ: {
    // Portal: opendata.azdot.gov — search "Traffic Counts"
    // ADOT annual traffic counts; statewide point layer
    type:      'arcgis',
    url:       'https://services6.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/ADOT_TrafficCounts/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'YEAR',
    nameField: 'ROUTE_NAME',
  },
  WA: {
    // Portal: gisdata-wsdot.opendata.arcgis.com — search "Annual Traffic"
    // WSDOT Annual Traffic Report count locations
    type:      'arcgis',
    url:       'https://services3.arcgis.com/cXjzJz8SuKphBuqg/arcgis/rest/services/WSDOT_TrafficCounts/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'Year',
    nameField: 'RouteID',
  },
  CO: {
    // Portal: opendata-cdot.hub.arcgis.com — search "Traffic Counts" or "AADT"
    // CDOT statewide count stations
    type:      'arcgis',
    url:       'https://services3.arcgis.com/7m0Fo9gO3yFjRIGU/arcgis/rest/services/CDOT_AADT/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'YEAR',
    nameField: 'ROUTE_NO',
  },
  NC: {
    // Portal: gis.ncdot.gov / nconemap.gov — Transportation layer group
    // NCDOT traffic count stations from NC OneMap
    type:      'arcgis',
    url:       'https://services.nconemap.gov/secure/rest/services/NC1Map_Transportation/MapServer/2/query',
    aadtField: 'AADT',
    yearField: 'YEAR',
    nameField: 'ROUTE_NAME',
  },
  VA: {
    // Portal: vdot.maps.arcgis.com — search "Traffic Count Stations"
    // VDOT count stations; AADT and ROUTE_NO fields
    type:      'arcgis',
    url:       'https://services.arcgis.com/p5v98VHDX9Atv3l7/arcgis/rest/services/VDOT_Traffic_Count_Stations/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'YEAR',
    nameField: 'ROUTE_NO',
  },
  MA: {
    // Portal: opendata.massdot.state.ma.us — self-hosted ArcGIS at gis.massdot.state.ma.us
    // MassDOT Traffic Volume counts; point layer
    type:      'arcgis',
    url:       'https://gis.massdot.state.ma.us/arcgis/rest/services/Roads/TrafficVolumes/MapServer/0/query',
    aadtField: 'AADT',
    yearField: 'YEAR_OF_COUNT',
    nameField: 'ROUTE_ID',
  },
  MI: {
    // Portal: gisdata-mdot.opendata.arcgis.com — search "AADT" or "Traffic Counts"
    // MDOT statewide traffic volume count stations
    type:      'arcgis',
    url:       'https://services3.arcgis.com/jRXVLiEt2KUlMCoN/arcgis/rest/services/MDOT_Annual_Average_Daily_Traffic/FeatureServer/0/query',
    aadtField: 'AADT',
    yearField: 'YEAR',
    nameField: 'ROAD_NAME',
  },
};

// State bounding boxes for routing
// Order matters — more specific boxes listed first to avoid overlap edge cases
const STATE_BOUNDS = {
  NJ: { minLat: 38.9, maxLat: 41.4, minLng: -75.6, maxLng: -73.9 },
  NY: { minLat: 40.5, maxLat: 45.0, minLng: -79.8, maxLng: -71.8 },
  TX: { minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
  FL: { minLat: 24.4, maxLat: 31.0, minLng: -87.6,  maxLng: -80.0 },
  CA: { minLat: 32.5, maxLat: 42.0, minLng: -124.4, maxLng: -114.1 },
  IL: { minLat: 36.9, maxLat: 42.5, minLng: -91.5,  maxLng: -87.0 },
  // Expansion states
  PA: { minLat: 39.7, maxLat: 42.3, minLng: -80.5,  maxLng: -74.7 },
  GA: { minLat: 30.4, maxLat: 35.0, minLng: -85.6,  maxLng: -80.8 },
  OH: { minLat: 38.4, maxLat: 42.0, minLng: -84.8,  maxLng: -80.5 },
  AZ: { minLat: 31.3, maxLat: 37.0, minLng: -114.8, maxLng: -109.0 },
  WA: { minLat: 45.5, maxLat: 49.0, minLng: -124.7, maxLng: -116.9 },
  CO: { minLat: 37.0, maxLat: 41.0, minLng: -109.1, maxLng: -102.0 },
  NC: { minLat: 33.8, maxLat: 36.6, minLng: -84.3,  maxLng: -75.5 },
  VA: { minLat: 36.5, maxLat: 39.5, minLng: -83.7,  maxLng: -75.2 },
  MA: { minLat: 41.2, maxLat: 42.9, minLng: -73.5,  maxLng: -69.9 },
  MI: { minLat: 41.7, maxLat: 48.3, minLng: -90.4,  maxLng: -82.4 },
};

function getState(lat, lng) {
  for (const [state, b] of Object.entries(STATE_BOUNDS)) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) return state;
  }
  return null;
}

// ─── ArcGIS query ───
async function queryArcGIS(svc, lat, lng, state = '') {
  // NJ uses year-suffixed fields; others use single aadtField
  const yearFields = svc.aadtYearFields || [];
  const baseFields = yearFields.length
    ? [...yearFields, svc.nameField].filter(Boolean)
    : [svc.aadtField, svc.yearField, svc.nameField, svc.aadtField2].filter(Boolean);

  // Expansion states and IL/TX have sparser count station networks — wider search radius
  const sparseStates = ['IL','TX','CO','NC','VA','MA','MI','WA','AZ','OH','GA','PA'];
  const searchRadius = sparseStates.includes(state) ? 4000 : 2000;

  const params = {
    geometry:           JSON.stringify({ x: lng, y: lat }),
    geometryType:       'esriGeometryPoint',
    inSR:               '4326',
    spatialRel:         'esriSpatialRelIntersects',
    distance:           searchRadius,
    units:              'esriSRUnit_Meter',
    outFields:          baseFields.join(','),
    resultRecordCount:  5,
    f:                  'json',
  };

  const resp = await axios.get(svc.url, { params, timeout: 10000 });
  const features = resp.data?.features;
  if (!features?.length) return null;

  // Helper: returns true if road name looks like a limited-access highway
  const isHighway = (name) => !name ? false :
    /^interstate$/i.test(name.trim()) ||
    /\binterstate\b/i.test(name) ||
    /^I-?\d/i.test(name) ||
    /\bTurnpike\b/i.test(name) ||
    /\bExpressway\b/i.test(name);

  // For NJ-style multi-year fields: prefer surface roads over Interstates/Turnpikes.
  // A broker showing 105K AADT "Interstate" for a strip center on Route 38 is wrong.
  // Strategy: two passes — surface road first, highway as fallback.
  if (yearFields.length) {
    const getBestForFeatures = (feats) => {
      let bestAadt = 0, bestYear = null, bestRoad = null;
      for (const feat of feats) {
        const attrs = feat.attributes;
        for (const field of yearFields) {
          const val = parseInt(attrs[field]);
          if (val > bestAadt) {
            bestAadt = val;
            bestYear = field.replace('AADT_', '');
            bestRoad = attrs[svc.nameField] || null;
          }
        }
      }
      return { aadt_count: bestAadt || null, year: bestYear, road_name: bestRoad };
    };

    const surfaceFeatures = features.filter(f => !isHighway(f.attributes[svc.nameField]));
    const result = surfaceFeatures.length ? getBestForFeatures(surfaceFeatures) : getBestForFeatures(features);
    return result;
  }

  // Standard single-field handling: prefer non-highway features (ArcGIS returns closest first)
  const surfaceFeats = features.filter(f => !isHighway(f.attributes[svc.nameField]));
  const picked = (surfaceFeats.length ? surfaceFeats : features)[0];
  const attrs = picked.attributes;
  let aadt = parseInt(attrs[svc.aadtField]) || 0;
  if (svc.aadtField2) aadt = Math.max(aadt, parseInt(attrs[svc.aadtField2]) || 0);

  return {
    aadt_count: aadt || null,
    year:       attrs[svc.yearField] || null,
    road_name:  attrs[svc.nameField] || null,
  };
}

// ─── Socrata query (NY) ───
async function querySocrata(svc, lat, lng) {
  const delta = 0.05; // ~3-mile bounding box to catch nearby count stations
  const where = `latitude between '${lat - delta}' and '${lat + delta}' AND longitude between '${lng - delta}' and '${lng + delta}'`;

  const resp = await axios.get(svc.url, {
    params: { $where: where, $limit: 5, $order: `${svc.aadtField} DESC` },
    timeout: 10000,
  });

  const rows = resp.data;
  if (!rows?.length) return null;

  const top = rows[0];
  return {
    aadt_count: parseInt(top[svc.aadtField]) || null,
    year:       top[svc.yearField] || null,
    road_name:  top[svc.nameField] || null,
  };
}

// ─── OSM fallback ───
function osmFallback(overpassData) {
  const traffic = overpassData?.traffic;
  if (!traffic) return null;
  return {
    aadt_count:  traffic.aadt_estimate || null,
    road_name:   traffic.road_name || null,
    year:        null,
    source:      'OSM road classification (estimate)',
    is_estimate: true,
    confidence:  traffic.confidence || 'low',
  };
}

async function fetchDotAADT(lat, lng, overpassData = null) {
  const key   = geoKey('dot-aadt', lat, lng);
  const state = getState(lat, lng);

  return cachedFetch(key, async () => {
    if (!state) {
      console.log(`[DOT-AADT] No DOT coverage for ${lat},${lng} — using OSM fallback`);
      return osmFallback(overpassData) || { aadt_count: null, source: 'no DOT coverage', is_estimate: true };
    }

    const svc = DOT_SERVICES[state];
    console.log(`[DOT-AADT] Querying ${state} DOT...`);

    try {
      const result = svc.type === 'socrata'
        ? await querySocrata(svc, lat, lng)
        : await queryArcGIS(svc, lat, lng, state);

      if (!result || !result.aadt_count) {
        console.warn(`[DOT-AADT] ${state} returned no AADT — using OSM fallback`);
        return osmFallback(overpassData) || { aadt_count: null, source: `${state} DOT — no data`, is_estimate: true };
      }

      console.log(`[DOT-AADT] ${state}: ${result.aadt_count.toLocaleString()} AADT on ${result.road_name || 'nearby road'}`);
      return {
        aadt_count:  result.aadt_count,
        road_name:   result.road_name,
        year:        result.year,
        state,
        source:      `${state} DOT`,
        is_estimate: false,
      };

    } catch (err) {
      console.error(`[DOT-AADT] ${state} query failed: ${err.message} — using OSM fallback`);
      return osmFallback(overpassData) || { aadt_count: null, source: `${state} DOT error`, is_estimate: true };
    }
  }, 30);
}

module.exports = { fetchDotAADT };

// CHECKPOINT — 2026-04-17
// Completed: DOT AADT expanded to 16 states: NJ, NY, TX, FL, CA, IL + PA, GA, OH, AZ, WA, CO, NC, VA, MA, MI
//            All expansion states use ArcGIS REST with standard AADT/YEAR/name fields
//            State bounding boxes added for all 16
//            Graceful fallback to OSM estimate for uncovered states
//            IMPORTANT: Expansion state org IDs/service names are best-effort from portal research.
//            If any state returns 0 results, verify service URL at the portal listed in that state's comment.
// State: working (NJ/NY/TX/FL/CA/IL confirmed; expansion states need live verification)
// Next: Pressure test full tool against CRE standards
// Dependencies: cache.js
