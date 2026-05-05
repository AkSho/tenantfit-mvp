import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  MapPin, CheckCircle, X, Loader2, Building2, ChevronDown,
  ArrowLeft, Download, ChefHat, AlertTriangle, Store
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API_URL = `${BASE_URL}/api/report`;

const LEASING_OBJECTIVES = [
  { value: 'credit',       label: 'National Credit Tenant',     desc: 'Investment-grade brand, long-term NNN, anchor value' },
  { value: 'speed',        label: 'Speed to Lease',             desc: 'Active expander ready to move, flexible on terms' },
  { value: 'fnb',          label: 'Food & Beverage',            desc: 'QSR to casual dining, restaurant-ready or convertible' },
  { value: 'health',       label: 'Health & Wellness',          desc: 'Medical, fitness, dental, personal care services' },
  { value: 'convenience',  label: 'Daily Needs / Convenience',  desc: 'Grocery, pharmacy, service retail, high-frequency visits' },
  { value: 'experiential', label: 'Experiential / Destination', desc: 'Entertainment, specialty, activity-based, drives dwell time' },
  { value: 'neighborhood', label: 'Neighborhood Services',      desc: 'Community-facing, lifestyle-aligned, local demographic fit' },
];

const PROPERTY_TYPE_OPTIONS = [
  'Freestanding / Pad Site',
  'Strip Center',
  'Neighborhood Center',
  'Community Center',
  'Power Center',
  'Regional Mall',
  'Super-Regional Mall',
  'Lifestyle Center',
  'Outlet / Off-Price Center',
  'Mixed-Use',
  'Downtown / Street Front',
  'Urban In-Line',
  'Transit-Oriented Development (TOD)',
  'Town Center',
  'End Cap',
  'Junior Box / Large Format',
  'Medical / Healthcare Campus',
  'Airport / Transportation Hub',
];

const PROFILE_INTERPRETATIONS = {
  'Urban Professional': 'High-income, highly educated urban core. Residents skew younger, rent rather than own, and commute by transit. Strong demand for premium food & beverage, boutique fitness, and specialty retail.',
  'Suburban Family': 'Established suburban market with homeowners in their prime spending years. Car-dependent, household-formation stage. Strong fit for family dining, home-related retail, fitness, and essential services.',
  'Dense / Working Class': 'High-density trade area with moderate incomes and a renter-majority population. High foot traffic potential. Strong fit for value retail, quick-service food, pharmacy, and daily-needs convenience.',
  'Mixed': 'Transitional or mixed-demographic trade area. Scoring reflects a blend of demographic signals. Verify primary customer base before outreach.',
};

const SF_RANGE_OPTIONS = [
  { id: '0-1500',     label: '0 – 1,500',       midpoint: 750 },
  { id: '1500-3000',  label: '1,500 – 3,000',   midpoint: 2250 },
  { id: '3000-5000',  label: '3,000 – 5,000',   midpoint: 4000 },
  { id: '5000-10000', label: '5,000 – 10,000',  midpoint: 7500 },
  { id: '10000+',     label: '10,000+',          midpoint: 15000 },
];

const TENANT_CATEGORIES = {
  'Restaurants': [
    'Coffee Shop', 'Quick Service (QSR)', 'Fast Casual',
    'Casual Dining', 'Fine Dining', 'Dessert / Snacks',
  ],
  'Food & Convenience': [
    'Grocery Store', 'Pharmacy / Drug Store', 'Discount Store',
    'Liquor & Wine', 'General Merchandise',
  ],
  'Shopping': [
    'Clothing & Apparel', 'Pet Supplies / Services', 'Cosmetics & Beauty',
    'Specialty Retail', 'Footwear', 'Hobbies / Toys / Books',
    'Consumer Electronics', 'Home Specialty',
  ],
  'Services': [
    'Fitness & Gyms', 'Large Format Fitness', 'Hair, Skin & Nails',
    'Healthcare / Urgent Care', 'Dental', 'Banks & Financial',
    'Wireless / Telecom', 'Automotive', 'Optical & Vision',
  ],
};

// ── Category selection modal ───────────────────────────────────────────────────
const CategoryModal = ({ selected, onSave, onClose }) => {
  const all = Object.values(TENANT_CATEGORIES).flat();
  const [local, setLocal] = React.useState(() => new Set(selected.length ? selected : all));

  const toggle = (cat) => {
    const next = new Set(local);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    setLocal(next);
  };
  const selectAll  = () => setLocal(new Set(all));
  const clearAll   = () => setLocal(new Set());

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <h2 className="text-lg font-semibold text-gray-900">What type of tenants are you looking for?</h2>
          <div className="flex gap-2">
            <button onClick={selectAll}  className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">Select All</button>
            <button onClick={clearAll}   className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">Clear All</button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-x-10 gap-y-0.5">
          {Object.entries(TENANT_CATEGORIES).map(([group, items]) => (
            <div key={group}>
              <h3 className="font-bold text-sm text-gray-800 mb-2">{group}</h3>
              {items.map(cat => (
                <label key={cat} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox" checked={local.has(cat)} onChange={() => toggle(cat)}
                    className="rounded border-gray-400 text-[#1B2A4A] accent-[#1B2A4A]" />
                  <span className="text-sm text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-10">
          <button onClick={() => { onSave([...local]); onClose(); }}
            className="px-10 py-2.5 bg-[#1B2A4A] text-white rounded-full text-sm font-medium hover:bg-[#243659]">
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Requirements modal ────────────────────────────────────────────────────────
const RequirementsModal = ({ selectedPropertyTypes, selectedSfRanges, isVented, onSave, onClose }) => {
  const [localTypes, setLocalTypes] = React.useState(() => new Set(selectedPropertyTypes.length ? selectedPropertyTypes : PROPERTY_TYPE_OPTIONS));
  const [localSf, setLocalSf]       = React.useState(() => new Set(selectedSfRanges.length ? selectedSfRanges : SF_RANGE_OPTIONS.map(r => r.id)));
  const [localVented, setLocalVented] = React.useState(isVented); // null | true | false

  const toggleType = (t) => { const n = new Set(localTypes); n.has(t) ? n.delete(t) : n.add(t); setLocalTypes(n); };
  const toggleSf   = (id) => { const n = new Set(localSf);  n.has(id) ? n.delete(id) : n.add(id); setLocalSf(n); };
  const selectAll  = () => { setLocalTypes(new Set(PROPERTY_TYPE_OPTIONS)); setLocalSf(new Set(SF_RANGE_OPTIONS.map(r => r.id))); };
  const clearAll   = () => { setLocalTypes(new Set()); setLocalSf(new Set()); setLocalVented(null); };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <h2 className="text-lg font-semibold text-gray-900">Only include tenants that meet the following criteria:</h2>
          <div className="flex gap-2">
            <button onClick={selectAll} className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">Select All</button>
            <button onClick={clearAll}  className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">Clear All</button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-sm text-gray-800 mb-3">Shopping Center Type:</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5">
            {PROPERTY_TYPE_OPTIONS.map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localTypes.has(t)} onChange={() => toggleType(t)}
                  className="rounded border-gray-400 accent-[#1B2A4A]" />
                <span className="text-sm text-gray-700">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-sm text-gray-800 mb-3">Available Space (Square Footage):</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5">
            {SF_RANGE_OPTIONS.map(r => (
              <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localSf.has(r.id)} onChange={() => toggleSf(r.id)}
                  className="rounded border-gray-400 accent-[#1B2A4A]" />
                <span className="text-sm text-gray-700">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-sm text-gray-800 mb-3">Infrastructure:</h3>
          <div className="flex gap-8">
            {[
              { val: null,  label: 'No restriction' },
              { val: true,  label: 'Restaurant Ready (vented)' },
              { val: false, label: 'Dry Use Only' },
            ].map(opt => (
              <label key={String(opt.val)} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="req_vented" checked={localVented === opt.val} onChange={() => setLocalVented(opt.val)} />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button onClick={() => { onSave({ propertyTypes: [...localTypes], sfRanges: [...localSf], isVented: localVented }); onClose(); }}
            className="px-10 py-2.5 bg-[#1B2A4A] text-white rounded-full text-sm font-medium hover:bg-[#243659]">
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// --- REPORT VIEW ---
const ReportView = ({ inputData, resultData, onBack }) => {
  const {
    metrics, scores, void_analysis, voidAnalysis, mapUrl,
    profile_label, trajectory_label, dot_aadt, demographics,
    permits, oz_data, food_access,
  } = resultData;

  const [landlordLoading, setLandlordLoading] = React.useState(false);
  const [tenantLoading, setTenantLoading]     = React.useState(false);

  const conceptOptions = React.useMemo(() => {
    const seen = new Set();
    const opts = [];
    (scores || []).slice(0, 6).forEach(s => {
      // Prefer franchise_matches (meets first, then borderline), fall back to targets
      const names = (s.franchise_matches || []).filter(m => m.match === 'meets' || m.match === 'borderline').map(m => m.name);
      const list = names.length ? names.slice(0, 3) : (s.targets || []).slice(0, 2);
      list.forEach(t => {
        if (t && !seen.has(t)) { seen.add(t); opts.push({ label: `${t} (${s.category_name})`, value: t }); }
      });
    });
    return opts;
  }, [scores]);

  const [targetConcept, setTargetConcept] = React.useState('');

  const downloadPdf = async (docType, setLoading) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputData, resultData, targetConcept, docType }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'failed');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const slug = (inputData.addressRaw || 'report').replace(/[^a-z0-9]/gi, '-').slice(0, 40);
      a.href = url;
      a.download = `tenantfit-${docType}-${slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('PDF generation failed: ' + (e?.message || 'unknown error')); }
    finally { setLoading(false); }
  };

  const r1         = demographics?.ring1 || {};
  const voidItems  = void_analysis || (voidAnalysis || []).map(v => ({ category: v.category, status: v.status }));
  const aadtDisplay = dot_aadt?.aadt_count
    ? dot_aadt.aadt_count.toLocaleString()
    : metrics?.traffic_counts ? '~' + metrics.traffic_counts.toLocaleString() : null;

  // Tenant Pitch — concept-specific data
  const conceptScore = React.useMemo(() =>
    (scores || []).find(s =>
      (s.targets || []).some(t => t?.toLowerCase() === targetConcept?.toLowerCase()) ||
      (s.franchise_matches || []).some(m => m.name?.toLowerCase() === targetConcept?.toLowerCase())
    ) || scores?.[0],
    [scores, targetConcept]);

  const conceptVoid = React.useMemo(() => {
    const cat = conceptScore?.category_name || '';
    return voidItems.find(v =>
      v.category && cat &&
      (v.category.toLowerCase().includes(cat.toLowerCase().split('/')[0].trim()) ||
       cat.toLowerCase().includes(v.category.toLowerCase().split('/')[0].trim()))
    );
  }, [voidItems, conceptScore]);

  const pitchSignals = React.useMemo(() => {
    const s = [];
    if (oz_data?.is_opportunity_zone) s.push('Opportunity Zone — federal tax incentive for qualified investments.');
    if (food_access?.food_desert && conceptVoid?.status === 'Underserved') s.push('USDA food desert — documented limited access to daily-needs retail.');
    if (permits?.trajectory_signal === 'strong growth') s.push(`Strong residential growth: ${(permits.units_18mo || 0).toLocaleString()} units permitted in 18 months.`);
    if (trajectory_label) s.push(`Trade area trajectory: ${trajectory_label}.`);
    return s;
  }, [oz_data, food_access, conceptVoid, permits, trajectory_label]);

  const SectionLabel = ({ children, tag }) => (
    <div className="flex justify-between items-center border-b border-gray-200 pb-1 mb-3">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#1B2A4A]">{children}</span>
      {tag && <span className="text-[9px] font-mono text-gray-400">{tag}</span>}
    </div>
  );

  const StatBox = ({ label, value, sub, accent }) => (
    <div className={`p-3 bg-[#f8fafc] border-l-2 ${accent ? 'border-[#1B2A4A]' : 'border-gray-200'}`}>
      <p className="text-[9px] uppercase font-bold text-gray-400 mb-0.5">{label}</p>
      <p className="text-base font-bold text-[#1B2A4A] leading-tight">{value}</p>
      {sub && <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 h-11 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <button onClick={onBack} className="flex items-center text-xs text-gray-500 hover:text-gray-900 gap-1 font-medium">
          <ArrowLeft className="h-3.5 w-3.5" /> New Analysis
        </button>
        <div className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-[#1B2A4A]" />
          <span className="text-sm font-bold text-[#1B2A4A] tracking-tight">TenantFit</span>
        </div>
        <div className="w-28" />
      </nav>

      {/* Two-document scroll area */}
      <div className="flex-1 overflow-y-auto py-8 px-4 flex flex-col items-center gap-10">

        {/* ── DOCUMENT 1: LANDLORD BRIEF ── */}
        <div className="w-full max-w-[760px]">
          <div className="flex items-center justify-between mb-2 px-1">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Document 1</p>
              <h2 className="text-sm font-bold text-gray-800">Landlord Brief</h2>
            </div>
            <button
              onClick={() => downloadPdf('landlord', setLandlordLoading)}
              disabled={landlordLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1B2A4A] text-white text-xs font-semibold rounded hover:bg-[#243659] disabled:opacity-50 transition-colors"
            >
              {landlordLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {landlordLoading ? 'Generating...' : 'Download Landlord Brief'}
            </button>
          </div>

          <div className="bg-white shadow-lg rounded-sm border border-gray-200 overflow-hidden">
            {/* Preview banner */}
            <div className="bg-blue-50 border-b border-blue-100 px-8 py-2 flex items-center justify-between">
              <span className="text-xs text-blue-700 font-medium">Preview — full report includes demographics table, walkability index, business density, permits, and site qualifications</span>
            </div>
            {/* Brief header */}
            <div className="px-8 pt-7 pb-5 border-b border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Landlord Brief</p>
                  <h1 className="text-2xl font-bold text-[#1B2A4A] mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Tenant Fit Analysis
                  </h1>
                  <div className="flex items-center text-gray-500 text-xs gap-1">
                    <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                    {inputData.addressRaw}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[#1B2A4A]">{inputData.brokerName}</p>
                  <p className="text-[10px] text-gray-400">{inputData.organization}</p>
                </div>
              </div>

              {/* Meta strip */}
              <div className="grid grid-cols-4 gap-0 border-t-2 border-b-2 border-[#1B2A4A] py-2.5 bg-[#f8fafc]">
                {[
                  ['Leasing Strategy', LEASING_OBJECTIVES.find(o => o.value === inputData.leasingObjective)?.label || '—'],
                  ['Asset Class', inputData.propertyType || '—'],
                  ['Available SF', inputData.availableSf ? `${inputData.availableSf.toLocaleString()} SF` : '—'],
                  ['Infrastructure', inputData.isVented === true ? 'Restaurant Ready' : inputData.isVented === false ? 'Dry Use' : 'Unknown'],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="px-4">
                    <p className="text-[8px] uppercase tracking-widest text-gray-400 mb-0.5">{lbl}</p>
                    <p className="text-xs font-bold text-[#1B2A4A] truncate">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Profile + stats */}
              {profile_label && (
                <div className="mb-3">
                  <span className="inline-block bg-[#1B2A4A] text-white text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded mb-2">
                    {profile_label}
                  </span>
                  {PROFILE_INTERPRETATIONS[profile_label] && (
                    <p className="text-xs text-gray-500 mt-1.5">{PROFILE_INTERPRETATIONS[profile_label]}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {metrics?.population    && <StatBox accent label="Population (1 mi)" value={metrics.population.toLocaleString()} />}
                {metrics?.median_income && <StatBox label="Median HHI" value={`$${metrics.median_income.toLocaleString()}`} />}
                {aadtDisplay            && <StatBox label="Daily Traffic" value={aadtDisplay} sub={dot_aadt?.road_name} />}
                {metrics?.daytime_workers && <StatBox label="Daytime Workers" value={metrics.daytime_workers.toLocaleString()} sub="Census LEHD" />}
              </div>

              {/* Map */}
              <div>
                <SectionLabel tag="Google Maps">Trade Area</SectionLabel>
                <div className="h-44 bg-gray-100 border border-gray-200 rounded overflow-hidden">
                  {mapUrl
                    ? <img src={mapUrl} alt="Trade Area" className="w-full h-full object-cover" />
                    : <div className="h-full flex items-center justify-center text-gray-400 text-xs">Map unavailable</div>}
                </div>
              </div>

              {/* Void analysis */}
              {voidItems.length > 0 && (
                <div>
                  <SectionLabel tag="OpenStreetMap">Void Analysis</SectionLabel>
                  <div className="grid grid-cols-4 gap-1.5">
                    {voidItems.slice(0, 8).map((item, i) => (
                      <div key={i} className={`p-2 rounded border text-center text-xs ${
                        item.status === 'Underserved' ? 'bg-green-50 border-green-200' :
                        item.status === 'Saturated'   ? 'bg-amber-50 border-amber-200' :
                                                        'bg-blue-50 border-blue-100'}`}>
                        <p className={`font-semibold text-[10px] ${
                          item.status === 'Underserved' ? 'text-green-800' :
                          item.status === 'Saturated'   ? 'text-amber-700' : 'text-blue-700'}`}>
                          {item.category}
                        </p>
                        <p className={`text-[9px] ${
                          item.status === 'Underserved' ? 'text-green-600' :
                          item.status === 'Saturated'   ? 'text-amber-600' : 'text-blue-500'}`}>
                          {item.status === 'Underserved' ? 'Opportunity' : item.status === 'Saturated' ? 'Competitive' : 'Balanced'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scores */}
              <div>
                <SectionLabel tag={`Top ${Math.min((scores||[]).length, 3)}`}>High-Fit Tenant Categories</SectionLabel>
                <div className="space-y-3">
                  {(scores || []).slice(0, 3).map((s, i) => {
                    const meetsConcepts = (s.franchise_matches || []).filter(m => m.match === 'meets');
                    const borderlineConcepts = (s.franchise_matches || []).filter(m => m.match === 'borderline');
                    return (
                      <div key={s.category_id} className={`p-3 border rounded ${i === 0 ? 'border-[#1B2A4A] border-l-2' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-bold text-[#1B2A4A]">
                            {i === 0 && <span className="text-yellow-500 mr-1">★</span>}{s.category_name}
                          </span>
                          <span className="bg-[#1B2A4A] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            {s.total_score} / 10
                          </span>
                        </div>
                        <div className="h-1 bg-gray-200 rounded mb-2">
                          <div className="h-1 bg-[#1B2A4A] rounded" style={{ width: `${Math.min((s.total_score/10)*100,100)}%` }} />
                        </div>
                        <ul className="text-[10px] text-gray-500 list-disc pl-3 space-y-0.5 mb-2">
                          {(s.reasons||[]).filter(r => !r.startsWith('DISQUALIFIED')).slice(0,3).map((r,j) => (
                            <li key={j}>{r}</li>
                          ))}
                        </ul>
                        {(meetsConcepts.length > 0 || borderlineConcepts.length > 0) && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Demographic Profile Matches</p>
                            <div className="flex flex-wrap gap-1">
                              {meetsConcepts.slice(0,3).map(m => (
                                <span key={m.id} className="text-[9px] font-semibold bg-[#1B2A4A] text-white px-1.5 py-0.5 rounded">{m.name}</span>
                              ))}
                              {borderlineConcepts.slice(0, 2).map(m => (
                                <span key={m.id} className="text-[9px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">{m.name}</span>
                              ))}
                            </div>
                            <p className="text-[8px] text-gray-400 mt-1.5 italic">Profile match only — not confirmed expansion plans. Verify brand requirements before outreach.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {trajectory_label && (
                <div className="p-3 bg-[#f8fafc] border-l-2 border-[#1B2A4A]">
                  <p className="text-[9px] uppercase font-bold text-gray-400">Trade Area Trajectory</p>
                  <p className="text-sm font-bold text-[#1B2A4A] mt-0.5">{trajectory_label}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-between text-[9px] text-gray-400 font-mono">
                <span>CONFIDENTIAL · INTERNAL USE ONLY</span>
                <span>TENANTFIT · {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── DOCUMENT 2: TENANT PITCH ── */}
        <div className="w-full max-w-[760px]">
          <div className="flex items-center justify-between mb-2 px-1">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Document 2</p>
              <h2 className="text-sm font-bold text-gray-800">Tenant Pitch</h2>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[9px] text-gray-400 mb-0.5 uppercase tracking-wider">Addressed to</p>
                <input
                  type="text"
                  value={targetConcept}
                  onChange={e => setTargetConcept(e.target.value)}
                  list="concept-suggestions"
                  placeholder="Type brand name..."
                  className="border border-gray-300 text-gray-800 text-xs rounded px-2 py-1.5 bg-white focus:outline-none focus:border-[#1B2A4A] w-[180px]"
                />
                <datalist id="concept-suggestions">
                  {conceptOptions.map(o => <option key={o.value} value={o.value} />)}
                </datalist>
              </div>
              <button
                onClick={() => downloadPdf('tenant', setTenantLoading)}
                disabled={tenantLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1B2A4A] text-white text-xs font-semibold rounded hover:bg-[#243659] disabled:opacity-50 transition-colors"
              >
                {tenantLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                {tenantLoading ? 'Generating...' : 'Download Tenant Pitch'}
              </button>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-sm border border-gray-200 overflow-hidden">
            {/* Preview banner */}
            <div className="bg-blue-50 border-b border-blue-100 px-8 py-2 flex items-center justify-between">
              <span className="text-xs text-blue-700 font-medium">Preview — full report includes site specifications, qualification notes, and CTA block</span>
            </div>
            {/* Pitch header */}
            <div className="px-8 pt-7 pb-5 border-b border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                {targetConcept ? `Prepared for ${targetConcept}` : ''}
              </p>
              <h1 className="text-2xl font-bold text-[#1B2A4A] mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {inputData.addressRaw}
              </h1>
              {conceptScore && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-[#1B2A4A] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    Category Fit: {conceptScore.total_score} / 10
                  </span>
                  <span className="text-xs text-gray-400">{conceptScore.category_name}</span>
                </div>
              )}
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Your customer lives here */}
              <div className="bg-[#f8fafc] rounded border border-gray-200 p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">Your customer lives here</p>
                {profile_label && (
                  <div className="mb-3">
                    <span className="inline-block bg-[#1B2A4A] text-white text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded mb-2">
                      {profile_label}
                    </span>
                    {PROFILE_INTERPRETATIONS[profile_label] && (
                      <p className="text-xs text-gray-500 mt-1">{PROFILE_INTERPRETATIONS[profile_label]}</p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {metrics?.median_income   && <StatBox accent label="Median HHI"        value={`$${metrics.median_income.toLocaleString()}`} />}
                  {metrics?.population      && <StatBox label="Population (1 mi)"  value={metrics.population.toLocaleString()} />}
                  {metrics?.median_age      && <StatBox label="Median Age"          value={metrics.median_age.toFixed ? metrics.median_age.toFixed(1) : metrics.median_age} />}
                  {r1.pct_college_plus != null && <StatBox label="College-Educated"  value={`${(r1.pct_college_plus * 100).toFixed(0)}%`} />}
                  {r1.pct_owner_occupied != null && <StatBox label="Homeownership"   value={`${(r1.pct_owner_occupied * 100).toFixed(0)}%`} />}
                  {metrics?.daytime_workers && <StatBox label="Daytime Workers"     value={metrics.daytime_workers.toLocaleString()} sub="lunchtime capture" />}
                </div>
              </div>

              {/* Competitive landscape */}
              {conceptVoid && (
                <div>
                  <SectionLabel tag="OpenStreetMap">Competitive Landscape</SectionLabel>
                  <div className={`p-4 rounded border ${
                    conceptVoid.status === 'Underserved'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-amber-50 border-amber-200'}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${
                      conceptVoid.status === 'Underserved' ? 'text-green-700' : 'text-amber-700'}`}>
                      {conceptScore?.category_name} competition
                    </p>
                    <p className={`text-sm font-bold ${
                      conceptVoid.status === 'Underserved' ? 'text-green-800' : 'text-amber-800'}`}>
                      {conceptVoid.status === 'Underserved'
                        ? conceptVoid.nearest_dist_mi
                          ? `Nearest competitor: ${conceptVoid.nearest_dist_mi} miles away`
                          : 'No direct competition within 1 mile'
                        : `${conceptVoid.count_1mi || 'Multiple'} competitor${conceptVoid.count_1mi !== 1 ? 's' : ''} within 1 mile`}
                    </p>
                    {conceptVoid.status === 'Underserved' && (
                      <p className="text-xs text-green-700 mt-1">The customers are here. The competition is not.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Traffic */}
              <div>
                <SectionLabel tag="DOT AADT + Census LEHD">Traffic &amp; Foot Traffic</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox accent label={`Daily Vehicles${dot_aadt?.aadt_count ? '' : ' (est.)'}`}
                    value={aadtDisplay || '—'} sub={dot_aadt?.road_name} />
                  <StatBox label="Daytime Workers Within 1 Mile"
                    value={metrics?.daytime_workers ? metrics.daytime_workers.toLocaleString() : '—'}
                    sub="Lunchtime + errand capture" />
                </div>
              </div>

              {/* Why this window */}
              {pitchSignals.length > 0 && (
                <div>
                  <SectionLabel>Why This Window</SectionLabel>
                  <div className="space-y-2">
                    {pitchSignals.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1B2A4A] mt-1.5 shrink-0" />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-between text-[9px] text-gray-400 font-mono">
                <span>CONFIDENTIAL{targetConcept ? ` · PREPARED FOR ${targetConcept.toUpperCase()}` : ''}</span>
                <span>TENANTFIT · {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
};

// ── 6-Step SiteSeer-style wizard ──────────────────────────────────────────────
const TenantFitApp = () => {
  const [step, setStep] = useState(1);
  const [appStep, setAppStep] = useState('intake'); // intake | loading | report
  const [error, setError] = useState(null);
  const [reportResult, setReportResult] = useState(null);
  const [mapBgUrl, setMapBgUrl] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapPreview, setMapPreview] = useState({ lat: null, lng: null, formatted: null });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = React.useRef(null);

  const [formData, setFormData] = useState({
    addressRaw: '',
    locationName: '',
    tradeAreaMode: 'drive',
    driveMinutes: 10,
    radiusMiles: 3,
    categoriesMode: 'all',
    selectedCategories: [],
    requirementsMode: 'none',
    selectedPropertyTypes: [],
    selectedSfRanges: [],
    propertyType: '',
    availableSf: '',
    isVented: null,
    leasingObjective: 'traffic',
    reportType: 'both',
    brokerName: '',
    organization: '',
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  // Load default US overview map on mount
  useEffect(() => {
    fetch(`${BASE_URL}/api/default-map`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.mapUrl) setMapBgUrl(data.mapUrl); })
      .catch(() => {});
  }, []);

  const handleAddressInput = (val) => {
    set('addressRaw', val);
    setShowSuggestions(false);
    clearTimeout(suggestTimer.current);
    if (val.length < 4) { setSuggestions([]); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/geocode-suggest?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions((data.suggestions || []).length > 0);
      } catch {}
    }, 300);
  };

  const handleSuggestionSelect = async (suggestion) => {
    const [lng, lat] = suggestion.center;
    set('addressRaw', suggestion.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
    setMapLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/map-preview?lat=${lat}&lng=${lng}&address=${encodeURIComponent(suggestion.place_name)}`);
      const data = await res.json();
      setMapBgUrl(data.mapUrl);
      setMapPreview({ lat: data.lat, lng: data.lng, formatted: data.formatted });
      setFormData(prev => ({ ...prev, locationName: prev.locationName || data.formatted }));
    } catch {}
    finally { setMapLoading(false); }
  };

  const handleAddressBlur = async () => {
    // Fallback geocode on blur if no suggestion was selected and we have enough chars
    if (mapPreview.lat) return; // already resolved via suggestion
    const addr = formData.addressRaw.trim();
    if (addr.length < 8) return;
    setMapLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/map-preview?address=${encodeURIComponent(addr)}`);
      if (!res.ok) throw new Error('preview failed');
      const data = await res.json();
      setMapBgUrl(data.mapUrl);
      setMapPreview({ lat: data.lat, lng: data.lng, formatted: data.formatted });
      setFormData(prev => ({ ...prev, locationName: prev.locationName || data.formatted }));
    } catch {}
    finally { setMapLoading(false); }
  };

  const fetchIsochrone = async (lat, lng) => {
    if (!lat || !lng) return;
    setMapLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/isochrone-preview?lat=${lat}&lng=${lng}`);
      if (res.ok) { const data = await res.json(); setMapBgUrl(data.mapUrl); }
    } catch {}
    finally { setMapLoading(false); }
  };

  const fetchRadius = async (lat, lng, miles) => {
    if (!lat || !lng) return;
    setMapLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/radius-preview?lat=${lat}&lng=${lng}&miles=${miles}`);
      if (res.ok) { const data = await res.json(); setMapBgUrl(data.mapUrl); }
    } catch {}
    finally { setMapLoading(false); }
  };

  const goNext = () => {
    if (step === 1 && !formData.addressRaw.trim()) {
      setError('Please enter a property address.');
      return;
    }
    setError(null);
    const next = step + 1;
    setStep(next);
    if (next === 2 && mapPreview.lat && mapPreview.lng) {
      if (formData.tradeAreaMode === 'radius') {
        fetchRadius(mapPreview.lat, mapPreview.lng, formData.radiusMiles);
      } else {
        fetchIsochrone(mapPreview.lat, mapPreview.lng);
      }
    }
  };

  const goPrev = () => { setError(null); setStep(s => s - 1); };

  const computeAvailableSf = (sfRanges) => {
    if (!sfRanges || sfRanges.length === 0) return 3000;
    const selected = SF_RANGE_OPTIONS.filter(r => sfRanges.includes(r.id));
    if (!selected.length) return 3000;
    return Math.round(selected.reduce((sum, r) => sum + r.midpoint, 0) / selected.length);
  };

  const handleSubmit = async () => {
    if (!formData.brokerName.trim()) { setError('Broker name is required.'); return; }
    setAppStep('loading'); setError(null);
    try {
      const availableSf = parseInt(formData.availableSf) || 3000;
      const propertyType = formData.propertyType || 'Strip Center';
      const isVented = formData.isVented;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressData: { formatted_address: formData.addressRaw },
          leasingObjective: formData.leasingObjective,
          isVented, availableSf, propertyType,
          brokerName: formData.brokerName,
          organization: formData.organization,
          addressRaw: formData.addressRaw,
          tradeAreaMode: formData.tradeAreaMode,
          radiusMiles: formData.radiusMiles,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to generate report');
      setReportResult(data); setAppStep('report');
    } catch (err) {
      console.error(err);
      setError('Could not connect to the analysis engine. Is the server running?');
      setAppStep('intake');
    }
  };

  if (appStep === 'report' && reportResult) {
    const inputForReport = {
      ...formData,
      availableSf: parseInt(formData.availableSf) || null,
      propertyType: formData.propertyType || null,
      isVented: formData.isVented,
    };
    return (
      <ReportView
        inputData={inputForReport}
        resultData={reportResult}
        onBack={() => { setAppStep('intake'); setStep(1); }}
      />
    );
  }

  if (appStep === 'loading') return (
    <div className="min-h-screen bg-[#1B2A4A] flex flex-col items-center justify-center p-8 font-sans">
      <Loader2 className="h-10 w-10 text-blue-300 animate-spin mb-5" />
      <h2 className="text-xl font-bold text-white mb-2">Running Analysis</h2>
      <p className="text-blue-300 text-sm mb-8">Pulling live trade area data and scoring tenant categories.</p>
      <div className="grid grid-cols-2 gap-3 text-xs text-blue-400 max-w-xs w-full">
        {['Census ACS Demographics', 'DOT Traffic Counts', 'Void Analysis (OSM)', 'Daytime Workers', 'Building Permits', 'EPA Walkability'].map(s => (
          <div key={s} className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" /><span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const bgStyle = {
    backgroundImage: mapBgUrl ? `url("${mapBgUrl}")` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#e5e7eb',
  };

  return (
    <div className="min-h-screen font-sans relative" style={bgStyle}>
      {/* Modals */}
      {showCategoryModal && (
        <CategoryModal
          selected={formData.selectedCategories}
          onSave={cats => set('selectedCategories', cats)}
          onClose={() => setShowCategoryModal(false)}
        />
      )}
      {showRequirementsModal && (
        <RequirementsModal
          selectedPropertyTypes={formData.selectedPropertyTypes}
          selectedSfRanges={formData.selectedSfRanges}
          isVented={formData.isVented}
          onSave={({ propertyTypes, sfRanges, isVented }) => {
            setFormData(prev => ({ ...prev, selectedPropertyTypes: propertyTypes, selectedSfRanges: sfRanges, isVented }));
          }}
          onClose={() => setShowRequirementsModal(false)}
        />
      )}

      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-30 h-11 bg-white border-b border-gray-200 flex items-center px-5">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-[#1B2A4A]" />
          <span className="font-bold text-sm tracking-tight text-[#1B2A4A]">TENANT<span className="font-light">FIT</span></span>
          <span className="text-[10px] text-gray-400 uppercase tracking-widest ml-2 hidden sm:block">Void Analysis on Demand</span>
        </div>
        {mapLoading && <Loader2 className="h-3.5 w-3.5 text-gray-400 animate-spin ml-auto" />}
      </nav>

      {/* Floating wizard card */}
      <div className="fixed top-11 bottom-0 left-0 z-10 flex items-start pt-6 pl-8 pb-6 overflow-y-auto">
        <div className="w-[540px] bg-white rounded-xl shadow-2xl flex flex-col" style={{ minHeight: 'calc(100vh - 88px)' }}>

          {/* Card header */}
          <div className="px-8 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#1B2A4A]" />
              <span className="font-bold text-xs tracking-tight text-[#1B2A4A]">TENANT<span className="font-light">FIT</span></span>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* Step content */}
          <div className="flex-1 px-8 py-7">

            {/* ── Step 1: Location ── */}
            {step === 1 && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Select the Location</h2>

                <div className="mb-5">
                  <label className="block text-sm text-gray-600 mb-1.5">Address</label>
                  <div className="relative">
                    <input
                      value={formData.addressRaw}
                      onChange={e => handleAddressInput(e.target.value)}
                      onBlur={handleAddressBlur}
                      placeholder="123 Main St, City, State"
                      className="w-full px-3 py-2 pl-8 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#1B2A4A] placeholder-gray-400"
                      autoComplete="off"
                    />
                    <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded shadow-lg mt-0.5 overflow-hidden">
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={() => handleSuggestionSelect(s)}
                            className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0 truncate"
                          >
                            {s.place_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {mapPreview.formatted && (
                    <p className="mt-1.5 text-xs text-green-700 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> {mapPreview.formatted}
                    </p>
                  )}
                </div>

                <div className="mb-5">
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Location Name <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    value={formData.locationName}
                    onChange={e => set('locationName', e.target.value)}
                    placeholder="e.g. Bell Works Retail"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#1B2A4A] placeholder-gray-400"
                  />
                </div>
              </>
            )}

            {/* ── Step 2: Trade Area ── */}
            {step === 2 && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Choose your Trade Area</h2>

                <div className="space-y-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="radio" name="tradeArea" value="drive"
                      checked={formData.tradeAreaMode === 'drive'}
                      onChange={() => {
                        set('tradeAreaMode', 'drive');
                        if (mapPreview.lat && mapPreview.lng) fetchIsochrone(mapPreview.lat, mapPreview.lng);
                      }}
                      className="mt-0.5 accent-[#1B2A4A]" />
                    <div>
                      <span className="block text-sm text-gray-800">
                        Drive Time of{' '}
                        <input
                          type="number"
                          value={formData.driveMinutes}
                          onChange={e => set('driveMinutes', parseInt(e.target.value) || 10)}
                          onClick={e => { e.stopPropagation(); set('tradeAreaMode', 'drive'); }}
                          min={1} max={30}
                          className="inline-block w-10 text-center border-b border-gray-400 focus:outline-none focus:border-[#1B2A4A] text-sm font-semibold mx-1 bg-transparent"
                        />
                        {' '}Minutes
                      </span>
                      <span className="text-xs text-gray-400">Adjusts for actual road network</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="radio" name="tradeArea" value="radius"
                      checked={formData.tradeAreaMode === 'radius'}
                      onChange={() => {
                        set('tradeAreaMode', 'radius');
                        if (mapPreview.lat && mapPreview.lng) fetchRadius(mapPreview.lat, mapPreview.lng, formData.radiusMiles);
                      }}
                      className="mt-0.5 accent-[#1B2A4A]" />
                    <div>
                      <span className="block text-sm text-gray-800">
                        Radius of{' '}
                        <select
                          value={formData.radiusMiles}
                          onChange={e => {
                            const m = parseInt(e.target.value);
                            set('radiusMiles', m);
                            if (formData.tradeAreaMode === 'radius' && mapPreview.lat && mapPreview.lng) {
                              fetchRadius(mapPreview.lat, mapPreview.lng, m);
                            }
                          }}
                          onClick={e => { e.stopPropagation(); set('tradeAreaMode', 'radius'); }}
                          className="inline-block border-b border-gray-400 focus:outline-none focus:border-[#1B2A4A] text-sm font-semibold mx-1 bg-transparent"
                        >
                          <option value={1}>1</option>
                          <option value={3}>3</option>
                          <option value={5}>5</option>
                        </select>
                        {' '}Miles
                      </span>
                      <span className="text-xs text-gray-400">Straight-line radius from property</span>
                    </div>
                  </label>
                </div>

                <div className="mt-7 p-4 bg-gray-50 rounded border border-gray-200 text-xs text-gray-600 space-y-1.5">
                  <p className="font-semibold text-gray-700 mb-2">Measured inside this boundary:</p>
                  <p>— Resident demographics (Census ACS)</p>
                  <p>— Competitor density and void gaps (OSM)</p>
                  <p>— Daytime worker population (Census LEHD)</p>
                </div>
              </>
            )}

            {/* ── Step 3: Tenant Categories ── */}
            {step === 3 && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">What type of tenants are you looking for?</h2>

                <div className="space-y-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="radio" name="categories" value="all"
                      checked={formData.categoriesMode === 'all'}
                      onChange={() => set('categoriesMode', 'all')}
                      className="mt-0.5 accent-[#1B2A4A]" />
                    <div>
                      <span className="block text-sm text-gray-800">All Categories</span>
                      <span className="text-xs text-gray-400">Score every tenant type against this trade area</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="radio" name="categories" value="select"
                      checked={formData.categoriesMode === 'select'}
                      onChange={() => { set('categoriesMode', 'select'); setShowCategoryModal(true); }}
                      className="mt-0.5 accent-[#1B2A4A]" />
                    <div>
                      <span className="block text-sm text-gray-800">
                        Select Categories
                        {formData.categoriesMode === 'select' && formData.selectedCategories.length > 0 && (
                          <span className="ml-2 text-xs text-[#1B2A4A] font-medium">
                            ({formData.selectedCategories.length} selected)
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">Choose specific tenant types to include</span>
                    </div>
                  </label>
                </div>

                {formData.categoriesMode === 'select' && formData.selectedCategories.length > 0 && (
                  <button onClick={() => setShowCategoryModal(true)}
                    className="mt-3 text-xs text-[#1B2A4A] underline">
                    Edit selection
                  </button>
                )}
              </>
            )}

            {/* ── Step 4: Property Details ── */}
            {step === 4 && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Details</h2>

                <div className="space-y-5">
                  {/* Asset Class */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">Asset Class</label>
                    <select
                      value={formData.propertyType}
                      onChange={e => set('propertyType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#1B2A4A] bg-white text-gray-800"
                    >
                      <option value="">Select property type</option>
                      {PROPERTY_TYPE_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Available SF */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">Available Square Footage</label>
                    <input
                      type="number"
                      value={formData.availableSf}
                      onChange={e => set('availableSf', e.target.value)}
                      placeholder="e.g. 2400"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#1B2A4A] placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">Used to filter concepts by minimum SF requirement</p>
                  </div>

                  {/* Infrastructure */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Infrastructure</label>
                    <div className="space-y-2.5">
                      {[
                        { val: true,  label: 'Restaurant-ready',  desc: 'Grease trap, hood, or venting infrastructure in place' },
                        { val: false, label: 'Dry use only',       desc: 'No venting — food service concepts that require it are excluded' },
                        { val: null,  label: 'Unknown',            desc: 'Score all categories; infrastructure gaps flagged in output' },
                      ].map(({ val, label, desc }) => (
                        <label key={String(val)} className="flex items-start gap-3 cursor-pointer">
                          <input type="radio" name="vented"
                            checked={formData.isVented === val}
                            onChange={() => set('isVented', val)}
                            className="mt-0.5 accent-[#1B2A4A]"
                          />
                          <div>
                            <span className="block text-sm text-gray-800">{label}</span>
                            <span className="text-xs text-gray-400">{desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Step 5: Leasing Focus ── */}
            {step === 5 && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Leasing Objective</h2>

                <div className="space-y-5">
                  {LEASING_OBJECTIVES.map(obj => (
                    <label key={obj.value} className="flex items-start gap-3 cursor-pointer">
                      <input type="radio" name="leasing" value={obj.value}
                        checked={formData.leasingObjective === obj.value}
                        onChange={() => set('leasingObjective', obj.value)}
                        className="mt-0.5 accent-[#1B2A4A]" />
                      <div>
                        <span className="block text-sm text-gray-800 font-medium">{obj.label}</span>
                        <span className="text-xs text-gray-400">{obj.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 6: Confirm + Run ── */}
            {step === 6 && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Almost done</h2>

                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Broker Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={formData.brokerName}
                    onChange={e => set('brokerName', e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#1B2A4A] placeholder-gray-400"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Organization <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    value={formData.organization}
                    onChange={e => set('organization', e.target.value)}
                    placeholder="Brokerage name"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#1B2A4A] placeholder-gray-400"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-sm text-gray-600 mb-2">Report Output</label>
                  <div className="space-y-3">
                    {[
                      { value: 'both',     label: 'Both Briefs',     desc: 'Landlord Brief + Tenant Pitch in one PDF' },
                      { value: 'landlord', label: 'Landlord Brief',  desc: 'Scored tenant category recommendations' },
                      { value: 'tenant',   label: 'Tenant Pitch',    desc: 'Demographic match document for franchise outreach' },
                    ].map(rt => (
                      <label key={rt.value} className="flex items-start gap-3 cursor-pointer">
                        <input type="radio" name="reportType" value={rt.value}
                          checked={formData.reportType === rt.value}
                          onChange={() => set('reportType', rt.value)}
                          className="mt-0.5 accent-[#1B2A4A]" />
                        <div>
                          <span className="block text-sm text-gray-800">{rt.label}</span>
                          <span className="text-xs text-gray-400">{rt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-700 mb-1.5">Analysis Configuration</p>
                  <p><span className="text-gray-400">Address:</span> {formData.addressRaw || '—'}</p>
                  <p><span className="text-gray-400">Trade Area:</span> {formData.driveMinutes}-min drive time</p>
                  <p><span className="text-gray-400">Asset Class:</span> {formData.propertyType || '—'}</p>
                  <p><span className="text-gray-400">Available SF:</span> {formData.availableSf ? `${parseInt(formData.availableSf).toLocaleString()} SF` : '—'}</p>
                  <p><span className="text-gray-400">Infrastructure:</span> {formData.isVented === true ? 'Restaurant-ready' : formData.isVented === false ? 'Dry use only' : 'Unknown'}</p>
                  <p><span className="text-gray-400">Leasing:</span> {LEASING_OBJECTIVES.find(o => o.value === formData.leasingObjective)?.label}</p>
                </div>
              </>
            )}

          </div>{/* end step content */}

          {/* Navigation */}
          <div className={`px-8 pb-7 flex ${step > 1 ? 'justify-between' : 'justify-end'}`}>
            {step > 1 && (
              <button onClick={goPrev}
                className="px-5 py-2 rounded-full border border-gray-300 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                Previous
              </button>
            )}
            {step < 6 ? (
              <button onClick={goNext}
                className="px-5 py-2 rounded-full border border-[#1B2A4A] text-sm text-[#1B2A4A] hover:bg-[#f0f4ff] transition-colors">
                Next
              </button>
            ) : (
              <button onClick={handleSubmit}
                disabled={!formData.brokerName.trim()}
                className="px-8 py-2 rounded-full bg-[#1B2A4A] text-sm text-white font-semibold hover:bg-[#243659] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Run Analysis
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// CHECKPOINT — 2026-04-17
// Completed: Task 18 — Full SiteSeer-style 6-step wizard rebuild
//   - Full-screen map background (pin on step 1, isochrone on step 2+)
//   - Fixed top nav bar (z-30, h-11, white)
//   - Floating white card (540px wide, ml-8) with pill-shaped nav buttons
//   - No step indicator (matches SiteSeer pattern)
//   - Step 1: Address + Location Name
//   - Step 2: Trade Area (drive time inline editable input)
//   - Step 3: Categories (All radio / Select radio → CategoryModal)
//   - Step 4: Property Requirements (None radio / Specify radio → RequirementsModal)
//   - Step 5: Leasing Objective (radio list)
//   - Step 6: Broker name, org, report type, summary, Run Analysis button
//   - CategoryModal + RequirementsModal: full-screen white overlays (z-50)
//   - computeAvailableSf(): maps SF range checkboxes to midpoint average
// State: working
// Next: Task 19 — generate first sample PDF from real LoopNet listing

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TenantFitApp />} />
      </Routes>
    </Router>
  );
}