import React, { useState, useEffect } from 'react';
import {
    MapPin, CheckCircle, X, Loader2, Building2, ChevronDown,
    ArrowLeft, Download, ChefHat, AlertTriangle, Store
} from 'lucide-react';
import usePlacesAutocomplete from "use-places-autocomplete";

const API_URL = 'http://localhost:3001/api/report';

const LEASING_OBJECTIVES = [
    { value: 'rent', label: 'Maximize Rent', desc: 'Target credit tenants & nationals' },
    { value: 'speed', label: 'Speed to Lease', desc: 'Target active expanders' },
    { value: 'traffic', label: 'Drive Traffic', desc: 'Target high-volume daily needs' },
    { value: 'fit', label: 'Neighborhood Fit', desc: 'Curate for local demographics' },
];

const PROPERTY_TYPES = [
    'Retail - Street Front', 'Neighborhood Center', 'Community Center',
    'Power Center', 'Lifestyle Center', 'Mixed Use (Retail/Resi)',
    'Free Standing / Pad', 'Strip Mall', 'End Cap'
];

const CATEGORIES = {
    Food: ['Coffee (Premium)', 'QSR / Fast Food', 'Fast Casual', 'Full Service', 'Dessert / Snacks'],
    Service: ['Fitness (Boutique)', 'Fitness (Big Box)', 'Medical / Dental', 'Salon / Spa', 'Urgent Care'],
    Goods: ['Grocery', 'Apparel', 'Pet Supplies', 'Liquor / Wine', 'Pharmacy', 'Wireless / Bank']
};

// --- REAL AUTOCOMPLETE COMPONENT ---
const AddressAutocomplete = ({ onSelect }) => {
    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
        init,
    } = usePlacesAutocomplete({
        requestOptions: {
            /* Define search scope here if needed */
        },
        debounce: 300,
        initOnMount: false,
    });

    useEffect(() => {
        init();
    }, [init]);

    const [isOpen, setIsOpen] = useState(false);

    const handleInput = (e) => {
        setValue(e.target.value);
        setIsOpen(true);
    };

    const handleSelect = (suggestion) => {
        const address = suggestion.description;
        setValue(address, false);
        clearSuggestions();
        setIsOpen(false);
        onSelect(address);
    };

    return (
        <div className="mb-4 relative group col-span-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Property Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
                <input
                    disabled={!ready}
                    value={value}
                    onChange={handleInput}
                    placeholder="Start typing address..."
                    className="w-full px-3 py-2.5 pl-9 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 placeholder-gray-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    autoComplete="off"
                />
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>

            {isOpen && status === "OK" && (
                <ul className="absolute z-50 w-full bg-white mt-1 border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto py-1">
                    {data.map((suggestion) => (
                        <li
                            key={suggestion.place_id}
                            onClick={() => handleSelect(suggestion)}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center"
                        >
                            <MapPin className="h-3 w-3 mr-2 text-gray-400" />
                            {suggestion.description}
                        </li>
                    ))}
                    <li className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100 bg-gray-50 italic">
                        Powered by Google Places
                    </li>
                </ul>
            )}
        </div>
    );
};

// --- REPORT VIEW ---
const ReportView = ({ inputData, resultData, onBack }) => {
    const { metrics, scores, voidAnalysis, pdfUrl, mapUrl } = resultData;
    return (
        <div className="min-h-screen bg-gray-800 flex flex-col font-sans">
            <div className="bg-gray-900 text-white px-4 py-3 shadow-lg flex justify-between items-center sticky top-0 z-50">
                <button onClick={onBack} className="flex items-center text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-white">
                    <ArrowLeft className="h-3 w-3 mr-1" /> New Analysis
                </button>
                <span className="text-xs font-mono text-gray-500 hidden sm:block">
                    REPORT_ID_{new Date().getTime().toString().slice(-6)}
                </span>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center shadow-lg transition-colors">
                    <Download className="h-3 w-3 mr-2" /> Download Full PDF
                </a>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-8 flex justify-center bg-gray-700/50 backdrop-blur-sm">
                <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-2xl relative text-gray-900 animate-in fade-in zoom-in-95 duration-300">
                    <div className="px-10 py-8 border-b-4 border-gray-900 flex justify-between items-start bg-gray-50">
                        <div>
                            <div className="flex items-center space-x-2 mb-1 text-gray-900">
                                <Building2 className="h-6 w-6" />
                                <span className="font-bold text-xl tracking-tight">TENANT<span className="font-light">FIT</span></span>
                            </div>
                            <h1 className="text-3xl font-serif font-bold text-gray-900 mt-4">Tenant Fit Analysis</h1>
                            <div className="flex items-center text-gray-500 text-sm mt-2 font-medium space-x-4">
                                <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {inputData.addressRaw}</span>
                                <span className="flex items-center"><Store className="h-3 w-3 mr-1" /> {inputData.propertyType}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-gray-900 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-2 inline-block rounded-sm">
                                {LEASING_OBJECTIVES.find(o => o.value === inputData.leasingObjective)?.label}
                            </div>
                            <p className="text-xs text-gray-500 font-bold mt-1">{inputData.brokerName}</p>
                            <p className="text-[10px] text-gray-400 font-mono uppercase">{inputData.organization}</p>
                        </div>
                    </div>
                    <div className="p-10">
                        <div className="flex justify-between items-baseline border-b border-gray-200 pb-2 mb-6">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">1. Trade Area Metrics (10-Min)</h2>
                            <span className="text-[10px] font-mono text-gray-400">SOURCE: LIVE API DATA</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-8 mb-10">
                            <div className="w-full sm:w-1/2 h-56 bg-slate-100 relative overflow-hidden border border-gray-300 shadow-inner rounded-sm flex items-center justify-center">
                                {mapUrl ? (
                                    <img src={mapUrl} alt="Trade Area Map" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                        <div className="z-10 text-center">
                                            <MapPin className="h-8 w-8 text-gray-900 mx-auto mb-2" />
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Drive-Time Analysis<br />Complete</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="w-full sm:w-1/2 grid grid-cols-2 gap-4">
                                <div className="p-3 border-l-2 border-gray-900 bg-gray-50">
                                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Population</p>
                                    <p className="text-xl font-serif font-bold text-gray-900">{metrics.population.toLocaleString()}</p>
                                </div>
                                <div className="p-3 border-l-2 border-gray-300 bg-gray-50">
                                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Med. Income</p>
                                    <p className="text-xl font-serif font-bold text-gray-900">${metrics.median_income.toLocaleString()}</p>
                                </div>
                                <div className="p-3 border-l-2 border-gray-300 bg-gray-50">
                                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Daily Traffic</p>
                                    <p className="text-xl font-serif font-bold text-gray-900">{metrics.traffic_counts.toLocaleString()}</p>
                                </div>
                                <div className="p-3 border-l-2 border-gray-300 bg-gray-50">
                                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Spending Index</p>
                                    <p className="text-xl font-serif font-bold text-gray-900">{metrics.spending_index}</p>
                                </div>
                            </div>
                        </div>
                        <div className="mb-10">
                            <div className="flex justify-between items-baseline border-b border-gray-200 pb-2 mb-4">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">2. Void Analysis</h2>
                                <span className="text-[10px] font-mono text-gray-400">GAP DETECTION</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                {voidAnalysis.map((item, idx) => (
                                    <div key={idx} className={`p-4 rounded border text-center ${item.status === 'Underserved' ? 'bg-red-50 border-red-100' :
                                        item.status === 'Saturated' ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'
                                        }`}>
                                        <p className={`font-bold ${item.status === 'Underserved' ? 'text-red-900' :
                                            item.status === 'Saturated' ? 'text-green-900' : 'text-yellow-900'
                                            }`}>{item.category}</p>
                                        <p className="text-xs opacity-80 mt-1">{item.status}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-baseline border-b border-gray-200 pb-2 mb-4">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">3. High-Fit Targets</h2>
                                <span className="text-[10px] font-mono text-gray-400">TOP 3 RECOMMENDATIONS</span>
                            </div>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-900">
                                        <th className="text-left py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Category</th>
                                        <th className="text-left py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Score</th>
                                        <th className="text-left py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Rationale</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {scores.slice(0, 3).map((score) => (
                                        <tr key={score.category_id}>
                                            <td className="py-4 pr-4 align-top font-bold text-gray-900 text-sm">{score.category_name}</td>
                                            <td className="py-4 align-top">
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-900 text-white">
                                                    {score.total_score} / 100
                                                </span>
                                            </td>
                                            <td className="py-4 align-top">
                                                <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                                                    {score.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                                </ul>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-12 pt-4 border-t border-gray-200 flex justify-between items-center text-[9px] text-gray-400 font-mono">
                            <span>CONFIDENTIAL • INTERNAL USE ONLY</span>
                            <span>GENERATED BY TENANTFIT</span>
                        </div>
                    </div>
                </div>
                <div className="h-12"></div>
            </div>
        </div>
    );
};

export default function App() {
    const [step, setStep] = useState('intake');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reportResult, setReportResult] = useState(null);
    const [formData, setFormData] = useState({
        brokerName: '', organization: '', addressRaw: '', propertyType: '',
        availableSf: '', leasingObjective: 'rent', isVented: false, preferredCategories: [], notes: '',
    });

    const [isGoogleReady, setIsGoogleReady] = useState(false);

    useEffect(() => {
        const checkGoogle = () => {
            if (window.google?.maps?.places) {
                setIsGoogleReady(true);
            }
        };
        checkGoogle();
        const interval = setInterval(checkGoogle, 100);
        return () => clearInterval(interval);
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressSelect = (address) => {
        setFormData(prev => ({ ...prev, addressRaw: address }));
    };

    const toggleCategory = (cat) => {
        setFormData(prev => {
            const exists = prev.preferredCategories.includes(cat);
            return { ...prev, preferredCategories: exists ? prev.preferredCategories.filter(c => c !== cat) : [...prev.preferredCategories, cat] };
        });
    };

    const handleSubmit = async () => {
        if (!formData.addressRaw || !formData.brokerName) {
            alert("Please fill in the required fields (Address, Name).");
            return;
        }
        setStep('loading'); setLoading(true); setError(null);
        try {
            // Send the raw address string to the backend
            const payload = { ...formData, addressData: { formatted_address: formData.addressRaw } };
            const response = await fetch(API_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed to generate report');
            setReportResult(data); setStep('report');
        } catch (err) {
            console.error(err); setError('Could not connect to the analysis engine. Is the local server running?'); setStep('intake');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'report' && reportResult) return <ReportView inputData={formData} resultData={reportResult} onBack={() => setStep('intake')} />;

    if (step === 'loading') return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 font-sans">
            <Loader2 className="h-10 w-10 text-gray-900 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Connecting to Analysis Engine...</h2>
            <p className="text-gray-500 text-sm">Fetching live trade area & scoring tenants.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Building2 className="h-5 w-5 text-gray-900" />
                        <span className="font-bold text-base tracking-tight text-gray-900">TenantFit <span className="text-xs bg-red-100 text-red-600 px-1 rounded ml-1">LIVE</span></span>
                    </div>
                </div>
            </header>
            <main className="max-w-lg mx-auto px-4 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start text-red-700 text-sm">
                        <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <SectionHeader title="1. Property Specs" sub="Define the asset" />
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* {isGoogleReady ? (
              <AddressAutocomplete onSelect={handleAddressSelect} />
            ) : (
              <div className="col-span-2 mb-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Property Address</label>
                <div className="w-full px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-500">
                  Loading Maps...
                </div>
              </div>
            )} */}
                        <div className="col-span-2 mb-4 bg-red-100 p-2">DEBUG: Autocomplete Removed</div>
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Property Type</label>
                            <div className="relative">
                                <select name="propertyType" value={formData.propertyType} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm appearance-none focus:ring-1 focus:ring-gray-900">
                                    <option value="">Select...</option>
                                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <InputField label="Available SF" name="availableSf" value={formData.availableSf} onChange={handleInputChange} placeholder="e.g. 2,500" />
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Infrastructure</label>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, isVented: !prev.isVented }))} className={`w-full py-2.5 px-3 rounded-md text-xs font-bold border flex items-center justify-between transition-all ${formData.isVented ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-300'}`}>
                                <span>{formData.isVented ? 'Restaurant Ready' : 'Dry Use Only'}</span>
                                {formData.isVented ? <ChefHat className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                    <SectionHeader title="2. Broker Context" sub="For the report" />
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <InputField label="Broker Name" name="brokerName" value={formData.brokerName} onChange={handleInputChange} required />
                        <InputField label="Organization" name="organization" value={formData.organization} onChange={handleInputChange} />
                    </div>
                    <SectionHeader title="3. Leasing Objective" />
                    <div className="mb-6 space-y-2">
                        {LEASING_OBJECTIVES.map((obj) => (
                            <div key={obj.value} onClick={() => setFormData(prev => ({ ...prev, leasingObjective: obj.value }))} className={`cursor-pointer rounded border p-3 flex items-center justify-between transition-all ${formData.leasingObjective === obj.value ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div><span className={`block text-sm font-bold ${formData.leasingObjective === obj.value ? 'text-gray-900' : 'text-gray-600'}`}>{obj.label}</span><span className="text-[10px] text-gray-500 uppercase tracking-wide">{obj.desc}</span></div>
                                {formData.leasingObjective === obj.value && <CheckCircle className="h-4 w-4 text-gray-900" />}
                            </div>
                        ))}
                    </div>
                    <SectionHeader title="4. Preferred Categories" sub="Refine the model" />
                    <div className="space-y-4 mb-6">
                        {Object.entries(CATEGORIES).map(([group, items]) => (
                            <div key={group}>
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2">{group}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {items.map(cat => (
                                        <button type="button" key={cat} onClick={() => toggleCategory(cat)} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide border transition-colors ${formData.preferredCategories.includes(cat) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                            {formData.preferredCategories.includes(cat) ? '✓ ' : '+ '}{cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="w-full py-4 bg-gray-900 text-white font-bold text-sm uppercase tracking-wider rounded shadow-lg hover:bg-gray-800 transition-transform active:scale-[0.99] disabled:opacity-50">
                        {loading ? 'Processing...' : 'Run Analysis'}
                    </button>
                </div>
            </main>
        </div>
    );
}
