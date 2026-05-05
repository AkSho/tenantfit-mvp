// ─────────────────────────────────────────
// TenantFit Scoring Engine
// Scores: 0-10 with one decimal
// ─────────────────────────────────────────

// ── TOP 50 FRANCHISE SITE CRITERIA ──────
// Confidence: HIGH = FDD-verified SF ranges, well-documented
//             MEDIUM = well-documented in franchise broker materials
//             LOW = estimated from brand positioning
// Internal only — confidence flags never surface to broker/tenant.
// LOW confidence concepts use softer framing in report narrative.
const FRANCHISE_CRITERIA = [
  // QSR
  { id: 'mcdonalds',    name: "McDonald's",         category: 'qsr',         minSF: 2500, maxSF: 4500, minHHI: 45000, minAADT: 30000, driveThru: true,  confidence: 'HIGH',   notes: 'Corner preferred, drive-through required' },
  { id: 'chick_fil_a',  name: 'Chick-fil-A',        category: 'qsr',         minSF: 3500, maxSF: 5000, minHHI: 50000, minAADT: 25000, driveThru: true,  confidence: 'HIGH',   notes: 'Drive-through required' },
  { id: 'raising_canes',name: "Raising Cane's",     category: 'qsr',         minSF: 3000, maxSF: 4000, minHHI: 48000, minAADT: 30000, driveThru: true,  confidence: 'MEDIUM', notes: 'Drive-through required, Sun Belt expansion focus' },
  { id: 'wingstop',     name: 'Wingstop',            category: 'qsr',         minSF: 1400, maxSF: 2000, minHHI: 50000, minAADT: 18000, driveThru: false, confidence: 'HIGH',   notes: 'Inline or end cap' },
  { id: 'five_guys',    name: 'Five Guys',           category: 'qsr',         minSF: 1800, maxSF: 3000, minHHI: 65000, minAADT: 20000, driveThru: false, confidence: 'MEDIUM', notes: 'Strip/inline' },
  { id: 'whataburger',  name: 'Whataburger',         category: 'qsr',         minSF: 3000, maxSF: 4500, minHHI: 45000, minAADT: 28000, driveThru: true,  confidence: 'MEDIUM', notes: 'Sun Belt focus' },
  { id: 'popeyes',      name: 'Popeyes',             category: 'qsr',         minSF: 2500, maxSF: 3500, minHHI: 45000, minAADT: 25000, driveThru: true,  confidence: 'MEDIUM', notes: 'Drive-through preferred' },
  { id: 'panda_express',name: 'Panda Express',       category: 'qsr',         minSF: 2200, maxSF: 3200, minHHI: 50000, minAADT: 28000, driveThru: true,  confidence: 'MEDIUM', notes: 'Drive-through preferred' },
  { id: 'subway',       name: 'Subway',              category: 'qsr',         minSF: 1000, maxSF: 1500, minHHI: 40000, minAADT: 12000, driveThru: false, confidence: 'HIGH',   notes: 'Flexible, inline' },
  { id: 'jersey_mikes', name: "Jersey Mike's",       category: 'qsr',         minSF: 1200, maxSF: 2000, minHHI: 55000, minAADT: 15000, driveThru: false, confidence: 'HIGH',   notes: 'Inline, strip center' },
  // Fast Casual
  { id: 'chipotle',     name: 'Chipotle',            category: 'fast_casual', minSF: 2500, maxSF: 3200, minHHI: 60000, minAADT: 30000, driveThru: false, confidence: 'HIGH',   notes: 'Chipotlane preferred' },
  { id: 'shake_shack',  name: 'Shake Shack',         category: 'fast_casual', minSF: 2500, maxSF: 4000, minHHI: 75000, minAADT: 20000, driveThru: false, confidence: 'HIGH',   notes: 'Urban/high-density suburban' },
  { id: 'sweetgreen',   name: 'Sweetgreen',          category: 'fast_casual', minSF: 1800, maxSF: 2800, minHHI: 80000, minAADT: 15000, driveThru: false, confidence: 'HIGH',   notes: 'College-educated demo, urban expansion' },
  { id: 'cava',         name: 'Cava',                category: 'fast_casual', minSF: 2000, maxSF: 3000, minHHI: 70000, minAADT: 18000, driveThru: false, confidence: 'MEDIUM', notes: 'End cap or inline' },
  { id: 'panera',       name: 'Panera Bread',        category: 'fast_casual', minSF: 3500, maxSF: 5000, minHHI: 65000, minAADT: 22000, driveThru: true,  confidence: 'HIGH',   notes: 'Drive-through preferred' },
  { id: 'first_watch',  name: 'First Watch',         category: 'fast_casual', minSF: 3000, maxSF: 4500, minHHI: 65000, minAADT: 18000, driveThru: false, confidence: 'MEDIUM', notes: 'Breakfast/lunch only' },
  // Coffee
  { id: 'starbucks',    name: 'Starbucks',           category: 'coffee',      minSF: 1200, maxSF: 1700, minHHI: 65000, minAADT: 25000, driveThru: false, confidence: 'HIGH',   notes: 'Drive-through preferred; café format' },
  { id: 'dutch_bros',   name: 'Dutch Bros',          category: 'coffee',      minSF: 900,  maxSF: 1100, minHHI: 50000, minAADT: 25000, driveThru: true,  confidence: 'MEDIUM', notes: 'Drive-through only, expanding East' },
  { id: 'peets',        name: "Peet's Coffee",       category: 'coffee',      minSF: 1400, maxSF: 2200, minHHI: 75000, minAADT: 20000, driveThru: false, confidence: 'MEDIUM', notes: 'West Coast/urban' },
  { id: 'blue_bottle',  name: 'Blue Bottle Coffee',  category: 'coffee',      minSF: 1000, maxSF: 2000, minHHI: 90000, minAADT: 12000, driveThru: false, confidence: 'MEDIUM', notes: 'Urban premium' },
  // Fitness
  { id: 'planet_fitness',name: 'Planet Fitness',     category: 'fitness_bigbox', minSF: 15000,maxSF: 25000,minHHI: 35000, minAADT: 18000, driveThru: false, confidence: 'HIGH',   notes: 'High visibility strip anchor' },
  { id: 'orangetheory', name: 'Orangetheory',        category: 'fitness_boutique',minSF:2500, maxSF: 4000, minHHI: 80000, minAADT: 12000, driveThru: false, confidence: 'HIGH',   notes: 'Lifestyle or strip' },
  { id: 'f45',          name: 'F45 Training',        category: 'fitness_boutique',minSF:2500, maxSF: 3500, minHHI: 75000, minAADT: 10000, driveThru: false, confidence: 'MEDIUM', notes: 'Boutique suburban/urban' },
  { id: 'solidcore',    name: 'Solidcore',           category: 'fitness_boutique',minSF:2500, maxSF: 3500, minHHI: 90000, minAADT: 10000, driveThru: false, confidence: 'MEDIUM', notes: 'Affluent urban' },
  { id: 'barrys',       name: "Barry's",             category: 'fitness_boutique',minSF:4000, maxSF: 6000, minHHI: 100000,minAADT: 10000, driveThru: false, confidence: 'MEDIUM', notes: 'Premium urban' },
  { id: 'anytime',      name: 'Anytime Fitness',     category: 'fitness_boutique',minSF:4000, maxSF: 6000, minHHI: 50000, minAADT: 12000, driveThru: false, confidence: 'HIGH',   notes: 'Suburban flexible' },
  { id: 'crunch',       name: 'Crunch Fitness',      category: 'fitness_bigbox', minSF: 10000,maxSF: 20000,minHHI: 45000, minAADT: 15000, driveThru: false, confidence: 'MEDIUM', notes: 'Value fitness' },
  // Medical / Urgent Care
  { id: 'citymd',       name: 'CityMD',              category: 'urgent_care', minSF: 2500, maxSF: 3500, minHHI: 65000, minAADT: 18000, driveThru: false, confidence: 'MEDIUM', notes: 'Urban/suburban NE focus' },
  { id: 'afc_urgent',   name: 'AFC Urgent Care',     category: 'urgent_care', minSF: 2500, maxSF: 4500, minHHI: 55000, minAADT: 15000, driveThru: false, confidence: 'MEDIUM', notes: 'Strip center, end cap' },
  { id: 'gohealth',     name: 'GoHealth Urgent Care',category: 'urgent_care', minSF: 2500, maxSF: 4500, minHHI: 60000, minAADT: 15000, driveThru: false, confidence: 'MEDIUM', notes: 'Walgreens co-location preferred' },
  { id: 'one_medical',  name: 'One Medical',         category: 'urgent_care', minSF: 3000, maxSF: 5000, minHHI: 85000, minAADT: 12000, driveThru: false, confidence: 'MEDIUM', notes: 'Urban' },
  // Pharmacy
  { id: 'cvs',          name: 'CVS',                 category: 'pharmacy',    minSF: 8000, maxSF: 12000,minHHI: 45000, minAADT: 20000, driveThru: true,  confidence: 'HIGH',   notes: 'Corner, drive-through' },
  { id: 'walgreens',    name: 'Walgreens',           category: 'pharmacy',    minSF: 10000,maxSF: 15000,minHHI: 45000, minAADT: 20000, driveThru: true,  confidence: 'HIGH',   notes: 'Corner, drive-through' },
  { id: 'rite_aid',     name: 'Rite Aid',            category: 'pharmacy',    minSF: 8000, maxSF: 12000,minHHI: 40000, minAADT: 18000, driveThru: true,  confidence: 'HIGH',   notes: 'Contracting — verify expansion status' },
  // Grocery
  { id: 'trader_joes',  name: "Trader Joe's",        category: 'grocery_organic',minSF:10000,maxSF:15000,minHHI: 75000, minAADT: 18000, driveThru: false, confidence: 'HIGH',   notes: 'College-educated, dense suburban' },
  { id: 'whole_foods',  name: 'Whole Foods',         category: 'grocery_organic',minSF:25000,maxSF:50000,minHHI: 90000, minAADT: 15000, driveThru: false, confidence: 'HIGH',   notes: 'Affluent urban/suburban' },
  { id: 'sprouts',      name: 'Sprouts',             category: 'grocery_organic',minSF:23000,maxSF:30000,minHHI: 65000, minAADT: 15000, driveThru: false, confidence: 'HIGH',   notes: 'Health-conscious demo' },
  { id: 'aldi',         name: 'Aldi',                category: 'grocery_value',  minSF:17000,maxSF:22000,minHHI: 40000, minAADT: 15000, driveThru: false, confidence: 'HIGH',   notes: 'Value-oriented' },
  { id: 'lidl',         name: 'Lidl',                category: 'grocery_value',  minSF:20000,maxSF:25000,minHHI: 45000, minAADT: 15000, driveThru: false, confidence: 'HIGH',   notes: 'East Coast expansion active' },
  // Beauty / Wellness
  { id: 'ewc',          name: 'European Wax Center', category: 'nail_salon',  minSF: 1200, maxSF: 1800, minHHI: 65000, minAADT: 12000, driveThru: false, confidence: 'HIGH',   notes: 'Strip/lifestyle' },
  { id: 'hand_stone',   name: 'Hand & Stone',        category: 'nail_salon',  minSF: 2500, maxSF: 4000, minHHI: 65000, minAADT: 10000, driveThru: false, confidence: 'MEDIUM', notes: 'Strip center' },
  { id: 'great_clips',  name: 'Great Clips',         category: 'nail_salon',  minSF: 1000, maxSF: 1400, minHHI: 40000, minAADT: 12000, driveThru: false, confidence: 'HIGH',   notes: 'Inline, flexible' },
  { id: 'sport_clips',  name: 'Sport Clips',         category: 'nail_salon',  minSF: 1000, maxSF: 1400, minHHI: 50000, minAADT: 15000, driveThru: false, confidence: 'MEDIUM', notes: 'Male skew demo' },
  // Pet
  { id: 'pet_supplies_plus', name:'Pet Supplies Plus',category:'pet',         minSF: 5500, maxSF: 8500, minHHI: 55000, minAADT: 15000, driveThru: false, confidence: 'HIGH',   notes: 'Suburban strip' },
  { id: 'petco',        name: 'Petco',               category: 'pet',         minSF: 10000,maxSF: 15000,minHHI: 60000, minAADT: 15000, driveThru: false, confidence: 'HIGH',   notes: 'Strip/power center' },
  { id: 'petsmart',     name: 'PetSmart',            category: 'pet',         minSF: 12000,maxSF: 18000,minHHI: 55000, minAADT: 18000, driveThru: false, confidence: 'HIGH',   notes: 'Power center/strip' },
  // Service
  { id: 'ups_store',    name: 'The UPS Store',       category: 'bank',        minSF: 800,  maxSF: 1500, minHHI: 45000, minAADT: 12000, driveThru: false, confidence: 'HIGH',   notes: 'Inline, strip' },
  { id: 'chase',        name: 'Chase Bank',          category: 'bank',        minSF: 2000, maxSF: 4000, minHHI: 55000, minAADT: 20000, driveThru: true,  confidence: 'MEDIUM', notes: 'Corner preferred' },
  { id: 'nothing_bundt',name: 'Nothing Bundt Cakes', category: 'fast_casual', minSF: 1200, maxSF: 1800, minHHI: 65000, minAADT: 15000, driveThru: false, confidence: 'MEDIUM', notes: 'Strip/lifestyle, suburban' },
];

// ── SCORING MODELS (category-level) ─────
const SCORING_MODELS = [
  { id:'coffee',         name:'Coffee (Premium)',           type:'Food',    requiresVent:false, minSF:400,   maxSF:3000,  requirements:{ income:70000, traffic:12000 }, voidCategory:'coffee',    targets:['Starbucks','Blue Bottle',"Peet's",'Dutch Bros'] },
  { id:'qsr',            name:'Quick Service / Burger',     type:'Food',    requiresVent:true,  minSF:1200,  maxSF:4000,  requirements:{ income:50000, traffic:22000 }, voidCategory:'qsr',       targets:['Shake Shack','Five Guys','Smashburger','Wingstop'] },
  { id:'fast_casual',    name:'Fast Casual',                type:'Food',    requiresVent:true,  minSF:1000,  maxSF:4000,  requirements:{ income:55000, traffic:18000 }, voidCategory:'fast_casual',targets:['Chipotle','Cava','Sweetgreen','Wingstop'] },
  { id:'fitness_boutique',name:'Fitness (Boutique)',        type:'Service', requiresVent:false, minSF:1500,  maxSF:6000,  requirements:{ income:85000, traffic:8000  }, voidCategory:'fitness',   targets:["Barry's",'SoulCycle','Solidcore','Orangetheory','F45'] },
  { id:'fitness_bigbox', name:'Fitness (Value / Big Box)',  type:'Service', requiresVent:false, minSF:12000, maxSF:45000, requirements:{ income:45000, traffic:18000 }, voidCategory:'fitness',   targets:['Planet Fitness','LA Fitness','Crunch'] },
  { id:'urgent_care',    name:'Urgent Care / Medical',      type:'Service', requiresVent:false, minSF:2500,  maxSF:8000,  requirements:{ income:60000, traffic:15000 }, voidCategory:'urgent_care',targets:['CityMD','GoHealth','One Medical','AFC Urgent Care'] },
  { id:'grocery_organic',name:'Grocery (Natural / Organic)',type:'Goods',   requiresVent:false, minSF:10000, maxSF:50000, requirements:{ income:80000, traffic:12000 }, voidCategory:'grocery',   targets:['Whole Foods',"Trader Joe's",'Sprouts','Natural Grocers'] },
  { id:'grocery_value',  name:'Grocery (Value)',            type:'Goods',   requiresVent:false, minSF:8000,  maxSF:25000, requirements:{ income:40000, traffic:15000 }, voidCategory:'grocery',   targets:['Aldi','Lidl','WinCo','Save-A-Lot'] },
  { id:'pharmacy',       name:'Pharmacy / Drug Store',      type:'Service', requiresVent:false, minSF:8000,  maxSF:18000, requirements:{ income:45000, traffic:15000 }, voidCategory:'pharmacy',  targets:['CVS','Walgreens','Rite Aid'] },
  { id:'nail_salon',     name:'Nail / Beauty Salon',        type:'Service', requiresVent:false, minSF:800,   maxSF:2500,  requirements:{ income:55000, traffic:10000 }, voidCategory:'nail_salon', targets:['Ulta Beauty','European Wax Center','Hand & Stone'] },
  { id:'pet',            name:'Pet Supplies / Services',    type:'Goods',   requiresVent:false, minSF:2000,  maxSF:12000, requirements:{ income:60000, traffic:10000 }, voidCategory:'pet',       targets:['PetSmart','Petco','Pet Supplies Plus'] },
  { id:'bank',           name:'Bank / Financial',           type:'Service', requiresVent:false, minSF:1500,  maxSF:5000,  requirements:{ income:50000, traffic:12000 }, voidCategory:'bank',      targets:['Chase','Bank of America','Wells Fargo','TD Bank'] },
];

// ──────────────────────────────────────────
// PSYCHOGRAPHIC PROFILER
// Returns: 'urban_professional' | 'suburban_family' | 'dense_working_class' | 'mixed'
// ──────────────────────────────────────────
function psychographicProfile(demographics) {
  const d = demographics?.ring1;
  if (!d) return 'mixed';

  const income       = d.median_income || 0;
  const college      = d.pct_college_plus || 0;
  const homeowner    = d.pct_owner_occupied || 0;
  const medAge       = d.median_age || 35;
  const transitPct   = d.commute_mode?.transit_pct || 0;
  const driveAlone   = d.commute_mode?.drive_alone_pct || 0;

  // Urban professional: high income, high college, younger age — homeownership and transit
  // are secondary signals (condo ownership is common in urban cores; commute mode data
  // is frequently null for dense tracts — don't gate on it)
  if (income >= 80000 && college >= 0.45 && homeowner <= 0.50 && medAge <= 40) {
    return 'urban_professional';
  }
  // Suburban family: moderate-high income, high homeownership, middle age, drives
  if (income >= 60000 && homeowner >= 0.50 && medAge >= 35 && driveAlone >= 0.55) {
    return 'suburban_family';
  }
  // Dense working class: lower income, high density, transit-heavy or varied commute
  if (income <= 60000 && homeowner <= 0.40) {
    return 'dense_working_class';
  }
  return 'mixed';
}

const PROFILE_LABELS = {
  urban_professional: 'Urban Professional',
  suburban_family:    'Suburban Family',
  dense_working_class:'Dense / Working Class',
  mixed:              'Mixed',
};

// ──────────────────────────────────────────
// TRADE AREA TRAJECTORY
// Returns: 'growing' | 'stable' | 'declining'
// ──────────────────────────────────────────
function tradeAreaTrajectory(permits, blsData) {
  let growthSignals = 0, declineSignals = 0;

  // Signal 1: Building permits
  const units = permits?.units_18mo;
  if (units >= 100)      growthSignals++;
  else if (units >= 20)  growthSignals += 0.5;
  else if (units === 0)  declineSignals += 0.5;

  // Signal 2: BLS food service employment
  const foodService = blsData?.industries?.['72'];
  if (foodService?.yoy_pct > 2)       growthSignals++;
  else if (foodService?.yoy_pct < -2) declineSignals++;

  // Signal 3: BLS healthcare employment
  const healthcare = blsData?.industries?.['62'];
  if (healthcare?.yoy_pct > 2)       growthSignals++;
  else if (healthcare?.yoy_pct < -2) declineSignals++;

  if (growthSignals >= 2)   return 'growing';
  if (declineSignals >= 1.5)return 'declining';
  return 'stable';
}

const TRAJECTORY_LABELS = {
  growing:   'Growing',
  stable:    'Stable',
  declining: 'Declining',
};

// ──────────────────────────────────────────
// DAYTIME / RESIDENTIAL RATIO
// High ratio = weekday lunch/convenience trade dominates
// Low ratio  = neighborhood residential trade dominates
// ──────────────────────────────────────────
function daytimeRatio(lehd, demographics) {
  const daytime     = lehd?.daytime_workers;
  const residential = demographics?.ring1?.population;
  if (!daytime || !residential || residential === 0) return null;
  return +(daytime / residential).toFixed(2);
}

// ──────────────────────────────────────────
// SITE CRITERIA MATCH
// Returns matched franchise concepts for a category with meet/borderline/no
// Internal confidence flags used to soften language — never shown to user.
// ──────────────────────────────────────────
function matchFranchiseCriteria(categoryId, sf, income, aadt, isVented) {
  const concepts = FRANCHISE_CRITERIA.filter(c => c.category === categoryId);
  if (!concepts.length) return [];

  return concepts.map(c => {
    const sfMatch     = sf > 0 ? (sf >= c.minSF && sf <= c.maxSF) : null;
    const incomeMatch = income > 0 ? income >= c.minHHI : null;
    const aadtMatch   = aadt > 0 ? aadt >= c.minAADT : null;
    const ventMatch   = c.driveThru ? isVented : true; // drive-through concepts benefit from vented

    const metCount  = [sfMatch, incomeMatch, aadtMatch].filter(v => v === true).length;
    const failCount = [sfMatch, incomeMatch, aadtMatch].filter(v => v === false).length;

    const match = failCount === 0 && metCount >= 2 ? 'meets'
                : failCount <= 1 ? 'borderline'
                : 'does not meet';

    return {
      id:         c.id,
      name:       c.name,
      match,
      confidence: c.confidence,
      sf_match:   sfMatch,
      income_match: incomeMatch,
      aadt_match:   aadtMatch,
      notes:      c.confidence === 'LOW'
        ? `${c.name} profile broadly consistent with this trade area`
        : match === 'meets'
          ? `${c.name} — meets site criteria (${sf > 0 ? sf.toLocaleString()+' SF, ' : ''}$${income.toLocaleString()} HHI${aadt > 0 ? ', '+aadt.toLocaleString()+' AADT' : ''})`
          : match === 'borderline'
            ? `${c.name} — borderline site criteria match`
            : `${c.name} — site criteria gap`,
    };
  }).filter(c => c.match !== 'does not meet' || c.confidence === 'HIGH');
}

// ──────────────────────────────────────────
// MAIN SCORING FUNCTION
// Returns scores 0-10 with one decimal
// ──────────────────────────────────────────
function runScoring({ sf, isVented, propertyType, leasingObjective, demographics, voidAnalysis, lehd, dotAadt, permits, blsData, ozData, foodAccess }) {

  const income   = demographics?.ring1?.median_income || demographics?.ring3?.median_income || 0;
  const aadt     = dotAadt?.aadt_count || 0;
  const profile  = psychographicProfile(demographics);
  const trajectory = tradeAreaTrajectory(permits, blsData);
  const dtRatio  = daytimeRatio(lehd, demographics);
  const isOZ     = ozData?.oz_designated || false;
  const isFoodDesert = foodAccess?.food_desert || false;

  const results = SCORING_MODELS.map(model => {
    // ── Hard disqualifiers ──
    // Only disqualify when space is too SMALL — a concept can't operate below its minimum.
    // Oversized space applies a penalty but does not zero the score; tenants can adapt.
    if (sf > 0 && sf < model.minSF) {
      return {
        category_id: model.id, category_name: model.name, type: model.type,
        total_score: 0, disqualified: true,
        reasons: [`DISQUALIFIED: ${sf.toLocaleString()} SF below minimum (${model.minSF.toLocaleString()} SF required)`],
        targets: model.targets, franchise_matches: [],
      };
    }
    if (model.requiresVent && !isVented) {
      return {
        category_id: model.id, category_name: model.name, type: model.type,
        total_score: 0,
        reasons: ['DISQUALIFIED: Concept requires restaurant venting. Site is dry use.'],
        targets: model.targets, franchise_matches: [],
      };
    }

    let score   = 0;
    const reasons = [];

    // ── 0. SF oversize penalty (space larger than concept's typical max) ──
    if (sf > 0 && sf > model.maxSF) {
      const overage = sf / model.maxSF;
      if (overage > 2.0) {
        score -= 1.5;
        reasons.push(`Space (${sf.toLocaleString()} SF) is significantly larger than this concept's typical maximum (${model.maxSF.toLocaleString()} SF). Subdivision or co-tenancy likely required.`);
      } else if (overage > 1.2) {
        score -= 0.5;
        reasons.push(`Space (${sf.toLocaleString()} SF) is slightly above the typical range for this concept (${model.maxSF.toLocaleString()} SF max). Tenant may absorb or partition.`);
      }
      // Within 20% over: no penalty — common for flexible-use concepts
    }

    // ── 1. Income (0–3.0 pts) ──
    if (income >= model.requirements.income) {
      score += 3.0;
      reasons.push(`Trade area income ($${income.toLocaleString()}) meets this category threshold.`);
    } else if (income > 0) {
      const partial = +(income / model.requirements.income * 2.0).toFixed(1);
      score += Math.min(partial, 2.0);
      reasons.push(`Income ($${income.toLocaleString()}) is below the ${model.name} threshold of $${model.requirements.income.toLocaleString()}.`);
    } else {
      score += 1.5; // neutral if no data
    }

    // ── 2. Traffic (0–2.5 pts) ──
    if (aadt >= model.requirements.traffic) {
      score += 2.5;
      reasons.push(`Traffic (~${aadt.toLocaleString()} AADT${dotAadt?.is_estimate ? ', estimated' : ''}) supports this category.`);
    } else if (aadt > 0) {
      const partial = +(aadt / model.requirements.traffic * 1.5).toFixed(1);
      score += Math.min(partial, 1.5);
      reasons.push(`Traffic (~${aadt.toLocaleString()} AADT) is below the ${model.name} benchmark of ${model.requirements.traffic.toLocaleString()}.`);
    } else {
      score += 1.0;
    }

    // ── 3. Void analysis (0–2.0 pts) ──
    const voidCat = (voidAnalysis || []).find(v => v.id === model.voidCategory);
    if (voidCat) {
      if (voidCat.status === 'Underserved') {
        score += 2.0;
        reasons.push(`Market gap: ${voidCat.category} is underserved within 1 mile.`);
        // Food desert bonus for grocery
        if (isFoodDesert && ['grocery_organic','grocery_value'].includes(model.id)) {
          score += 0.5;
          reasons.push('USDA-designated low food access tract — grocery void confirmed.');
        }
      } else if (voidCat.status === 'Saturated') {
        // In high-income markets (HHI > $100K), saturation signals proven demand — reduce penalty.
        // The market sustains multiple competitors; a new entrant can still capture share.
        // In moderate/low-income markets, saturation is a genuine risk signal.
        const saturationPenalty = income >= 100000 ? -0.3 : -1.5;
        score += saturationPenalty;
        const nearest = voidCat.nearest_name ? `Nearest: ${voidCat.nearest_name} (${voidCat.nearest_dist_mi} mi)` : `${voidCat.count_1mi} nearby`;
        if (income >= 100000) {
          reasons.push(`Established category: ${voidCat.count_1mi} ${voidCat.category} concepts within 1 mile — competitive but proven demand. ${nearest}.`);
        } else {
          reasons.push(`Saturated: ${voidCat.count_1mi} ${voidCat.category} concepts within 1 mile. ${nearest}.`);
        }
      } else {
        score += 1.0;
        if (voidCat.nearest_name) {
          reasons.push(`Balanced: Nearest ${voidCat.category} is ${voidCat.nearest_name} (${voidCat.nearest_dist_mi} mi).`);
        }
      }
    }

    // ── 4. Daytime/residential ratio modifier (±0.5 pts) ──
    if (dtRatio !== null) {
      const daytimeDriven = ['coffee', 'qsr', 'fast_casual', 'pharmacy', 'bank'];
      const residentialDriven = ['grocery_organic', 'grocery_value', 'fitness_boutique', 'fitness_bigbox', 'pet', 'nail_salon'];
      if (dtRatio >= 3 && daytimeDriven.includes(model.id)) {
        score += 0.5;
        reasons.push(`High daytime population (${lehd.daytime_workers?.toLocaleString()} workers) strongly supports weekday trade.`);
      } else if (dtRatio <= 1 && residentialDriven.includes(model.id)) {
        score += 0.5;
        reasons.push(`Residential-dominant trade area supports neighborhood-serving concepts.`);
      } else if (dtRatio >= 3 && residentialDriven.includes(model.id)) {
        score -= 0.3;
        reasons.push(`High daytime/low residential ratio is less favorable for this category.`);
      }
    }

    // ── 5. Psychographic profile modifier (±0.5 pts) ──
    const profileBoost = {
      urban_professional: ['coffee', 'fast_casual', 'fitness_boutique', 'urgent_care', 'nail_salon'],
      suburban_family:    ['grocery_organic', 'grocery_value', 'fitness_bigbox', 'pet', 'pharmacy'],
      dense_working_class:['qsr', 'grocery_value', 'pharmacy', 'bank'],
    };
    // Categories that underperform in dense working-class markets despite void signals
    const profilePenalty = {
      dense_working_class: ['pet', 'grocery_organic', 'fitness_boutique'],
    };
    if (profile !== 'mixed' && profileBoost[profile]?.includes(model.id)) {
      score += 0.5;
      reasons.push(`${PROFILE_LABELS[profile]} trade area profile favors this category.`);
    }
    if (profile !== 'mixed' && profilePenalty[profile]?.includes(model.id)) {
      score -= 0.8;
      reasons.push(`${PROFILE_LABELS[profile]} demographic profile is a weak fit for this category — lower conversion rate expected.`);
    }

    // ── 6. Trade area trajectory modifier (±0.5 pts) ──
    if (trajectory === 'growing') {
      score += 0.5;
      reasons.push('Trade area shows growth signals (permits + employment trend).');
    } else if (trajectory === 'declining') {
      score -= 0.5;
      reasons.push('Trade area shows declining signals.');
    }

    // ── 7. Opportunity Zone bonus (niche signal) ──
    if (isOZ) {
      reasons.push('Located in federally designated Opportunity Zone — may attract development-stage concepts.');
    }

    // ── 8. Leasing objective alignment (±0.5 pts) ──
    if (leasingObjective === 'rent' && model.requirements.income >= 75000) {
      score += 0.5;
      reasons.push('Aligns with Maximize Rent objective — premium income threshold met.');
    } else if (leasingObjective === 'traffic' && model.requirements.traffic >= 18000) {
      score += 0.5;
      reasons.push('Aligns with Drive Traffic objective — high-volume concept.');
    } else if (leasingObjective === 'speed') {
      score += 0.3;
    }

    // ── 9. Property type penalty ──
    if (['fitness_boutique','fitness_bigbox'].includes(model.id) && propertyType?.includes('Mixed Use')) {
      score -= 0.5;
      reasons.push('Noise sensitivity — reduced score for Mixed Use setting.');
    }

    // ── Clamp to 0–10, one decimal ──
    const finalScore = +Math.max(0, Math.min(10, score)).toFixed(1);

    // ── Site criteria matches for top concepts ──
    const franchiseMatches = matchFranchiseCriteria(model.id, sf, income, aadt, isVented);

    return {
      category_id:      model.id,
      category_name:    model.name,
      type:             model.type,
      total_score:      finalScore,
      reasons,
      targets:          model.targets,
      franchise_matches: franchiseMatches.filter(m => m.match === 'meets' || m.match === 'borderline'),
    };
  });

  return {
    scores: results.sort((a, b) => b.total_score - a.total_score),
    profile,
    profile_label:   PROFILE_LABELS[profile],
    trajectory,
    trajectory_label: TRAJECTORY_LABELS[trajectory],
    daytime_ratio:   dtRatio,
    daytime_workers: lehd?.daytime_workers || null,
    oz_designated:   isOZ,
    food_desert:     isFoodDesert,
  };
}

module.exports = { runScoring, psychographicProfile, tradeAreaTrajectory, FRANCHISE_CRITERIA, SCORING_MODELS };

// CHECKPOINT — 2026-04-16
// Completed: Full scoring engine rebuild
//   - Scores 0-10 one decimal (was 0-100)
//   - Top 50 franchise site criteria with HIGH/MEDIUM/LOW confidence (internal only)
//   - Daytime/residential ratio modifier from LEHD
//   - Trade area trajectory (Growing/Stable/Declining) from permits + BLS
//   - Psychographic profile clustering (urban pro / suburban family / dense working class)
//   - Food desert bonus for grocery, OZ flag, leasing objective alignment
//   - matchFranchiseCriteria() returns meets/borderline per concept
// State: working
// Next: Task 13 — verify-criteria.js QA script
// Dependencies: All new lib files
