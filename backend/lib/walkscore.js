/**
 * Walk Score API — walkability, transit, bike scores.
 * Free tier: 5,000 calls/day.
 * Requires WALK_SCORE_KEY in .env — omit gracefully if missing.
 * Get a free key at: https://www.walkscore.com/professional/api.php
 */

const axios = require('axios');

const WALK_SCORE_DESCRIPTIONS = {
  walk: [
    { min: 90, label: "Walker's Paradise" },
    { min: 70, label: 'Very Walkable' },
    { min: 50, label: 'Somewhat Walkable' },
    { min: 25, label: 'Car-Dependent' },
    { min: 0,  label: 'Almost All Errands Require a Car' },
  ],
  transit: [
    { min: 90, label: 'Rider\'s Paradise' },
    { min: 70, label: 'Excellent Transit' },
    { min: 50, label: 'Excellent Transit' },
    { min: 25, label: 'Some Transit' },
    { min: 0,  label: 'Minimal Transit' },
  ],
  bike: [
    { min: 90, label: 'Biker\'s Paradise' },
    { min: 70, label: 'Very Bikeable' },
    { min: 50, label: 'Bikeable' },
    { min: 0,  label: 'Bikeable with Some Infrastructure' },
  ],
};

function describe(score, type) {
  const tiers = WALK_SCORE_DESCRIPTIONS[type] || WALK_SCORE_DESCRIPTIONS.walk;
  for (const tier of tiers) {
    if (score >= tier.min) return tier.label;
  }
  return 'Unknown';
}

async function fetchWalkScore(lat, lng, address) {
  const key = process.env.WALK_SCORE_KEY;
  if (!key) return null; // Gracefully skip if key not configured

  try {
    const url = `https://api.walkscore.com/score?format=json&address=${encodeURIComponent(address)}&lat=${lat}&lon=${lng}&transit=1&bike=1&wsapikey=${key}`;
    const resp = await axios.get(url, { timeout: 8000 });
    const d = resp.data;

    if (!d || d.status !== 1) return null;

    return {
      walk_score:          d.walkscore ?? null,
      walk_description:    d.walkscore != null ? describe(d.walkscore, 'walk') : null,
      transit_score:       d.transit?.score ?? null,
      transit_description: d.transit?.score != null ? describe(d.transit.score, 'transit') : null,
      bike_score:          d.bike?.score ?? null,
      bike_description:    d.bike?.score != null ? describe(d.bike.score, 'bike') : null,
      source: 'Walk Score',
    };
  } catch (err) {
    console.error('[WalkScore] Error:', err.message);
    return null;
  }
}

module.exports = { fetchWalkScore };
