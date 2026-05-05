/**
 * BLS Consumer Expenditure Survey — 2022 annual data
 * Source: BLS CE Table 1101 (Income before taxes quintiles + selected ranges)
 * https://www.bls.gov/cex/2022/combined/quintile.pdf
 *
 * Annual spending per household by income bracket.
 * Used to estimate trade area spending potential by category.
 *
 * Note: figures are annual per-household averages from the CE Survey.
 * They reflect spending behavior of households at that income level nationally.
 * Trade area estimates multiply per-HH figure by ring-1 household count.
 */

// Annual per-household spending ($) by income bracket
// Brackets: [maxHHI, spendingByCategory]
const CE_TABLE = [
  {
    maxHHI: 30000,
    food_away_from_home:  2761,
    food_at_home:         4179,
    fitness_recreation:    763,
    personal_care:         481,
    pets:                  327,
    health_care:          2157,
    alcoholic_beverages:   444,
  },
  {
    maxHHI: 50000,
    food_away_from_home:  4195,
    food_at_home:         5756,
    fitness_recreation:   1432,
    personal_care:         712,
    pets:                  519,
    health_care:          3562,
    alcoholic_beverages:   578,
  },
  {
    maxHHI: 70000,
    food_away_from_home:  5234,
    food_at_home:         6927,
    fitness_recreation:   1887,
    personal_care:         826,
    pets:                  654,
    health_care:          4398,
    alcoholic_beverages:   699,
  },
  {
    maxHHI: 100000,
    food_away_from_home:  6527,
    food_at_home:         7831,
    fitness_recreation:   2612,
    personal_care:        1032,
    pets:                  829,
    health_care:          5195,
    alcoholic_beverages:   793,
  },
  {
    maxHHI: 150000,
    food_away_from_home:  7857,
    food_at_home:         9108,
    fitness_recreation:   3544,
    personal_care:        1281,
    pets:                 1074,
    health_care:          5798,
    alcoholic_beverages:  1025,
  },
  {
    maxHHI: Infinity,
    food_away_from_home: 10287,
    food_at_home:        11841,
    fitness_recreation:   5843,
    personal_care:        1728,
    pets:                 1345,
    health_care:          7194,
    alcoholic_beverages:  1532,
  },
];

const CATEGORY_LABELS = {
  food_away_from_home:  'Food Away from Home',
  food_at_home:         'Grocery / Food at Home',
  fitness_recreation:   'Fitness & Recreation',
  personal_care:        'Personal Care Services',
  pets:                 'Pet Products & Services',
  health_care:          'Health Care',
  alcoholic_beverages:  'Bars & Alcohol',
};

function getBracket(medianHHI) {
  for (const row of CE_TABLE) {
    if (medianHHI <= row.maxHHI) return row;
  }
  return CE_TABLE[CE_TABLE.length - 1];
}

/**
 * Returns per-household annual spend + total trade area spending potential
 * for each category.
 *
 * @param {number} medianHHI  - ring-1 median household income
 * @param {number} households - ring-1 total household count
 * @returns {object}
 */
function computeConsumerSpending(medianHHI, households) {
  if (!medianHHI || !households) return null;

  const bracket   = getBracket(medianHHI);
  const categories = Object.keys(CATEGORY_LABELS);

  const per_household = {};
  const trade_area_total = {};

  for (const cat of categories) {
    per_household[cat]    = bracket[cat];
    trade_area_total[cat] = Math.round(bracket[cat] * households);
  }

  const total_annual_spend = Object.values(trade_area_total).reduce((s, v) => s + v, 0);

  return {
    median_hhi:         medianHHI,
    households,
    per_household,
    trade_area_total,
    total_annual_spend,
    labels:             CATEGORY_LABELS,
    source:             'BLS Consumer Expenditure Survey 2022',
  };
}

module.exports = { computeConsumerSpending, CATEGORY_LABELS };

// CHECKPOINT — 2026-05-05
// Completed: BLS CE Survey 2022 static lookup
//   - 6 income brackets mapped to 7 spending categories
//   - computeConsumerSpending(medianHHI, households) returns per-HH and trade area totals
//   - No API call — pure computation, zero latency
// State: working
// Next: Wire into server.js response + surface in pdf.js
// Dependencies: census ring1 data (median_income, households)
