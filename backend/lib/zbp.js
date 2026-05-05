/**
 * Census ZIP Code Business Patterns (ZBP)
 * Business establishment counts by NAICS code within a ZIP.
 * Free, no key required (uses CENSUS_API_KEY if available).
 */

const axios = require('axios');
const CENSUS_KEY = process.env.CENSUS_API_KEY || '';

// NAICS → our category mapping
// Using 4-digit NAICS for broader coverage
const NAICS_MAP = {
  '7225':  'qsr_fast_food',        // Restaurants and Other Eating Places
  '7224':  'bars_drinking',        // Drinking Places
  '4451':  'grocery',              // Grocery Stores
  '4461':  'pharmacy',             // Health & Personal Care Stores
  '7139':  'fitness',              // Other Amusement/Recreation (fitness centers)
  '6211':  'medical_offices',      // Offices of Physicians
  '6213':  'dental',               // Offices of Dentists
  '6219':  'urgent_care',          // Other Health Practitioners
  '5221':  'bank',                 // Depository Credit Intermediation (banks)
  '5222':  'finance_nondep',       // Nondepository Credit
  '4481':  'clothing',             // Clothing Stores
  '5251':  'hardware',             // Hardware Stores
  '8121':  'salon_beauty',         // Hair, Nail, Beauty
  '8122':  'funeral_cremation',    // Funeral
  '5411':  'legal',                // Legal Services
  '6111':  'education_elem',       // Elementary/Secondary Schools
  '6113':  'college',              // Colleges
  '7211':  'hotels',               // Hotels and Motels
  '4539':  'misc_retail',          // Miscellaneous Retail
};

// Readable labels
const CATEGORY_LABELS = {
  qsr_fast_food:   'Restaurants & Food Service',
  bars_drinking:   'Bars & Drinking Establishments',
  grocery:         'Grocery & Food Stores',
  pharmacy:        'Pharmacy & Health/Personal Care',
  fitness:         'Fitness & Recreation',
  medical_offices: 'Medical Offices',
  dental:          'Dental Offices',
  urgent_care:     'Urgent Care & Health Services',
  bank:            'Bank Branches',
  clothing:        'Clothing & Apparel Stores',
  salon_beauty:    'Salon & Beauty Services',
  misc_retail:     'Specialty Retail',
};

async function fetchBusinessDensity(zip) {
  if (!zip || zip.length !== 5) return null;

  try {
    const naicsCodes = Object.keys(NAICS_MAP).join(',');
    const url = `https://api.census.gov/data/2018/zbp?get=NAICS2017,ESTAB&for=zipcode:${zip}&key=${CENSUS_KEY}`;
    const resp = await axios.get(url, { timeout: 10000 });

    if (!resp.data || resp.data.length < 2) return null;

    const headers = resp.data[0]; // ['NAICS2017', 'ESTAB', 'zipcode']
    const rows    = resp.data.slice(1);

    const result = {};
    for (const row of rows) {
      const naics  = (row[0] || '').toString().replace(/-/g, '');
      const estab  = parseInt(row[1]) || 0;
      const prefix = naics.substring(0, 4);
      const catId  = NAICS_MAP[prefix];
      if (catId) {
        result[catId] = (result[catId] || 0) + estab;
      }
    }

    // Build labeled output — only include categories with data
    const labeled = Object.entries(result)
      .filter(([k]) => CATEGORY_LABELS[k])
      .map(([k, count]) => ({
        category: CATEGORY_LABELS[k],
        establishments: count,
      }))
      .sort((a, b) => b.establishments - a.establishments)
      .slice(0, 8);

    return {
      zip,
      categories: labeled,
      source: 'Census ZIP Code Business Patterns (2018)',
    };

  } catch (err) {
    console.error('[ZBP] Error:', err.message);
    return null;
  }
}

module.exports = { fetchBusinessDensity };
