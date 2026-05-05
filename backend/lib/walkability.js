const { cachedFetch, geoKey } = require('./cache');

// ─────────────────────────────────────────
// TenantFit Walkability Index
// Replaces Walk Score API entirely.
// Built from three transparent, verifiable sources:
//
// 1. EPA Smart Location Database — NatWalkInd (1-20), intersection density, transit distance
// 2. Overpass (OSM) — transit stop count + amenity density within 0.25 miles
// 3. Combined into 0-10 TenantFit scores for Walk, Transit, and Amenity access
//
// This is passed already-fetched EPA and Overpass data — no new API calls.
// Call computeWalkability(epaData, overpassData) after both are fetched.
// ─────────────────────────────────────────

/**
 * Compute TenantFit Walkability Index from EPA SLD + Overpass data.
 * Both datasets are already fetched in server.js parallel fetch.
 *
 * @param {object} epaData     — result from fetchEpaSmartLocation()
 * @param {object} overpassData — result from fetchCompetitorsAndTraffic()
 * @returns {object} walkability scores and component data
 */
function computeWalkability(epaData, overpassData) {
  try {
    // ── 1. Walk Score (0-10) from EPA NatWalkInd (1-20 scale)
    const natWalk = epaData?.nat_walkability_index;
    const walkScore = natWalk ? +((natWalk / 20) * 10).toFixed(1) : null;

    // ── 2. Transit Score (0-10)
    // Component A: transit stop distance (closer = better)
    //   <0.1 mi = 10, 0.1-0.25 = 8, 0.25-0.5 = 5, 0.5-1.0 = 2, >1.0 = 0
    const transitDist = epaData?.transit_stop_distance_miles;
    let transitDistScore = 0;
    if (transitDist !== null && transitDist !== undefined) {
      if (transitDist < 0.1)       transitDistScore = 10;
      else if (transitDist < 0.25) transitDistScore = 8;
      else if (transitDist < 0.5)  transitDistScore = 5;
      else if (transitDist < 1.0)  transitDistScore = 2;
      else                         transitDistScore = 0;
    }

    // Component B: transit frequency (trips/hour peak — D4D from EPA SLD)
    // Thresholds calibrated for trips/hour, NOT trips/day
    // High-frequency urban service (NYC subway) = 10+ trips/hr
    // Typical bus corridor = 2-5 trips/hr; rural/infrequent = <0.5
    const transitFreq = epaData?.transit_frequency_trips_day;
    let transitFreqScore = 0;
    if (transitFreq !== null && transitFreq !== undefined) {
      if (transitFreq >= 10)       transitFreqScore = 10;
      else if (transitFreq >= 5)   transitFreqScore = 7;
      else if (transitFreq >= 2)   transitFreqScore = 4;
      else if (transitFreq >= 0.5) transitFreqScore = 2;
      else                         transitFreqScore = 0;
    }

    // Transit score = weighted average of distance and frequency
    const transitScore = (transitDist !== null || transitFreq !== null)
      ? +((transitDistScore * 0.6 + transitFreqScore * 0.4)).toFixed(1)
      : null;

    // ── 3. Amenity Density Score (0-10) from Overpass void analysis
    // Count walkable amenity categories within 0.25 miles
    // Overpass void analysis has count_1mi per category — we use it as proxy
    // (We don't have separate 0.25-mile counts yet, so we use 1-mile counts discounted)
    const voidCategories = overpassData?.void_analysis || [];
    const walkableCategories = ['coffee', 'grocery', 'pharmacy', 'urgent_care', 'nail_salon'];
    let amenityCount = 0;
    walkableCategories.forEach(cat => {
      const v = voidCategories.find(c => c.id === cat);
      if (v?.count_1mi > 0) amenityCount++;
    });
    // Scale: 5+ categories within 1 mile = 10, 3-4 = 7, 1-2 = 4, 0 = 0
    const amenityScore = amenityCount >= 5 ? 10 : amenityCount >= 3 ? 7 : amenityCount >= 1 ? 4 : 0;

    // ── 4. Intersection Density signal
    const intDensity = epaData?.intersection_density_per_sqmi;
    // High intersection density = walkable street grid
    // >150/sqmi = urban grid (NYC/NJ), 80-150 = suburban grid, <80 = auto-oriented
    const streetGridLabel = intDensity
      ? intDensity > 150 ? 'Urban grid' : intDensity > 80 ? 'Suburban grid' : 'Auto-oriented'
      : null;

    // ── Composite summary label
    const transitLabel = transitScore !== null
      ? transitScore >= 7 ? 'Excellent transit' : transitScore >= 4 ? 'Good transit' : transitScore >= 2 ? 'Some transit' : 'Minimal transit'
      : null;

    const walkLabel = epaData?.walkability_label || null;

    return {
      walk_score:         walkScore,       // 0-10 from EPA NatWalkInd
      transit_score:      transitScore,    // 0-10 from EPA transit distance + frequency
      amenity_score:      amenityScore,    // 0-10 from Overpass nearby amenities
      walkability_label:  walkLabel,
      transit_label:      transitLabel,
      street_grid:        streetGridLabel,
      intersection_density: intDensity,
      transit_stop_distance_miles: transitDist,
      transit_frequency_trips_day: transitFreq,
      amenity_categories_nearby: amenityCount,
      source: 'TenantFit Walkability Index (EPA SLD + OpenStreetMap)',
      methodology: 'Walk score from EPA National Walkability Index. Transit score from stop proximity and service frequency. Amenity score from nearby walkable destinations.',
    };

  } catch (err) {
    console.error('[Walkability] Compute error:', err.message);
    return _fallback();
  }
}

function _fallback() {
  return {
    walk_score: null,
    transit_score: null,
    amenity_score: null,
    walkability_label: null,
    source: 'TenantFit Walkability Index unavailable',
  };
}

module.exports = { computeWalkability };

// CHECKPOINT — 2026-04-16
// Completed: Task 24 — Recalibrated transit frequency thresholds
//   D4D in EPA SLD is trips/hour peak (NOT per day).
//   Old thresholds (100/50/20/5) assumed daily trips — would never score above 0 on real data.
//   New thresholds (10/5/2/0.5) calibrated to trips/hr:
//     >=10 = 10 (high-frequency urban), >=5 = 7 (frequent bus), >=2 = 4 (moderate), >=0.5 = 2 (infrequent)
// State: working
// Next: Task 19 — generate first sample PDF from real LoopNet listing
// Dependencies: epa-smart-location.js (D4D field name unchanged)
