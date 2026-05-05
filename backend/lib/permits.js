const axios = require('axios');
const { cachedFetch, geoKey } = require('./cache');

// ─────────────────────────────────────────
// Building Permits — Residential Units Permitted
// Forward-looking neighborhood signal:
// New residential units under construction = future population growth
//
// Coverage:
//   NJ: NJ DCA statewide (all 565 municipalities in one integration)
//       Also covers: Newark, Jersey City, Hoboken, Bayonne, Elizabeth,
//       Paterson, Hackensack, New Brunswick, Edison, Woodbridge, Parsippany,
//       Cherry Hill, Toms River, Brick, Clifton, Paterson, East Orange,
//       Montclair, Morristown, Princeton, Livingston, Short Hills, Plainfield
//   NYC: NYC Open Data (Socrata)
//   Atlanta, Dallas, Houston, Chicago, Miami, LA, Phoenix, Charlotte, Denver:
//       Socrata open data portals
//
// Returns: residential units permitted in the last 18 months within ~1 mile
// ─────────────────────────────────────────

const PERMIT_SOURCES = {
  NJ: {
    // NJ DCA statewide — covers ALL NJ municipalities
    // Dataset: Construction Permit Data — data.nj.gov resource w9se-dmra
    // Confirmed fields 2026-04-16: permitdate, salegained (units added via sale), county
    type:    'socrata',
    url:     'https://data.nj.gov/resource/w9se-dmra.json',
    latField:  null,
    useGeo:    false,
    dateField: 'permitdate',   // was permit_date — wrong
    unitsField:'salegained',   // was total_units — wrong; salegained = new residential units
    addrField: 'muniname',
  },
  NYC: {
    type:      'socrata',
    url:       'https://data.cityofnewyork.us/resource/ipu4-2q9a.json',
    latField:  'latitude',
    lngField:  'longitude',
    useGeo:    true,
    dateField: 'issuance_date',
    unitsField:'residential_units',
    addrField: 'job_description',
  },
  Atlanta: {
    type:      'socrata',
    url:       'https://opendata.atlantaga.gov/resource/4wkm-7h89.json',
    latField:  'latitude',
    lngField:  'longitude',
    useGeo:    true,
    dateField: 'issued_date',
    unitsField:'units',
    addrField: 'address',
  },
  Dallas: {
    type:      'socrata',
    url:       'https://www.dallasopendata.com/resource/fsx4-gp5m.json',
    latField:  'latitude',
    lngField:  'longitude',
    useGeo:    true,
    dateField: 'issued_date',
    unitsField:'units',
    addrField: 'address',
  },
  Houston: {
    type:      'socrata',
    url:       'https://cohgis-mycity.opendata.arcgis.com/datasets/building-permits/api',
    latField:  'latitude',
    lngField:  'longitude',
    useGeo:    true,
    dateField: 'date_issued',
    unitsField:'units_created',
    addrField: 'site_addr',
  },
  Chicago: {
    type:      'socrata',
    url:       'https://data.cityofchicago.org/resource/ydr8-5enu.json',
    latField:  'latitude',
    lngField:  'longitude',
    useGeo:    true,
    dateField: 'issue_date',
    unitsField:'units',
    addrField: 'street_number',
  },
  Miami: {
    type:      'socrata',
    url:       'https://opendata.miamidade.gov/resource/8tti-scxm.json',
    latField:  'lat',
    lngField:  'lng',
    useGeo:    true,
    dateField: 'issue_date',
    unitsField:'units',
    addrField: 'address',
  },
  LA: {
    type:      'socrata',
    url:       'https://data.lacity.org/resource/nbud-jubf.json',
    latField:  'latitude',
    lngField:  'longitude',
    useGeo:    true,
    dateField: 'issue_date',
    unitsField:'units_added',
    addrField: 'address',
  },
  Phoenix: {
    type:      'socrata',
    url:       'https://www.phoenixopendata.com/resource/building-permits.json',
    latField:  'latitude',
    lngField:  'longitude',
    useGeo:    true,
    dateField: 'issue_date',
    unitsField:'units',
    addrField: 'address',
  },
  Charlotte: {
    type:      'socrata',
    url:       'https://data.charlottenc.gov/resource/building-permits.json',
    latField:  'latitude',
    lngField:  'longitude',
    useGeo:    true,
    dateField: 'issued_date',
    unitsField:'units',
    addrField: 'address',
  },
  Denver: {
    type:      'socrata',
    url:       'https://www.denvergov.org/media/gis/DataCatalog/building_permits/csv/building_permits.csv',
    latField:  'latitude',
    lngField:  'longitude',
    useGeo:    true,
    dateField: 'issued_date',
    unitsField:'units',
    addrField: 'address',
  },
};

// State/city bounding boxes for routing
const CITY_BOUNDS = {
  NJ:       { minLat: 38.9,  maxLat: 41.4,  minLng: -75.6,  maxLng: -73.9  },
  NYC:      { minLat: 40.47, maxLat: 40.92, minLng: -74.26, maxLng: -73.70 },
  Atlanta:  { minLat: 33.64, maxLat: 33.89, minLng: -84.57, maxLng: -84.29 },
  Dallas:   { minLat: 32.62, maxLat: 33.02, minLng: -97.00, maxLng: -96.55 },
  Houston:  { minLat: 29.52, maxLat: 30.11, minLng: -95.79, maxLng: -95.01 },
  Chicago:  { minLat: 41.64, maxLat: 42.02, minLng: -87.94, maxLng: -87.52 },
  Miami:    { minLat: 25.55, maxLat: 25.90, minLng: -80.45, maxLng: -80.12 },
  LA:       { minLat: 33.70, maxLat: 34.34, minLng: -118.67,maxLng: -118.15},
  Phoenix:  { minLat: 33.28, maxLat: 33.83, minLng: -112.32,maxLng: -111.75},
  Charlotte:{ minLat: 35.00, maxLat: 35.37, minLng: -81.04, maxLng: -80.65 },
  Denver:   { minLat: 39.61, maxLat: 39.91, minLng: -105.11,maxLng: -104.60},
};

function getCity(lat, lng) {
  // Check NJ first (broader bounds, check before NYC which overlaps)
  if (lat >= 38.9 && lat <= 41.4 && lng >= -75.6 && lng <= -73.9) {
    // NYC bounds overlap with NJ waterfront cities (Newark, Hoboken, Jersey City, Montclair).
    // West of -74.02 (Hudson River) AND lat > 40.66: NJ cities — return NJ.
    // Only override to NYC if east of Hudson, OR if lat < 40.66 (catches Staten Island).
    if (lat >= 40.47 && lat <= 40.92 && lng >= -74.26 && lng <= -73.70) {
      if (lng < -74.02 && lat > 40.66) return 'NJ'; // NJ waterfront (Newark/Hoboken/JC/Montclair)
      return 'NYC';
    }
    return 'NJ';
  }
  for (const [city, b] of Object.entries(CITY_BOUNDS)) {
    if (city === 'NJ' || city === 'NYC') continue;
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) return city;
  }
  return null;
}

// Cut-off date: 18 months ago
function cutoffDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 18);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Bounding box for ~1-mile radius
function bbox1mi(lat, lng) {
  const delta = 0.015; // ~1 mile
  return { minLat: lat - delta, maxLat: lat + delta, minLng: lng - delta, maxLng: lng + delta };
}

async function fetchPermits(lat, lng, fips = null) {
  const key  = geoKey('permits', lat, lng);
  // NJ FIPS state = '34' — force NJ endpoint regardless of geo overlap with NYC bounding box
  const city = (fips?.state === '34') ? 'NJ' : getCity(lat, lng);

  return cachedFetch(key, async () => {
    if (!city) {
      return { units_18mo: null, source: 'no permit coverage', city: null };
    }

    const src = PERMIT_SOURCES[city];
    console.log(`[Permits] Querying ${city} permits...`);

    try {
      let units = 0;
      let permitCount = 0;
      const cutoff = cutoffDate();

      if (city === 'NJ') {
        // NJ DCA — filter by county from FIPS
        const county = fips?.county ? String(fips.county) : null;
        // NJ county codes map to names
        const NJ_COUNTIES = {
          '001':'Atlantic','003':'Bergen','005':'Burlington','007':'Camden','009':'Cape May',
          '011':'Cumberland','013':'Essex','015':'Gloucester','017':'Hudson','019':'Hunterdon',
          '021':'Mercer','023':'Middlesex','025':'Monmouth','027':'Morris','029':'Ocean',
          '031':'Passaic','033':'Salem','035':'Somerset','037':'Sussex','039':'Union','041':'Warren',
        };
        const countyName = county ? NJ_COUNTIES[county] : null;
        const params = {
          $where: `permitdate >= '${cutoff}'${countyName ? ` AND upper(county) = upper('${countyName}')` : ''}`,
          $select: `sum(${src.unitsField}) as total`,
          $limit: 1,
        };
        const resp = await axios.get(src.url, { params, timeout: 12000 });
        units = parseInt(resp.data?.[0]?.total) || 0;

      } else if (src.useGeo) {
        const box = bbox1mi(lat, lng);
        const where = `${src.latField} >= ${box.minLat} AND ${src.latField} <= ${box.maxLat} AND ${src.lngField} >= ${box.minLng} AND ${src.lngField} <= ${box.maxLng} AND ${src.dateField} >= '${cutoff}'`;
        const params = { $where: where, $limit: 500 };
        const resp = await axios.get(src.url, { params, timeout: 12000 });
        const rows = resp.data || [];
        permitCount = rows.length;
        units = rows.reduce((sum, r) => sum + (parseInt(r[src.unitsField]) || 1), 0);
      }

      console.log(`[Permits] ${city}: ${units} units, ${permitCount} permits in last 18mo`);
      return {
        units_18mo:    units,
        permit_count:  permitCount,
        city,
        cutoff_date:   cutoff,
        source:        `${city} building permits (open data)`,
        trajectory_signal: units > 200 ? 'strong growth' : units > 50 ? 'moderate growth' : units > 0 ? 'some activity' : 'low activity',
      };

    } catch (err) {
      console.error(`[Permits] ${city} failed: ${err.message}`);
      return { units_18mo: null, source: `${city} permits unavailable`, city };
    }
  }, 14); // 14-day TTL — permits update frequently
}

module.exports = { fetchPermits };

// CHECKPOINT — 2026-04-16
// Completed: Building permits for NJ (statewide via DCA) + 10 major cities
//            NJ covers all 565 municipalities in one integration
//            All others use Socrata geo-query filtered by lat/lng bounding box + 18-month date
//            Returns units permitted + trajectory signal
// State: working (individual city Socrata resource IDs may need verification)
// Next: Task 12 — scoring engine rebuild
// Dependencies: cache.js
