/**
 * Overpass API (OpenStreetMap) — named competitor detection, void analysis, traffic estimation.
 * Free, no key required, ~10k req/day.
 */

const axios = require('axios');

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function overpassRequest(query, retries = 2) {
  for (const url of OVERPASS_MIRRORS) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const resp = await axios.post(url, `data=${encodeURIComponent(query)}`, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 40000,
        });
        return resp.data?.elements || [];
      } catch (err) {
        const isRetryable = err.response?.status === 504 || err.response?.status === 429 || err.code === 'ECONNABORTED';
        if (isRetryable && attempt < retries) {
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        break; // try next mirror
      }
    }
  }
  throw new Error('All Overpass mirrors failed');
}

// Haversine distance in miles
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Category definitions: OSM tags + known brand names for matching
const VOID_CATEGORIES = [
  {
    id: 'coffee',
    label: 'Coffee / Café',
    tags: ['amenity=cafe', 'amenity=coffee_shop'],
    brands: ['starbucks', "peet's", 'dunkin', 'dutch bros', 'caribou', 'blue bottle', 'intelligentsia', 'lavazza', 'second cup', 'the coffee bean', 'panera'],
    saturation_threshold: 5,
    underserved_threshold: 1,
  },
  {
    id: 'qsr',
    label: 'Quick Service / Fast Food',
    tags: ['amenity=fast_food'],
    brands: ["mcdonald's", 'burger king', "wendy's", 'subway', 'taco bell', 'chick-fil-a', 'popeyes', "jack in the box", 'sonic', 'arby\'s', "dairy queen", "carl's jr", 'hardee\'s', 'whataburger', 'checkers', 'rally\'s'],
    saturation_threshold: 8,
    underserved_threshold: 2,
  },
  {
    id: 'fast_casual',
    label: 'Fast Casual / Dining',
    tags: ['amenity=restaurant'],
    brands: ['chipotle', 'shake shack', 'five guys', 'sweetgreen', 'cava', 'wingstop', 'raising cane', 'first watch', 'mod pizza', 'noodles', 'potbelly', 'jason\'s deli'],
    saturation_threshold: 6,
    underserved_threshold: 1,
  },
  {
    id: 'fitness',
    label: 'Fitness / Gym',
    tags: ['leisure=fitness_centre', 'leisure=sports_centre'],
    brands: ['planet fitness', 'la fitness', "gold's gym", 'anytime fitness', 'crunch', "barry's", 'soulcycle', 'orangetheory', 'f45', 'equinox', 'lifetime', 'pure barre', 'crossfit', 'ymca'],
    saturation_threshold: 4,
    underserved_threshold: 0,
  },
  {
    id: 'grocery',
    label: 'Grocery',
    tags: ['shop=supermarket', 'shop=grocery'],
    brands: ['kroger', 'safeway', 'whole foods', "trader joe's", 'publix', 'aldi', 'sprouts', 'h-e-b', 'albertsons', 'meijer', 'wegmans', 'food lion', 'giant', 'stop & shop', 'winn-dixie', 'harris teeter', 'winco'],
    saturation_threshold: 3,
    underserved_threshold: 0,
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy / Drug Store',
    tags: ['amenity=pharmacy', 'shop=pharmacy'],
    brands: ['cvs', 'walgreens', 'rite aid', 'walmart pharmacy', 'costco pharmacy'],
    saturation_threshold: 3,
    underserved_threshold: 0,
  },
  {
    id: 'urgent_care',
    label: 'Urgent Care / Medical',
    tags: ['amenity=clinic', 'amenity=doctors', 'healthcare=clinic'],
    brands: ['citymd', 'gohealth', 'one medical', 'afc urgent care', 'minuteclinic', 'concentra', 'nextcare', 'patient first', 'statcare'],
    saturation_threshold: 4,
    underserved_threshold: 0,
  },
  {
    id: 'bank',
    label: 'Bank / Financial',
    tags: ['amenity=bank'],
    brands: ['chase', 'bank of america', 'wells fargo', 'citi', 'td bank', 'us bank', 'pnc', 'truist', 'regions', 'suntrust', 'bb&t'],
    saturation_threshold: 5,
    underserved_threshold: 0,
  },
  {
    id: 'nail_salon',
    label: 'Nail / Beauty Salon',
    tags: ['shop=beauty', 'shop=hairdresser', 'shop=nail_salon'],
    brands: ['nail studio', 'zen nails', 'happy nails', 'supercuts', 'great clips', 'sport clips', 'fantastic sams', 'ulta', 'sephora'],
    saturation_threshold: 5,
    underserved_threshold: 1,
  },
  {
    id: 'pet',
    label: 'Pet Services',
    tags: ['shop=pet', 'amenity=veterinary'],
    brands: ['petsmart', 'petco', 'pet supplies plus', 'animal hospital', 'banfield'],
    saturation_threshold: 3,
    underserved_threshold: 0,
  },
];

// Classify a single OSM element into one of our categories
function classifyElement(el) {
  const tags  = el.tags || {};
  const name  = (tags.name || '').toLowerCase();
  const amenity = (tags.amenity || '').toLowerCase();
  const shop    = (tags.shop   || '').toLowerCase();
  const leisure = (tags.leisure || '').toLowerCase();
  const health  = (tags.healthcare || '').toLowerCase();

  for (const cat of VOID_CATEGORIES) {
    // Tag match
    for (const tagStr of cat.tags) {
      const [key, val] = tagStr.split('=');
      const elVal = tags[key] || '';
      if (elVal.toLowerCase() === val) return cat.id;
    }
    // Brand name match
    for (const brand of cat.brands) {
      if (name.includes(brand)) return cat.id;
    }
  }

  // Fallback tag mappings not covered above
  if (amenity === 'restaurant' || amenity === 'food_court') return 'fast_casual';
  if (shop === 'convenience') return 'qsr';

  return null;
}

// Get lat/lng from an OSM element (node has lat/lng directly; way/relation have center)
function getCoords(el) {
  if (el.type === 'node') return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

// Run Overpass query — single call for all categories within 3 miles
async function queryOverpass(lat, lng) {
  // 3 miles ≈ 4828 meters
  const radius = 4828;
  const tagFilters = [
    ...VOID_CATEGORIES.flatMap(c => c.tags.map(t => {
      const [k, v] = t.split('=');
      return `node["${k}"="${v}"](around:${radius},${lat},${lng});`;
    })),
    // road types for traffic estimation
    `way["highway"~"motorway|trunk|primary|secondary|tertiary|residential"](around:500,${lat},${lng});`,
  ];

  const query = `[out:json][timeout:30];\n(\n${tagFilters.join('\n')}\n);\nout center tags;`;

  return overpassRequest(query);
}

// Void analysis: categorize all elements and compute per-category stats
function buildVoidAnalysis(elements, lat, lng) {
  // Group by category
  const buckets = {};
  for (const cat of VOID_CATEGORIES) buckets[cat.id] = [];

  const roads = [];

  for (const el of elements) {
    // Road elements for traffic
    if (el.type === 'way' && el.tags?.highway) {
      roads.push(el.tags.highway);
      continue;
    }

    const catId = classifyElement(el);
    if (!catId) continue;

    const coords = getCoords(el);
    if (!coords) continue;

    const dist = distanceMiles(lat, lng, coords.lat, coords.lng);
    buckets[catId].push({
      name: el.tags?.name || null,
      distance_mi: +dist.toFixed(2),
    });
  }

  // Build result per category
  const result = VOID_CATEGORIES.map(cat => {
    const items = buckets[cat.id].sort((a, b) => a.distance_mi - b.distance_mi);
    const within1 = items.filter(i => i.distance_mi <= 1).length;
    const within3 = items.filter(i => i.distance_mi <= 3).length;
    const nearest = items[0] || null;

    let status;
    if (within1 >= cat.saturation_threshold) {
      status = 'Saturated';
    } else if (within1 <= cat.underserved_threshold) {
      status = 'Underserved';
    } else {
      status = 'Balanced';
    }

    // Named competitors within 1 mile (deduplicated, named only)
    const namedWithin1 = [...new Set(
      items.filter(i => i.distance_mi <= 1 && i.name).map(i => i.name)
    )].slice(0, 4);

    return {
      id:             cat.id,
      category:       cat.label,
      count_1mi:      within1,
      count_3mi:      within3,
      nearest_name:   nearest?.name || null,
      nearest_dist_mi: nearest ? +nearest.distance_mi.toFixed(2) : null,
      named_within_1mi: namedWithin1,
      status,
    };
  });

  return { categories: result, roads };
}

// Traffic estimation from road classification near the property
function estimateTraffic(roads) {
  const AADT = {
    motorway:    { typical: 65000, label: 'Highway / Freeway' },
    trunk:       { typical: 32000, label: 'Major Arterial' },
    primary:     { typical: 22000, label: 'Primary Arterial' },
    secondary:   { typical: 12000, label: 'Secondary Road' },
    tertiary:    { typical:  5500, label: 'Tertiary Road' },
    residential: { typical:  1500, label: 'Residential Street' },
  };

  const priority = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential'];

  for (const roadType of priority) {
    if (roads.includes(roadType)) {
      return {
        aadt_estimate:  AADT[roadType].typical,
        road_class:     roadType,
        road_label:     AADT[roadType].label,
        confidence:     'estimated from road classification',
        source:         'OpenStreetMap',
      };
    }
  }

  return {
    aadt_estimate:  null,
    road_class:     'unknown',
    road_label:     'Unknown',
    confidence:     'unavailable',
    source:         'OpenStreetMap',
  };
}

async function fetchCompetitorsAndTraffic(lat, lng) {
  const elements = await queryOverpass(lat, lng);
  const { categories, roads } = buildVoidAnalysis(elements, lat, lng);
  const traffic = estimateTraffic(roads);
  return { void_analysis: categories, traffic };
}

module.exports = { fetchCompetitorsAndTraffic };
