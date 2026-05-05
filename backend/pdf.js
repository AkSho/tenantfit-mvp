const { chromium } = require('playwright');

const LEASING_LABELS = {
  rent:    'Maximize Rent',
  speed:   'Speed to Lease',
  traffic: 'Drive Traffic',
  fit:     'Neighborhood Fit',
};

function esc(v) {
  if (v == null) return '—';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmt$ (n) { return n ? '$' + Math.round(n).toLocaleString() : '—'; }
function fmtN (n) { return n != null ? Math.round(n).toLocaleString() : '—'; }
function fmtPct(n) { return n != null ? (n * 100).toFixed(1) + '%' : '—'; }
function fmtK (n) { return n != null ? (n >= 1000 ? (n / 1000).toFixed(0) + 'K' : String(n)) : '—'; }

// ─────────────────────────────────────────
// SHARED CSS
// ─────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111827; font-size: 11.5px; line-height: 1.55; background: #fff; }
  .page { padding: 32px 44px 36px; }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #1B2A4A; margin-bottom: 16px; }
  .logo { font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 900; letter-spacing: -0.5px; color: #1B2A4A; }
  .logo span { font-weight: 300; }
  .broker-info { text-align: right; font-size: 10px; color: #374151; }
  .broker-info .name { font-weight: 700; font-size: 12px; color: #1B2A4A; }
  h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; margin-bottom: 3px; color: #1B2A4A; }
  .addr { font-size: 11px; color: #4b5563; margin-bottom: 14px; }
  .meta-band { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-top: 2px solid #1B2A4A; border-bottom: 2px solid #1B2A4A; padding: 8px 0; margin-bottom: 18px; }
  .meta-item .lbl { font-size: 8px; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; display: block; margin-bottom: 2px; }
  .meta-item .val { font-size: 12px; font-weight: 700; color: #1B2A4A; }
  .sec-hdr { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1B2A4A; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
  .sec-hdr .tag { font-size: 8px; color: #9ca3af; font-weight: 500; letter-spacing: 0; text-transform: none; }
  .headline { background: #f0f4ff; border-left: 3px solid #1B2A4A; padding: 9px 14px; font-size: 11.5px; font-weight: 600; color: #1B2A4A; margin-bottom: 16px; border-radius: 0 4px 4px 0; }
  .map-img { width: 100%; height: auto; max-height: 230px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; margin-bottom: 16px; }
  .map-ph { width: 100%; height: 190px; background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; margin-bottom: 16px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 18px; }
  .stat-card { padding: 9px 12px; border-left: 2px solid #1B2A4A; background: #f8fafc; }
  .stat-card.light { border-left-color: #d1d5db; }
  .stat-card .lbl { font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
  .stat-card .val { font-size: 17px; font-weight: 700; color: #1B2A4A; }
  .stat-card .sub { font-size: 9px; color: #9ca3af; margin-top: 1px; }
  .profile-badge { display: inline-block; background: #1B2A4A; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 3px; margin-bottom: 10px; }
  .tbl { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 11px; }
  .tbl th { text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; padding: 5px 8px; border-bottom: 1px solid #1B2A4A; }
  .tbl td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  .tbl tr:last-child td { border-bottom: none; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .source-note { font-size: 9px; color: #9ca3af; text-align: right; margin-top: 2px; margin-bottom: 14px; }
  .score-card { margin-bottom: 12px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 5px; }
  .score-card.top { border-left: 3px solid #1B2A4A; }
  .score-card-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
  .score-badge { font-weight: 700; font-size: 11px; background: #1B2A4A; color: #fff; padding: 2px 8px; border-radius: 3px; }
  .score-bar-bg { height: 3px; background: #e5e7eb; border-radius: 2px; margin-bottom: 7px; }
  .score-bar-fill { height: 3px; background: #1B2A4A; border-radius: 2px; }
  .disclaimer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #9ca3af; line-height: 1.5; }
  .footer-line { margin-top: 10px; padding-top: 7px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
  .pitch-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 2px; }
  .pitch-h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; color: #1B2A4A; margin-bottom: 12px; }
  .pitch-band { background: #f0f4ff; border-radius: 4px; padding: 12px 14px; margin-bottom: 14px; }
  .pitch-band .band-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #4b5563; margin-bottom: 6px; }
  .void-callout { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px; padding: 12px 16px; margin-bottom: 14px; }
  .void-callout .vc-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #92400e; margin-bottom: 4px; }
  .void-callout .vc-val { font-size: 18px; font-weight: 800; color: #92400e; }
  .void-callout.clear { background: #f0fdf4; border-color: #bbf7d0; }
  .void-callout.clear .vc-lbl, .void-callout.clear .vc-val { color: #166534; }
  .signal-bullet { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 7px; font-size: 11px; }
  .signal-bullet .dot { width: 6px; height: 6px; border-radius: 50%; background: #1B2A4A; margin-top: 4px; flex-shrink: 0; }
  .cta-block { border: 1px solid #1B2A4A; border-radius: 4px; padding: 12px 14px; margin-top: 14px; }
  .cta-block .cta-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; margin-bottom: 6px; }
  .cta-block .cta-request { font-size: 13px; font-weight: 700; color: #1B2A4A; margin-bottom: 8px; }
  .cta-block .cta-contact { font-size: 11px; color: #374151; }
`;

// ─────────────────────────────────────────
// LANDLORD BRIEF BODY
// ─────────────────────────────────────────
function buildLandlordBriefBody(inputData, resultData) {
  const {
    brokerName, organization, addressRaw,
    propertyType, availableSf, leasingObjective, isVented,
  } = inputData;

  const {
    address, metrics, demographics, scores,
    void_analysis, voidAnalysis, walkability,
    business_density, mapUrl, dot_aadt, permits,
    profile_label, trajectory_label,
  } = resultData;

  const r1 = demographics?.ring1 || {};
  const r3 = demographics?.ring3 || r1;
  const r5 = demographics?.ring5 || r3;

  const pop1  = r1.population    || metrics?.population    || null;
  const hh1   = r1.households    || null;
  const inc1  = r1.median_income || metrics?.median_income || null;
  const age1  = r1.median_age    || metrics?.median_age    || null;
  const coll1 = r1.pct_college_plus || metrics?.pct_college || null;
  const own1  = r1.pct_owner_occupied || metrics?.pct_owner || null;

  const pop3  = r3.population    || null;
  const hh3   = r3.households    || null;
  const inc3  = r3.median_income || null;
  const pop5  = r5.population    || null;
  const hh5   = r5.households    || null;
  const inc5  = r5.median_income || null;

  const topScores = (scores || []).filter(s => s.total_score > 0).slice(0, 4);
  const voidData  = void_analysis || voidAnalysis || [];
  const daytime   = metrics?.daytime_workers || null;

  // AADT display — prefer real DOT count, fall back to OSM estimate
  const aadtDisplay = (() => {
    if (dot_aadt?.aadt_count) return `${dot_aadt.aadt_count.toLocaleString()} AADT`;
    if (metrics?.traffic_counts) return `~${metrics.traffic_counts.toLocaleString()} AADT (est.)`;
    return '—';
  })();

  // Headline stat
  const underservedVoid = voidData.find(v => v.status === 'Underserved');
  const headlineStat = (() => {
    if (underservedVoid && pop1) {
      return `No ${underservedVoid.category} within 1 mile of ${fmtN(pop1)} residents${inc1 ? ' earning ' + fmt$(inc1) + ' median household income' : ''}.`;
    }
    if (pop1 && inc1) {
      return `Trade area: ${fmtN(pop1)} residents, ${fmt$(inc1)} median HHI${dot_aadt?.aadt_count ? ', ' + dot_aadt.aadt_count.toLocaleString() + ' daily vehicles' : ''}.`;
    }
    return null;
  })();

  // Demo ring table
  const demoRows = [
    ['1-Mile (Tract)', pop1, hh1, inc1, r1.pct_25_44 != null ? fmtPct(r1.pct_25_44) : null, r1.pct_45_54 != null ? fmtPct(r1.pct_45_54) : null],
    ['3-Mile (County)', pop3, hh3, inc3, null, null],
    ['5-Mile (County)', pop5, hh5, inc5, null, null],
  ].map(([label, pop, hh, inc, p25, p45]) => `
    <tr>
      <td><strong>${esc(label)}</strong></td>
      <td class="num">${fmtN(pop)}</td>
      <td class="num">${fmtN(hh)}</td>
      <td class="num">${fmt$(inc)}</td>
      <td class="num">${p25 || '—'}</td>
      <td class="num">${p45 || '—'}</td>
    </tr>`).join('');

  // Void rows
  const voidRows = voidData.slice(0, 8).map(v => {
    const statusColor = v.status === 'Underserved' ? '#b91c1c' :
                        v.status === 'Saturated'   ? '#15803d' : '#92400e';
    const named = (v.named_within_1mi || []).slice(0, 3).join(', ') || (v.nearest_name || '—');
    return `
      <tr>
        <td>${esc(v.category)}</td>
        <td class="num">${v.count_1mi != null ? v.count_1mi : '—'}</td>
        <td class="num">${v.nearest_dist_mi != null ? v.nearest_dist_mi + ' mi' : '—'}</td>
        <td><span style="color:${statusColor};font-weight:600">${esc(v.status)}</span></td>
        <td style="font-size:10px;color:#6b7280">${esc(named)}</td>
      </tr>`;
  }).join('');

  // Score cards
  const scoreCards = topScores.map((s, i) => {
    const pct = Math.min((s.total_score / 10) * 100, 100);
    const medal = i === 0 ? '&#9733; ' : '';
    const reasonItems = (s.reasons || [])
      .filter(r => !r.startsWith('DISQUALIFIED'))
      .slice(0, 3)
      .map(r => `<li>${esc(r)}</li>`).join('');
    const targetsStr = (s.targets || []).slice(0, 3).map(esc).join(' &middot; ');
    return `
      <div class="score-card${i === 0 ? ' top' : ''}">
        <div class="score-card-row">
          <div style="font-weight:700;font-size:13px">${medal}${esc(s.category_name)}</div>
          <div class="score-badge">${s.total_score} / 10</div>
        </div>
        <div class="score-bar-bg"><div class="score-bar-fill" style="width:${pct}%"></div></div>
        ${targetsStr ? `<div style="font-size:10px;color:#6b7280;margin-bottom:5px">Concepts: ${targetsStr}</div>` : ''}
        ${reasonItems ? `<ul style="margin:0;padding-left:14px;font-size:10px;color:#4b5563;line-height:1.7">${reasonItems}</ul>` : ''}
      </div>`;
  }).join('');

  // Walkability block
  const walkBlock = walkability ? `
    <div style="display:flex;gap:12px;margin-bottom:18px">
      ${[
        ['Walk', walkability.walk_score, walkability.walk_description],
        ['Transit', walkability.transit_score, walkability.transit_description],
        ['Bike', walkability.bike_score, walkability.bike_description],
      ].filter(([,s]) => s != null).map(([label, score, desc]) => `
        <div style="flex:1;padding:9px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:5px;text-align:center">
          <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:3px">${label}</div>
          <div style="font-size:20px;font-weight:800;color:#1B2A4A">${score}</div>
          <div style="font-size:9px;color:#6b7280;margin-top:1px">${esc(desc)}</div>
        </div>`).join('')}
    </div>` : '';

  // Business density
  const densityBlock = business_density?.categories?.length ? `
    <div style="margin-bottom:18px">
      <div class="sec-hdr">Business Density — ZIP ${esc(business_density.zip)} <span class="tag">Census ZBP</span></div>
      <table class="tbl">
        <thead><tr><th>Category</th><th class="num">Establishments</th></tr></thead>
        <tbody>
          ${business_density.categories.slice(0, 6).map(b => `
            <tr><td>${esc(b.category)}</td><td class="num">${fmtN(b.establishments)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="source-note">Source: ${esc(business_density.source)}</div>
    </div>` : '';

  // Permits / trajectory
  const trajectoryBlock = (permits?.units_18mo || trajectory_label) ? `
    <div style="margin-bottom:18px">
      <div class="sec-hdr">Market Trajectory <span class="tag">Building Permits + BLS</span></div>
      <div class="two-col">
        ${permits?.units_18mo != null ? `
        <div class="stat-card">
          <div class="lbl">Residential Units Permitted (18 mo)</div>
          <div class="val">${fmtN(permits.units_18mo)}</div>
          <div class="sub">${esc(permits.trajectory_signal || '')}${permits.city ? ' · ' + permits.city : ''}</div>
        </div>` : ''}
        ${trajectory_label ? `
        <div class="stat-card light">
          <div class="lbl">Trade Area Trajectory</div>
          <div class="val" style="font-size:13px">${esc(trajectory_label)}</div>
        </div>` : ''}
      </div>
    </div>` : '';

  return `
<div class="page">
  <div class="hdr">
    <div class="logo">TENANT<span>FIT</span> <span style="font-size:11px;font-weight:400;color:#6b7280">Landlord Brief</span></div>
    <div class="broker-info">
      <div class="name">${esc(brokerName)}</div>
      <div>${esc(organization)}</div>
    </div>
  </div>

  <h1>Tenant Fit Analysis</h1>
  <div class="addr">&#128205; ${esc(address || addressRaw)}</div>

  <div class="meta-band">
    <div class="meta-item">
      <span class="lbl">Leasing Strategy</span>
      <span class="val">${esc(LEASING_LABELS[leasingObjective] || leasingObjective)}</span>
    </div>
    <div class="meta-item">
      <span class="lbl">Asset Class</span>
      <span class="val" style="font-size:10px">${esc(propertyType) || '—'}</span>
    </div>
    <div class="meta-item">
      <span class="lbl">Available SF</span>
      <span class="val">${availableSf ? parseInt(availableSf).toLocaleString() : '—'}</span>
    </div>
    <div class="meta-item">
      <span class="lbl">Infrastructure</span>
      <span class="val">${isVented ? 'Restaurant Ready' : 'Dry Use'}</span>
    </div>
  </div>

  ${headlineStat ? `<div class="headline">${esc(headlineStat)}</div>` : ''}

  <div class="sec-hdr">Trade Area <span class="tag">Google Maps</span></div>
  ${mapUrl ? `<img src="${esc(mapUrl)}" class="map-img" alt="Trade Area Map" />` : `<div class="map-ph">Map unavailable</div>`}

  <div class="sec-hdr">Trade Area Demographics <span class="tag">Census ACS 5-Year</span></div>
  ${profile_label ? `<div style="margin-bottom:10px"><span class="profile-badge">${esc(profile_label)}</span></div>` : ''}
  <div class="two-col" style="margin-bottom:10px">
    <div>
      <div class="stat-card" style="margin-bottom:8px">
        <div class="lbl">Population (1-Mi Tract)</div>
        <div class="val">${fmtN(pop1)}</div>
        ${hh1 ? `<div class="sub">${fmtN(hh1)} households</div>` : ''}
      </div>
      <div class="stat-card light" style="margin-bottom:8px">
        <div class="lbl">Median Household Income</div>
        <div class="val">${fmt$(inc1)}</div>
        ${r1.spending_index ? `<div class="sub">Spending Index: ${r1.spending_index}</div>` : ''}
      </div>
      <div class="stat-card light">
        <div class="lbl">Median Age</div>
        <div class="val">${age1 != null ? age1.toFixed(1) : '—'}</div>
        ${r1.pct_25_44 != null ? `<div class="sub">${fmtPct(r1.pct_25_44)} aged 25–44</div>` : ''}
      </div>
    </div>
    <div>
      <div class="stat-card light" style="margin-bottom:8px">
        <div class="lbl">College-Educated (25+)</div>
        <div class="val">${fmtPct(coll1)}</div>
      </div>
      <div class="stat-card light" style="margin-bottom:8px">
        <div class="lbl">Homeowners</div>
        <div class="val">${fmtPct(own1)}</div>
        ${r1.pct_renter != null ? `<div class="sub">${fmtPct(r1.pct_renter)} renters</div>` : ''}
      </div>
      <div class="stat-card light" style="margin-bottom:8px">
        <div class="lbl">Daytime Workers (1 Mi)</div>
        <div class="val">${daytime != null ? fmtN(daytime) : '—'}</div>
        <div class="sub">Census LEHD/LODES8</div>
      </div>
      <div class="stat-card light">
        <div class="lbl">Traffic Count</div>
        <div class="val" style="font-size:12px">${aadtDisplay}</div>
        ${dot_aadt?.road_name ? `<div class="sub">${esc(dot_aadt.road_name)}</div>` : ''}
      </div>
    </div>
  </div>

  <table class="tbl">
    <thead>
      <tr>
        <th>Ring</th>
        <th class="num">Population</th>
        <th class="num">Households</th>
        <th class="num">Med. Income</th>
        <th class="num">Age 25–44</th>
        <th class="num">Age 45–54</th>
      </tr>
    </thead>
    <tbody>${demoRows}</tbody>
  </table>
  <div class="source-note">Ring 1 = census tract. Rings 3 &amp; 5 = county-level. Source: Census ACS 5-Year (2022).</div>

  ${walkability ? `
  <div class="sec-hdr">Walkability Index <span class="tag">EPA SLD + OpenStreetMap</span></div>
  ${walkBlock}` : ''}

  <div class="sec-hdr">Void Analysis — Competitive Landscape <span class="tag">OpenStreetMap / Overpass</span></div>
  ${voidData.length > 0 ? `
  <table class="tbl">
    <thead>
      <tr>
        <th>Category</th>
        <th class="num">Within 1 Mi</th>
        <th class="num">Nearest</th>
        <th>Gap Status</th>
        <th>Named Competitors</th>
      </tr>
    </thead>
    <tbody>${voidRows}</tbody>
  </table>
  <div class="source-note">Competitor data: OpenStreetMap via Overpass API.</div>` :
  `<p style="font-size:11px;color:#6b7280;margin-bottom:16px">Void analysis unavailable for this location.</p>`}

  <div class="sec-hdr">High-Fit Tenant Categories <span class="tag">Top ${topScores.length} Recommendations</span></div>
  ${topScores.length > 0 ? scoreCards : '<p style="font-size:11px;color:#6b7280">No qualifying categories for this property configuration.</p>'}

  ${densityBlock}
  ${trajectoryBlock}

  <div class="disclaimer">
    <strong>Important:</strong> Tenant recommendations reflect demographic profile matches only.
    They are not confirmed expansion plans and must not be represented as such.
    Named concepts are illustrative — verify site criteria and expansion status directly with each brand before outreach.
    Sources: U.S. Census ACS, OpenStreetMap/Overpass, Mapbox, DOT AADT, Census LEHD, IRS SOI, USDA ERS.
    Generated by TenantFit on ${new Date().toLocaleDateString()}.
  </div>
  <div class="footer-line">
    <span>CONFIDENTIAL &bull; INTERNAL USE ONLY</span>
    <span>TENANTFIT &bull; ${new Date().toLocaleDateString()}</span>
  </div>
</div>`;
}

// ─────────────────────────────────────────
// TENANT PITCH BODY
// ─────────────────────────────────────────
function buildTenantPitchBody(inputData, resultData, targetConcept) {
  const {
    brokerName, organization, addressRaw,
    propertyType, availableSf, isVented,
  } = inputData;

  const {
    address, metrics, demographics, scores,
    void_analysis, mapUrl, dot_aadt, permits,
    irs_soi, oz_data, food_access,
    profile_label, trajectory_label,
  } = resultData;

  const r1   = demographics?.ring1 || {};
  const pop1  = r1.population    || metrics?.population    || null;
  const inc1  = r1.median_income || metrics?.median_income || null;
  const age1  = r1.median_age    || metrics?.median_age    || null;
  const coll1 = r1.pct_college_plus || metrics?.pct_college || null;
  const own1  = r1.pct_owner_occupied || null;
  const voidData = void_analysis || [];
  const daytime  = metrics?.daytime_workers || null;

  // Find the score entry for this concept
  const conceptScore = (scores || []).find(s =>
    (s.targets || []).some(t => t?.toLowerCase() === targetConcept?.toLowerCase())
  ) || (scores || [])[0];

  const conceptCategory = conceptScore?.category_name || '';

  // Matching void entry for this concept's category
  const conceptVoid = voidData.find(v =>
    v.category && conceptCategory &&
    (v.category.toLowerCase().includes(conceptCategory.toLowerCase().split('/')[0].trim()) ||
     conceptCategory.toLowerCase().includes(v.category.toLowerCase().split('/')[0].trim()))
  );

  // AADT
  const aadtCount   = dot_aadt?.aadt_count || metrics?.traffic_counts || null;
  const aadtDisplay = aadtCount ? aadtCount.toLocaleString() : null;
  const aadtRoad    = dot_aadt?.road_name || null;

  // Void callout content
  const voidCallout = (() => {
    if (!conceptVoid) return null;
    if (conceptVoid.status === 'Underserved') {
      const dist = conceptVoid.nearest_dist_mi;
      return {
        type: 'clear',
        headline: dist ? `Nearest ${conceptVoid.category} competitor: ${dist} miles away` : `No ${conceptVoid.category} competitor found`,
        subline: 'The customers are here. The competition is not.',
      };
    }
    const count = conceptVoid.count_1mi;
    const nearest = (conceptVoid.named_within_1mi || [])[0] || conceptVoid.nearest_name;
    return {
      type: 'note',
      headline: `${count != null ? count : 'Multiple'} ${conceptVoid.category} competitor${count !== 1 ? 's' : ''} within 1 mile`,
      subline: nearest ? `Nearest: ${nearest}` : null,
    };
  })();

  // Why this window — signal bullets
  const signals = [];
  if (oz_data?.is_opportunity_zone) {
    signals.push('Opportunity Zone designated tract — federal tax incentive for qualified investments within this geography.');
  }
  if (food_access?.food_desert && conceptVoid?.status === 'Underserved') {
    signals.push('USDA-designated food desert — underserved market with documented limited access to daily needs retail.');
  }
  if (permits?.trajectory_signal === 'strong growth') {
    signals.push(`Strong residential development: ${fmtN(permits.units_18mo)} new units permitted in the last 18 months — trade area is actively expanding.`);
  } else if (permits?.trajectory_signal === 'moderate growth' && permits?.units_18mo) {
    signals.push(`${fmtN(permits.units_18mo)} residential units permitted in the last 18 months — steady new household formation underway.`);
  }
  if (trajectory_label) {
    signals.push(`Trade area trajectory: ${trajectory_label}.`);
  }

  // Score reasons for site qualification
  const qualificationNotes = (conceptScore?.reasons || [])
    .filter(r => !r.startsWith('DISQUALIFIED') && !r.startsWith('Penalized'))
    .slice(0, 4);

  return `
<div class="page">
  <div class="hdr">
    <div class="logo">TENANT<span>FIT</span> <span style="font-size:11px;font-weight:400;color:#6b7280">Site Opportunity Brief</span></div>
    <div class="broker-info">
      <div class="name">${esc(brokerName)}</div>
      <div>${esc(organization)}</div>
    </div>
  </div>

  <div class="pitch-title">${targetConcept ? `Prepared for ${esc(targetConcept)}` : ''}</div>
  <div class="pitch-h1">${esc(address || addressRaw)}</div>

  <div class="meta-band">
    <div class="meta-item">
      <span class="lbl">Available SF</span>
      <span class="val">${availableSf ? parseInt(availableSf).toLocaleString() : '—'}</span>
    </div>
    <div class="meta-item">
      <span class="lbl">Property Type</span>
      <span class="val" style="font-size:10px">${esc(propertyType) || '—'}</span>
    </div>
    <div class="meta-item">
      <span class="lbl">Infrastructure</span>
      <span class="val">${isVented ? 'Restaurant Ready' : 'Dry Use'}</span>
    </div>
    <div class="meta-item">
      <span class="lbl">Category Fit Score</span>
      <span class="val">${conceptScore ? conceptScore.total_score + ' / 10' : '—'}</span>
    </div>
  </div>

  <div class="sec-hdr">Trade Area <span class="tag">Google Maps</span></div>
  ${mapUrl ? `<img src="${esc(mapUrl)}" class="map-img" alt="Trade Area Map" />` : `<div class="map-ph">Map unavailable</div>`}

  <!-- YOUR CUSTOMER LIVES HERE -->
  <div class="pitch-band">
    <div class="band-lbl">Your customer lives here</div>
    ${profile_label ? `<span class="profile-badge">${esc(profile_label)}</span>` : ''}
    <div class="three-col" style="margin-top:8px;margin-bottom:0">
      <div class="stat-card">
        <div class="lbl">Median HHI</div>
        <div class="val">${fmt$(inc1)}</div>
      </div>
      <div class="stat-card light">
        <div class="lbl">Population (1 Mi)</div>
        <div class="val">${fmtN(pop1)}</div>
      </div>
      <div class="stat-card light">
        <div class="lbl">Median Age</div>
        <div class="val">${age1 != null ? age1.toFixed(1) : '—'}</div>
      </div>
      <div class="stat-card light" style="margin-top:8px">
        <div class="lbl">College-Educated</div>
        <div class="val">${fmtPct(coll1)}</div>
      </div>
      <div class="stat-card light" style="margin-top:8px">
        <div class="lbl">Homeownership</div>
        <div class="val">${fmtPct(own1)}</div>
      </div>
      <div class="stat-card light" style="margin-top:8px">
        <div class="lbl">Age 25–44 Share</div>
        <div class="val">${r1.pct_25_44 != null ? fmtPct(r1.pct_25_44) : '—'}</div>
      </div>
    </div>
  </div>

  <!-- VOID / NO COMPETITION -->
  <div class="sec-hdr">Competitive Landscape <span class="tag">OpenStreetMap / Overpass</span></div>
  ${voidCallout ? `
  <div class="void-callout${voidCallout.type === 'clear' ? ' clear' : ''}">
    <div class="vc-lbl">${esc(conceptCategory)} competition</div>
    <div class="vc-val">${esc(voidCallout.headline)}</div>
    ${voidCallout.subline ? `<div style="font-size:11px;margin-top:4px;font-weight:600;opacity:0.75">${esc(voidCallout.subline)}</div>` : ''}
  </div>` : `<p style="font-size:11px;color:#6b7280;margin-bottom:14px">Void analysis unavailable for this location.</p>`}

  <!-- TRAFFIC & DAYTIME -->
  <div class="sec-hdr">Traffic &amp; Foot Traffic <span class="tag">DOT AADT + Census LEHD</span></div>
  <div class="two-col" style="margin-bottom:18px">
    <div class="stat-card">
      <div class="lbl">Daily Vehicles${dot_aadt?.aadt_count ? '' : ' (est.)'}</div>
      <div class="val">${aadtDisplay ? aadtDisplay : '—'}</div>
      ${aadtRoad ? `<div class="sub">${esc(aadtRoad)}</div>` : ''}
    </div>
    <div class="stat-card light">
      <div class="lbl">Daytime Workers Within 1 Mile</div>
      <div class="val">${daytime != null ? fmtN(daytime) : '—'}</div>
      <div class="sub">Lunchtime + errand capture</div>
    </div>
  </div>

  <!-- MARKET TRAJECTORY -->
  <div class="sec-hdr">Market Trajectory <span class="tag">Building Permits + IRS SOI</span></div>
  <div class="two-col" style="margin-bottom:18px">
    ${permits?.units_18mo != null ? `
    <div class="stat-card">
      <div class="lbl">Residential Units Permitted (18 mo)</div>
      <div class="val">${fmtN(permits.units_18mo)}</div>
      <div class="sub">${esc(permits.trajectory_signal || '')}${permits.city ? ' &middot; ' + permits.city : ''}</div>
    </div>` : `<div class="stat-card light"><div class="lbl">Permits</div><div class="val" style="font-size:12px">No coverage</div></div>`}
    ${irs_soi?.median_agi ? `
    <div class="stat-card light">
      <div class="lbl">Median AGI — ZIP ${esc(irs_soi.zip || '')}</div>
      <div class="val">${fmt$(irs_soi.median_agi)}</div>
      <div class="sub">IRS SOI ${esc(irs_soi.year || '')}</div>
    </div>` : trajectory_label ? `
    <div class="stat-card light">
      <div class="lbl">Trajectory Signal</div>
      <div class="val" style="font-size:12px">${esc(trajectory_label)}</div>
    </div>` : ''}
  </div>

  <!-- SITE SPECIFICATIONS -->
  <div class="sec-hdr">Site Specifications <span class="tag">Property + Brand Criteria</span></div>
  <table class="tbl" style="margin-bottom:6px">
    <thead><tr><th>Specification</th><th>This Site</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td>Available SF</td><td>${availableSf ? parseInt(availableSf).toLocaleString() + ' SF' : '—'}</td><td style="font-size:10px;color:#6b7280">${conceptScore?.reasons?.find(r => r.toLowerCase().includes('sf') || r.toLowerCase().includes('size')) ? esc(conceptScore.reasons.find(r => r.toLowerCase().includes('sf') || r.toLowerCase().includes('size'))) : ''}</td></tr>
      <tr><td>Infrastructure</td><td>${isVented ? 'Restaurant-vented' : 'Dry use only'}</td><td style="font-size:10px;color:#6b7280">${isVented ? 'Supports QSR, fast casual, food' : 'Retail, service, fitness, medical'}</td></tr>
      <tr><td>Property Type</td><td>${esc(propertyType) || '—'}</td><td></td></tr>
    </tbody>
  </table>
  ${qualificationNotes.length ? `
  <div style="margin-top:8px;margin-bottom:14px">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#4b5563;margin-bottom:5px">Site qualification notes</div>
    <ul style="padding-left:14px;font-size:10px;color:#4b5563;line-height:1.8">
      ${qualificationNotes.map(r => `<li>${esc(r)}</li>`).join('')}
    </ul>
  </div>` : ''}

  <!-- WHY THIS WINDOW -->
  ${signals.length > 0 ? `
  <div class="sec-hdr">Why This Window</div>
  <div style="margin-bottom:16px">
    ${signals.map(s => `
    <div class="signal-bullet">
      <div class="dot"></div>
      <div>${esc(s)}</div>
    </div>`).join('')}
  </div>` : ''}

  <!-- CTA -->
  <div class="cta-block">
    <div class="cta-lbl">Requested next step</div>
    <div class="cta-request">Site tour / NDA execution / Letter of Intent</div>
    <div class="cta-contact">
      <strong>${esc(brokerName)}</strong>${organization ? ' &bull; ' + esc(organization) : ''}
    </div>
    <div style="font-size:9px;color:#9ca3af;margin-top:4px">Additional trade area data or demographic breakout available on request.</div>
  </div>

  <div class="disclaimer" style="margin-top:16px">
    This brief was prepared by ${esc(brokerName || 'TenantFit')} using TenantFit location intelligence.
    Demographic data: U.S. Census ACS. Traffic: DOT / OSM. Competitor locations: OpenStreetMap.
    Permit data: state/city open data portals. Named concept is a demographic profile match — not a confirmed expansion plan.
    Verify site criteria with the brand's real estate team before outreach.
    Generated ${new Date().toLocaleDateString()}.
  </div>
  <div class="footer-line">
    <span>CONFIDENTIAL${targetConcept ? ` &bull; PREPARED FOR ${esc(targetConcept.toUpperCase())}` : ''}</span>
    <span>TENANTFIT &bull; ${new Date().toLocaleDateString()}</span>
  </div>
</div>`;
}

// ─────────────────────────────────────────
// HTML WRAPPERS
// ─────────────────────────────────────────
function wrapHtml(body) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body>${body}</body></html>`;
}

function buildCombinedHtml(inputData, resultData, targetConcept) {
  return wrapHtml(
    buildLandlordBriefBody(inputData, resultData) +
    '<div style="page-break-before:always"></div>' +
    buildTenantPitchBody(inputData, resultData, targetConcept || null)
  );
}

// ─────────────────────────────────────────
// GENERATE PDF
// ─────────────────────────────────────────
async function generatePdf(inputData, resultData, targetConcept = null, docType = 'both') {
  const resolvedConcept = targetConcept || null;

  let html;
  if (docType === 'landlord') {
    html = wrapHtml(buildLandlordBriefBody(inputData, resultData));
  } else if (docType === 'tenant') {
    html = wrapHtml(buildTenantPitchBody(inputData, resultData, resolvedConcept));
  } else {
    html = buildCombinedHtml(inputData, resultData, targetConcept);
  }

  const browser = await chromium.launch();
  const page    = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    return await page.pdf({
      format: 'Letter',
      margin: { top: '0.4in', right: '0.4in', bottom: '0.4in', left: '0.4in' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

module.exports = { generatePdf };

// CHECKPOINT — 2026-04-16
// Completed: Task 17 (pdf.js) — combined Landlord Brief + Tenant Pitch PDF
//   - Shared CSS with navy (#1B2A4A) color system, professional typography
//   - Landlord Brief: fixed score scale to 0-10, added profile_label, trajectory,
//     daytime workers, DOT AADT, permits trajectory block
//   - Tenant Pitch: full 2-section layout — demographics match, void callout,
//     traffic/daytime, trajectory, site specs, why-this-window signals, CTA block
//   - buildCombinedHtml() renders both with CSS page-break-before between them
//   - generatePdf() accepts targetConcept param; falls back to top score's first target
// State: working
// Next: Update App.jsx ReportView — concept picker, score display fix
// Dependencies: scoring.js (0-10 scale), server.js (targetConcept passthrough)
