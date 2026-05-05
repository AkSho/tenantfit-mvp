const axios = require('axios');
const { cachedFetch } = require('./cache');

// ─────────────────────────────────────────
// BLS QCEW — Quarterly Census of Employment and Wages
// County-level employment by industry (NAICS), quarterly
// API: https://api.bls.gov/publicAPI/v2/timeseries/data/
// Series ID format: ENU{fips5}{ownership}{size}{naics}
//   ownership: 5 = private
//   size: 0 = all sizes
//   naics: supersector code
//
// Industries tracked for retail site scoring:
//   72 = Leisure & Hospitality (Food Service proxy)
//   62 = Health Care & Social Assistance
//   54 = Professional & Business Services
//   44-45 = Retail Trade
//   52 = Finance & Insurance
// ─────────────────────────────────────────

const BLS_API_KEY = process.env.BLS_API_KEY || ''; // Public API works without key at lower rate limits

// NAICS supersector codes → readable labels
const INDUSTRIES = {
  '72': 'Leisure & Hospitality (Food/Bev)',
  '62': 'Health Care & Social Assistance',
  '54': 'Professional & Business Services',
  '44': 'Retail Trade',
  '52': 'Finance & Insurance',
};

function buildSeriesId(fips5, naics) {
  // ENU + 5-digit FIPS + 5 (private) + 0 (all sizes) + supersector
  return `ENU${fips5}50${naics}`;
}

async function fetchBLSQCEW(fips) {
  if (!fips?.state || !fips?.county) return _fallback();

  const fips5 = `${fips.state}${fips.county}`;
  const key   = `bls-qcew:${fips5}`;

  return cachedFetch(key, async () => {
    try {
      const currentYear = new Date().getFullYear();
      const startYear   = currentYear - 2;

      const seriesIds = Object.keys(INDUSTRIES).map(naics => buildSeriesId(fips5, naics));

      const payload = {
        seriesid:        seriesIds,
        startyear:       String(startYear),
        endyear:         String(currentYear),
        calculations:    true,
        annualaverage:   true,
        registrationkey: BLS_API_KEY,
      };

      const resp = await axios.post(
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        payload,
        { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
      );

      if (resp.data?.status !== 'REQUEST_SUCCEEDED') {
        console.warn('[BLS-QCEW] API status:', resp.data?.status, resp.data?.message);
        return _fallback();
      }

      const result = {};

      for (const series of (resp.data?.Results?.series || [])) {
        // Extract NAICS from series ID: ENU{5-digit fips}{5}{0}{2-digit naics}
        const naics = series.seriesID.slice(-2);
        const label = INDUSTRIES[naics] || naics;
        const data  = series.data || [];

        // Get annual average employment for most recent 2 years
        const annuals = data
          .filter(d => d.period === 'M13') // M13 = annual average
          .sort((a, b) => b.year - a.year);

        if (annuals.length >= 2) {
          const recent  = parseInt(annuals[0].value?.replace(/,/g, '')) || 0;
          const prior   = parseInt(annuals[1].value?.replace(/,/g, '')) || 0;
          const yoyPct  = prior > 0 ? +((recent - prior) / prior * 100).toFixed(1) : null;
          const trend   = yoyPct === null ? 'unknown' : yoyPct > 2 ? 'growing' : yoyPct < -2 ? 'declining' : 'stable';

          result[naics] = {
            label,
            employment_recent: recent,
            employment_prior:  prior,
            yoy_pct:           yoyPct,
            trend,
            year_recent:       annuals[0].year,
          };
        } else if (annuals.length === 1) {
          result[naics] = {
            label,
            employment_recent: parseInt(annuals[0].value?.replace(/,/g, '')) || 0,
            yoy_pct:           null,
            trend:             'insufficient data',
            year_recent:       annuals[0].year,
          };
        }
      }

      if (!Object.keys(result).length) {
        console.warn(`[BLS-QCEW] No data returned for FIPS ${fips5}`);
        return _fallback();
      }

      console.log(`[BLS-QCEW] ${fips5}: ${Object.keys(result).length} industries fetched`);
      return {
        industries: result,
        fips5,
        source: 'BLS Quarterly Census of Employment and Wages',
      };

    } catch (err) {
      console.error('[BLS-QCEW] Error:', err.message);
      return _fallback();
    }
  }, 90); // 90-day TTL — quarterly data
}

function _fallback() {
  return { industries: null, source: 'BLS QCEW unavailable' };
}

module.exports = { fetchBLSQCEW };

// CHECKPOINT — 2026-04-16
// Completed: BLS QCEW county employment by industry
//            Tracks 5 industries: food/bev, healthcare, professional services, retail, finance
//            Returns YoY % change + trend tag per industry
//            Used in trade area trajectory scoring and psychographic profiling
// State: working
// Next: Task 10 — epa-smart-location.js
// Dependencies: cache.js
