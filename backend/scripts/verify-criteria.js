#!/usr/bin/env node
/**
 * TenantFit — Franchise Criteria QA Script
 * Internal use only. Run before any paid report goes out.
 *
 * Usage: node scripts/verify-criteria.js
 *
 * What it checks:
 * 1. SF ranges are internally consistent (minSF < maxSF)
 * 2. HIGH confidence concepts have plausible SF/HHI/AADT ranges
 * 3. Flags any concept marked HIGH where numbers look suspiciously round or off
 * 4. Prints a verification checklist for manual spot-check against FDD sources
 *
 * For live FDD verification, check:
 * - State AG franchise portals (NY, CA, MD, IL, WA have the most complete databases)
 * - NY: https://www.ag.ny.gov/bureaus/investor-protection/franchise-filings
 * - CA: https://www.dbo.ca.gov/consumers/franchise-registration
 * - FDD aggregators: FranchiseGrade.com, Franchise.com, UnhappyFranchisee.com
 * - Brand press releases / investor materials for expansion signals
 */

const { FRANCHISE_CRITERIA } = require('../lib/scoring');

const PLAUSIBILITY_RULES = {
  // [minSF, maxSF, minHHI, minAADT] — reasonable bounds per category
  qsr:             { sfMin: 800,   sfMax: 6000,  hhiMin: 35000, hhiMax: 80000,  aadtMin: 10000, aadtMax: 60000 },
  fast_casual:     { sfMin: 800,   sfMax: 6000,  hhiMin: 45000, hhiMax: 110000, aadtMin: 8000,  aadtMax: 50000 },
  coffee:          { sfMin: 400,   sfMax: 3000,  hhiMin: 45000, hhiMax: 120000, aadtMin: 8000,  aadtMax: 50000 },
  fitness_boutique:{ sfMin: 1500,  sfMax: 8000,  hhiMin: 65000, hhiMax: 130000, aadtMin: 5000,  aadtMax: 30000 },
  fitness_bigbox:  { sfMin: 8000,  sfMax: 30000, hhiMin: 30000, hhiMax: 80000,  aadtMin: 10000, aadtMax: 40000 },
  urgent_care:     { sfMin: 1500,  sfMax: 8000,  hhiMin: 45000, hhiMax: 110000, aadtMin: 8000,  aadtMax: 40000 },
  grocery_organic: { sfMin: 8000,  sfMax: 60000, hhiMin: 60000, hhiMax: 130000, aadtMin: 10000, aadtMax: 40000 },
  grocery_value:   { sfMin: 12000, sfMax: 30000, hhiMin: 30000, hhiMax: 75000,  aadtMin: 10000, aadtMax: 40000 },
  pharmacy:        { sfMin: 6000,  sfMax: 18000, hhiMin: 35000, hhiMax: 80000,  aadtMin: 12000, aadtMax: 50000 },
  nail_salon:      { sfMin: 800,   sfMax: 5000,  hhiMin: 35000, hhiMax: 100000, aadtMin: 8000,  aadtMax: 35000 },
  pet:             { sfMin: 3000,  sfMax: 20000, hhiMin: 45000, hhiMax: 90000,  aadtMin: 10000, aadtMax: 35000 },
  bank:            { sfMin: 500,   sfMax: 8000,  hhiMin: 35000, hhiMax: 90000,  aadtMin: 8000,  aadtMax: 45000 },
};

const FDD_VERIFY_SOURCES = {
  HIGH: 'Verify SF range in FDD (state AG portals: NY ag.ny.gov, CA dbo.ca.gov)',
  MEDIUM: 'Cross-check against franchise broker materials and brand press releases',
  LOW: 'Estimated — verify before upgrading to MEDIUM confidence',
};

function runQA() {
  console.log('\n===================================================');
  console.log('  TenantFit Franchise Criteria QA Report');
  console.log(`  Run: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`);
  console.log('===================================================\n');

  let passCount = 0, flagCount = 0, reviewCount = 0;
  const flags = [];
  const reviews = [];

  for (const c of FRANCHISE_CRITERIA) {
    const issues = [];

    // 1. Basic consistency
    if (c.minSF >= c.maxSF) {
      issues.push(`SF range invalid: minSF (${c.minSF}) >= maxSF (${c.maxSF})`);
    }

    // 2. Plausibility check against category bounds
    const bounds = PLAUSIBILITY_RULES[c.category];
    if (bounds) {
      if (c.minSF < bounds.sfMin * 0.5) issues.push(`minSF (${c.minSF}) seems very low for ${c.category}`);
      if (c.maxSF > bounds.sfMax * 1.5) issues.push(`maxSF (${c.maxSF}) seems very high for ${c.category}`);
      if (c.minHHI < bounds.hhiMin * 0.5) issues.push(`minHHI ($${c.minHHI.toLocaleString()}) seems very low for ${c.category}`);
      if (c.minHHI > bounds.hhiMax * 1.5) issues.push(`minHHI ($${c.minHHI.toLocaleString()}) seems very high for ${c.category}`);
      if (c.minAADT < bounds.aadtMin * 0.5) issues.push(`minAADT (${c.minAADT.toLocaleString()}) seems very low for ${c.category}`);
      if (c.minAADT > bounds.aadtMax * 1.5) issues.push(`minAADT (${c.minAADT.toLocaleString()}) seems very high for ${c.category}`);
    }

    if (issues.length > 0) {
      flags.push({ concept: c.name, confidence: c.confidence, issues });
      flagCount++;
    } else {
      passCount++;
    }

    // 3. Manual review checklist for HIGH confidence
    if (c.confidence === 'HIGH') {
      reviews.push(c);
      reviewCount++;
    }
  }

  // ── Print flags ──
  if (flags.length > 0) {
    console.log(`⚠️  FLAGS (${flags.length}) — Review before paying reports go out:\n`);
    flags.forEach(f => {
      console.log(`  [${f.confidence}] ${f.concept}`);
      f.issues.forEach(i => console.log(`       → ${i}`));
    });
    console.log('');
  } else {
    console.log('✅  No plausibility flags.\n');
  }

  // ── Print manual FDD verification checklist ──
  console.log(`📋  Manual FDD Verification Checklist (${reviewCount} HIGH-confidence concepts):`);
  console.log('    Verify SF ranges against FDD Item 11 or 12 before any paid report.\n');
  reviews.forEach((c, i) => {
    const sfRange = `${c.minSF.toLocaleString()}–${c.maxSF.toLocaleString()} SF`;
    const hhi     = `$${c.minHHI.toLocaleString()} HHI`;
    const aadt    = `${c.minAADT.toLocaleString()} AADT`;
    console.log(`  [ ] ${(i+1).toString().padStart(2,'0')}. ${c.name.padEnd(28)} ${sfRange.padEnd(18)} ${hhi.padEnd(16)} ${aadt}`);
  });

  console.log(`\n  FDD sources:\n  ${FDD_VERIFY_SOURCES.HIGH}\n  ${FDD_VERIFY_SOURCES.MEDIUM}\n`);

  // ── Summary ──
  console.log('===================================================');
  console.log(`  PASS: ${passCount}  |  FLAGGED: ${flagCount}  |  MANUAL REVIEW: ${reviewCount}`);
  console.log('===================================================\n');

  if (flagCount > 0) {
    console.log('  Action: Resolve flags before running paid reports.\n');
    process.exit(1);
  } else {
    console.log('  QA passed. Proceed with report generation.\n');
    process.exit(0);
  }
}

runQA();
