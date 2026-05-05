# TenantFit — Progress Log

## NEXT SESSION STARTS WITH
**Task 19 gate — review the PDFs, then move to outreach.**

Test listing is ready: **470 Route 38, Maple Shade, NJ 08052** — 5,434 SF strip center, active vacancy.
- Server: localhost:3001 (backend) + localhost:5173 (frontend) — both must be running
- Run wizard with: Strip Center / 5,434 SF / Unknown infrastructure / Speed to Lease
- Download Landlord Brief → review as if you are the broker receiving it
- Download Tenant Pitch (leave Addressed To blank, or try "Anytime Fitness") → review as prospect pitch
- If both look credible: move to Task 20 (Stripe) then Task 22 (first outreach email)
- If PDF has layout/credibility issues: fix those before outreach

**Do not start outreach until you have seen the PDF.**

Remaining code gaps (non-blocking — do not delay outreach for these):
- PDF Tenant Pitch template: callout boxes, remove gray table backgrounds
- Wizard copy pass: broker-friendlier headings
- BLS QCEW and Opportunity Zones: graceful null, no data, deferred
- DOT expansion states (PA/GA/OH/AZ/WA/CO/NC/VA/MA/MI): best-effort URLs, not live-verified

---


## CURRENT DATA SOURCE STATUS (as of Session 13 — 2026-04-18)
Working (confirmed live data):
- Census ACS demographics — ring1 via TIGERweb block group aggregation (23 BGs confirmed Maple Shade NJ)
- Overpass/OSM void analysis — named competitors, distances, saturation per category
- Census LEHD daytime workers — state WAC CSV, tract-proximity filter
- DOT AADT — NJ/NY/TX/FL/CA/IL confirmed live; PA/GA/OH/AZ/WA/CO/NC/VA/MA/MI best-effort URLs
  AADT now prefers surface roads over Interstates (highway filter added session 13)
- Building permits — NJ DCA statewide + 10 cities
- IRS SOI ZIP-level AGI — static CSV
- USDA Food Access Atlas — local CSV, 72,531 tracts
- EPA Smart Location Database — local CSV, 220,740 block groups
- Mapbox static map + Google Geocoding

Graceful null (non-blocking):
- BLS QCEW — API key present, series ID format for county-level unknown. Deferred.
- Opportunity Zones — ArcGIS dead, no CSV fallback. Deferred.

## IN PROGRESS
Task 19 — First sample PDF review. Data confirmed clean (Maple Shade NJ test run solid).
PDFs not yet opened and reviewed by human. That is the remaining gate.

---

## COMPLETED

### Session 1 — 2026-04-15
- Read the full project bootstrap from founder's prior LLM session
- Read local codebase (`tenant-fit-mvp/backend/`): `server.js`, `App.jsx`, file tree
- Established that local version is a working Express + React prototype
  with functional scoring logic — NOT the broken TypeScript/Supabase version
- Created `CLAUDE.md` with project identity, codebase reality, operating rules,
  outreach copy rules, pricing, API stack, named tenant hallucination warning
- Created `PROGRESS.md` (this file)

### Session 2 — 2026-04-15
- Cloned GitHub repo (`AkSho/twenty-one-camp`, branch `feature/worker-bootstrap`)
- Full audit comparing local vs GitHub: local has real APIs, GitHub has mocked data
- Installed Playwright + Chromium in backend/
- Created `backend/pdf.js` — generates real PDF from report data using Playwright
- Added `POST /api/pdf` endpoint to `server.js`
- Updated `App.jsx` Download button to POST to `/api/pdf` and trigger browser download
- Verified PDF generates successfully (103KB test output)

### Session 3 — 2026-04-16
- Replaced basic Census ACS pull with multi-variable: population, households, income,
  median age, college rate, homeownership, age cohorts (25-44, 45-54), spending index
- Replaced Google Places void analysis with Overpass (OpenStreetMap) — returns actual
  named competitors with distances, counts, saturation status across 10 categories
- Replaced mocked traffic with OSM road classification mapped to AADT bands (labeled as estimate)
- Added Census ZBP business density — establishment counts by category per ZIP
- Wired Walk Score API (activates when WALK_SCORE_KEY added to .env)
- Confirmed 176KB PDF with fully live data on real Atlanta address
- Removed /pdp route and ProductDetail component (Nutrafol leftover, unrelated to product)

### Session 4 — 2026-04-16
- Full competitive analysis: SiteSeer, Placer.ai, AlphaMap, CoStar, Crexi, ArcGIS, DeepBlocks
- Confirmed SiteSeer as closest UX/output comp. Key difference: their output is a scored list.
  Ours is a narrative deliverable the broker hands to a prospect. That is the moat.
- Reviewed all 10 SiteSeer wizard screenshots. Decision: do NOT copy 7-step flow.
  Use 4-step split-panel wizard: Property / Trade Area / Leasing Focus / Confirm + Run.
  Steps 3 (CBSA inclusion), 5 (chain size requirements), 6 (cotenant picker) require
  a 1,760-brand database we don't have. Omit them.
- Identified secondary ICP: franchise tenant reps needing demographic proof for corporate approval.
  Tenant Pitch document IS the corporate approval document. Pursue both angles in outreach.
- Confirmed full data layer sprint scope (see NEXT SESSION STARTS WITH above)
- Confirmed top 50 franchise site criteria (confidence-flagged: HIGH/MEDIUM/LOW)
- Confirmed weaving strategy: daytime/residential ratio, trajectory scoring, psychographic
  profiling, site criteria matching
- Score format decision: 0-10 with one decimal (was 0-100). 8.6/10 reads as analysis.
- QA approach: confidence flags per franchise concept + verify-criteria.js script.
  LOW confidence concepts get softer framing in report output.
- Confirmed caching is missing and critical — must be first item in sprint.

---

## BACKLOG (Prioritized)

### P0 — Data Layer Sprint (COMPLETED — Session 5)
All 13 data sources wired, scoring rebuilt, QA script verified.

### P1 — Frontend Rebuild (COMPLETE)
18. Rebuild intake as 4-step split-panel wizard (SiteSeer-style UX) — DONE session 10
24. Recalibrate walkability.js transit frequency thresholds (D4D unit fix) — DONE session 10

### P2 — Go To Market
19. Generate first sample PDF from real LoopNet listing
20. Stripe payment link — live, tested
21. LoopNet scrape — 200 broker contacts, vacant retail, 60+ days, 1,500-5,000 SF
22. Cold outreach — first 10 free sample emails
23. Physical mail campaign — print sample PDF, one-page cover letter, LoopNet address referenced

### P3 — After First Dollar
24. Building permits expanded to full top 10 market list
25. ~~Real DOT AADT expanded to more states~~ DONE — 16 states covered (verify expansion state org IDs live)
26. Referral bounty: $500 Venmo for out-of-market intro after payment clears
27. CCIM/SIOR chapter sponsorship ($200-500, gets email list)

### P4 — Platform Phase (Post $20K)
28. Deploy to public URL (not localhost)
29. Auth layer
30. Report history / broker account
31. Supabase migration if needed for data persistence at scale

---

## DECISIONS LOG

### 2026-04-15
- Decision: Build on local Express/React version, not GitHub TypeScript/Supabase version
  Reason: Local version has working scoring. TypeScript version has broken scoring.

- Decision: Cap founding member offer at 10 reports/month
  Reason: "Unlimited" is a time trap. Cap stated as "running manually to keep output sharp."

- Decision: Named tenant recommendations framed as "concepts that match this trade area profile"
  Reason: Hallucinated expansion plans are a relationship-killer in CRE.

### 2026-04-16
- Decision: 4-step wizard, not SiteSeer's 7-step flow
  Reason: Steps 3/5/6 require 1,760-brand database we don't have. Our use case is
  pitch preparation, not discovery — 4 steps maps correctly to that.

- Decision: Score format 0-10 with one decimal
  Reason: 8.6/10 reads as precision analysis. 86/100 reads as a rubric.

- Decision: Tenant Pitch document as second output type, selectable in wizard
  Reason: Same intake data feeds both. Step 4 of wizard = choose report type
  (Landlord Brief or Tenant Pitch). This is our actual moat — nobody else builds it.

- Decision: Franchise site criteria get confidence flags (HIGH/MEDIUM/LOW)
  Reason: FDDs confirm SF ranges reliably. HHI/AADT thresholds are reasoned estimates.
  LOW confidence = softer framing in report. QA script validates before paid reports ship.

- Decision: File-based caching is sprint item #1
  Reason: 10+ API sources per report without caching = 30-45 second times + rate limit failures.

---

## SESSION HISTORY

### Session 1 — 2026-04-15
Orientation. No code written. Read codebase, established project state, created CLAUDE.md and PROGRESS.md.

### Session 2 — 2026-04-15
PDF generation wired via Playwright. Download button working. 103KB test output confirmed.

### Session 3 — 2026-04-16
Data layer upgraded: multi-variable Census ACS, Overpass named competitors, OSM traffic estimate,
ZBP business density, Walk Score wired. 176KB live-data PDF confirmed on real Atlanta address.

### Session 4 — 2026-04-16
Strategic session. No code written. Full competitive analysis, ICP refinement (added secondary ICP:
franchise tenant reps), SiteSeer UX analysis (4-step wizard decision), full data layer sprint
scoped and confirmed, top 50 franchise criteria defined with confidence flags, weaving strategy
designed, QA approach confirmed, caching gap identified. Green light given to proceed with sprint.

### Session 13 — 2026-04-18
DOT AADT surface road preference fix:
- Bug: NJ query was returning 105,660 AADT "Interstate" (NJ Turnpike) for a strip center on Route 38.
  Root cause: multi-year field handler picked highest AADT across all 5 nearest features = always the highway.
- Fix: added `isHighway()` filter in queryArcGIS — two-pass approach: surface roads first, Interstate as fallback only.
  Result: Maple Shade now returns 57,629 AADT "US Route" (Route 38) — accurate.
- Same filter applied to standard single-field handler (non-NJ states).

Named tenant framing + franchise_matches in score cards:
- Replaced static "Concepts: X · Y · Z" line with structured "Demographic Profile Matches" section.
- Dark navy pills = meets site criteria. Gray pills = borderline.
- Disclaimer added: "Profile match only — not confirmed expansion plans."
- conceptOptions and conceptScore lookup updated to check franchise_matches names, not just targets.

"Addressed To" blank behavior:
- PDF: "Prepared for" line hidden when field empty. Footer shows "CONFIDENTIAL" only.
- UI preview: same — no fallback brand name rendered.
- pdf.js: removed all fallback chains (targets[0], category_name, 'Your Target Concept').

Product status assessed: engine is real, data is live, two PDFs generate.
Gap: PDFs not yet reviewed by a human. That review is the Task 19 gate before outreach.

### Session 12 — 2026-04-17
Completed all identified gap fixes from Session 11 pressure test:
- Ring1 demographics: full rewrite of lib/census.js — TIGERweb envelope query → block group GEOID list → ACS batch per tract → weighted aggregate. Population now correct (Freehold 3,733 → 30,794).
- Scoring fixes: SF oversize → tiered penalty (not disqualifier); Urban Professional classifier relaxed (no transit requirement, homeowner ≤50%); saturation penalty scales by income; dense_working_class profile penalties added for pet/grocery_organic/fitness_boutique.
- Step 4 wizard replaced: modal pattern removed, replaced with direct inline fields (Asset Class select, Available SF input, Infrastructure radio).
- Infrastructure "—" → "Unknown" fix in report header.
- Addressed To field: no auto-fill from top score.
- Map zoom: 13 → 11 (not too tight on address entry).
- Named tenant framing in score cards: replaced static "Concepts: X · Y" with franchise_matches display (dark pills for "meets", gray for "borderline"), disclaimer copy ("Profile match only — not confirmed expansion plans"), section label "Demographic Profile Matches".
- conceptOptions and conceptScore lookup: now pulls from franchise_matches names, not just targets.

### Session 11 — 2026-04-17
DOT AADT expanded to 16 states. Added PA, GA, OH, AZ, WA, CO, NC, VA, MA, MI to DOT_SERVICES and STATE_BOUNDS in lib/dot-aadt.js. All use ArcGIS REST with standard AADT/YEAR/name fields. Service URLs are best-effort from portal research — org IDs on expansion states need live verification (each has portal URL in code comments). OSM fallback handles any that fail without crashing scoring.
UI pass completed (see prior session notes for details).

### Session 10 — 2026-04-17
Task 18 complete: 4-step split-panel wizard (initial build).
Task 24 complete: walkability.js transit frequency thresholds recalibrated (100/50/20/5 → 10/5/2/0.5 trips/hr).
Wizard UX overhaul after first sample run on 101 Crawfords Corner Rd (Bell Works, Holmdel NJ):
- Live map right panel: replaces static navy context panel. Shows Mapbox static pin map after address blur (auto-geocode via /api/map-preview). Updates to isochrone overlay on Step 2 advance (via /api/isochrone-preview).
- Address field: onBlur triggers geocode preview. Green checkmark + formatted address confirms match.
- Step 1 relabeled "Location" — heading matches SiteSeer language
- Loading screen rebuilt: navy background, data source list with spinners
- Header rebuilt: navy with "VOID ANALYSIS ON DEMAND" tagline
- Void analysis colors fixed: Underserved = green "Opportunity", Saturated = amber "Competitive" (was inverted)
- "Pitch:" label fixed: now reads "Tenant Pitch addressed to:" with concept dropdown below
- Step 4 now explains the two documents explicitly (Landlord Brief + Tenant Pitch)
- server.js: added /api/map-preview (GET, returns pin map URL) and /api/isochrone-preview (GET, returns isochrone map URL)

### Session 9 — 2026-04-16
EPA SLD wired via local CSV. GDB subfolder deleted.
- EPA SLD (192MB CSV, 220,740 block groups) now parses on first run (~10s), caches to data/epa-sld.json
- Lookup key built from STATEFP+COUNTYFP+TRACTCE+BLKGRPCE (GEOID20 column had sci-notation precision loss — avoided)
- D4A converted from meters to miles. D4D is trips/hr peak (NOT per day — walkability thresholds need recal, Task 24).
- Verified: Freehold NJ = NatWalk 10 "Somewhat Walkable", Newark NJ = NatWalk 17 "Walker's Paradise"
- fiona + gdal-async tried and cleaned up — ESRI GDB v11 format requires proprietary SDK, open-source drivers return 0 features
- walkability recalibration (D4D unit mismatch) added as Task 24 — non-blocking

### Session 8 — 2026-04-16
Tasks 16 + 17 completed.
- Task 16: Tenant Pitch document structure designed. Decision: one download button, both briefs bundled. Option B (post-run concept picker) confirmed. Professional standards validated against Buxton SCOUT product guide.
- Task 17: Full PDF rebuild in pdf.js — shared CSS (navy #1B2A4A palette), score scale fixed to 0-10, Landlord Brief enhanced with profile_label, trajectory, daytime workers, DOT AADT, permits trajectory. Tenant Pitch built: demographics match section, void callout (underserved = green, competitive = amber), traffic/daytime, trajectory, site specs, why-this-window signals, CTA block. Combined via CSS page-break-before.
- App.jsx ReportView rebuilt: navy color system, meta band, profile badge, 4-stat grid, concept picker dropdown (top matches from scoring), score display fixed to /10, score bar correct, trajectory display. Download button says "Download Both Briefs", passes targetConcept to POST /api/pdf.
- server.js: targetConcept passthrough to generatePdf added.

### Session 7 — 2026-04-16
Resolved graceful nulls for USDA Food Access and wired BLS API key.
- USDA Food Access: switched from dead download URL to local CSV parse
  (`backend/data/2019_Food_Access_Research_Atlas_Data/Food Access Research Atlas.csv`)
  Processes 72,531 tracts → caches as `data/usda-food-access.json` on first run.
  Newark correctly returns: food_desert=false, low_income=true, urban=true
- BLS API key added to .env (BLS_API_KEY). Key resolves rate limit but series ID
  format for county-level QCEW still unknown — BLS remains graceful null. Deferred.
- EPA SLD: still failing (ArcGIS endpoint dead). EPA CSV download pending (553MB).
  Once downloaded, drop `EPA_SmartLocationDatabase_V3_Jan_2021_Final.csv` in backend/data/
  and wire local lookup (same pattern as USDA).
- OZ: ArcGIS endpoint dead, no fallback found. Remains graceful null. Low priority.
Current graceful nulls (non-blocking): EPA SLD walkability, BLS QCEW, OZ designation.
All three return null without crashing scoring.

### Session 6 — 2026-04-16
End-to-end tests on 3 property types. All pass with correct behavior.
Bugs found and fixed:
- NJ DOT AADT ArcGIS org ID expired — updated to new URL (HggmsDF7UJsNN1FK), added multi-year field fallback
- NJ Permits field names wrong (total_units → salegained, permit_date → permitdate), query updated
- Census geocoder layer name changed (Census Blocks → 2020 Census Blocks) — LEHD now resolves FIPS
- NJ waterfront cities (Newark, Montclair, Hoboken) were misrouted to NYC permits endpoint — fixed via lng/lat heuristic
Graceful null (no fix needed): EPA SLD (ArcGIS dead), BLS QCEW (series ID format unknown), USDA Food Access (404)
Test results confirmed sensible:
- Route 9 Freehold: QSR 8.5, 34K AADT, 17K daytime workers, Suburban Family ✓
- Montclair boutique: Fitness 4.5, Coffee 4.0, correctly penalized for saturation, QSR disqualified dry use ✓
- Newark value/8500SF: Pharmacy 6.8, Grocery Value 6.5, Dense Working Class, 38K AADT ✓

### Session 5 — 2026-04-16
Full data layer sprint completed. Tasks 1-14 all done:
- `lib/cache.js` — file-based caching (MD5 key, TTL-aware JSON files)
- `lib/lehd.js` — Census LEHD/LODES8 WAC daytime workers by county
- `lib/dot-aadt.js` — real DOT AADT for NJ/NY/TX/FL/CA/IL (ArcGIS + Socrata), OSM fallback
- `lib/permits.js` — building permits NJ statewide (DCA, all 565 municipalities) + 10 major cities
- `lib/irs-soi.js` — IRS SOI ZIP-level AGI from static CSV
- `lib/census.js` (updated) — added commute mode (B08301), cachedFetch wrapper
- `lib/usda-food-access.js` — USDA food desert designation by tract
- `lib/opportunity-zones.js` — OZ tract lookup via ArcGIS
- `lib/bls-qcew.js` — BLS employment by industry county, YoY trend
- `lib/epa-smart-location.js` — intersection density, transit distance/frequency, NatWalkInd
- `lib/walkability.js` — TenantFit Walkability Index (EPA + Overpass, no API key needed)
- `lib/scoring.js` — full rebuild: 0-10 scale, 50 franchise criteria, LEHD ratio, trajectory,
  psychographic profile, food desert/OZ bonuses, matchFranchiseCriteria()
- `scripts/verify-criteria.js` — QA script: PASS 49, FLAGGED 0, MANUAL REVIEW 27
- `server.js` — fully integrated: removed old SCORING_MODELS + old runScoring,
  Phase 1 (9 sources parallel) + Phase 2 (3 FIPS-dependent parallel), all new fields in response
