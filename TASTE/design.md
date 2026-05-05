# TenantFit — Design System
# Read this before touching any UI element.
# This is the override for all visual decisions.
# ─────────────────────────────────────────

## What This UI Is

TenantFit is a B2B professional tool used by commercial real estate
brokers. The report it generates gets handed to clients and tenant
prospects. The visual language must read as authoritative data output,
not as a consumer SaaS app or a startup marketing page.

The benchmark aesthetic: Bloomberg Terminal meets an institutional
research report. Dense, precise, monochrome-first. Every visual
element exists to make the data more readable, not to make the
software look impressive.

## Core Palette

```
Background (report body):   #FFFFFF — white only
Background (app shell):     gray-800 / gray-700 (bg-gray-800, bg-gray-700/50)
Header / primary surface:   gray-900 (#111827)
Primary text:               gray-900 (#111827)
Secondary text:             gray-500 (#6B7280)
Labels / metadata:          gray-400 (#9CA3AF)
Border (heavy):             gray-900 — used for section dividers that matter
Border (light):             gray-200 — used for row separators
Data highlight bg:          gray-50 (#F9FAFB)
Accent (status only):
  Underserved:              red-50 bg / red-900 text / red-100 border
  Saturated:                green-50 bg / green-900 text / green-100 border
  Balanced:                 yellow-50 bg / yellow-900 text / yellow-100 border
CTA / score badge:          gray-900 bg / white text
Action button (primary):    gray-900 bg / white text / hover: gray-800
Action button (selected):   gray-900 bg / white text / ring-1 ring-gray-900
Action button (unselected): white bg / gray-500 text / border-gray-200
```

**The rule on color:** When in doubt, use less. Monochrome with
typographic hierarchy communicates data authority. Color is reserved
for status signals (underserved / saturated / balanced) only.
Do not add brand color, gradient, or decorative use of color.

## Typography

```
Font family:        font-sans (system sans-serif for UI), font-serif (data numbers)
Report heading:     font-serif text-3xl font-bold — used for "Tenant Fit Analysis" title
Data numbers:       font-serif font-bold text-xl — population, income, traffic, index
Section headers:    text-sm font-bold uppercase tracking-widest text-gray-900
Column labels:      text-[10px] font-bold uppercase tracking-widest text-gray-500
Metadata / source:  text-[10px] font-mono text-gray-400 uppercase tracking-wider
Body / rationale:   text-xs text-gray-600
Footer:             text-[9px] text-gray-400 font-mono uppercase
```

**The rule on type:** Labels are always uppercase + tracking-widest.
Data values are always serif + bold. This contrast between label and
value is the single most important typographic pattern in the product.
Never break it.

## Wordmark

```
TENANT (font-bold) + FIT (font-light) — in one span, no space
Color: text-gray-900
Icon: Building2 (lucide-react), h-6 w-6, same color
Usage: Always paired. Never icon alone in header context.
```

Do not change the wordmark treatment without explicit instruction.

## Report Layout

The report renders as a white A4-proportion card (max-w-[210mm])
centered in a dark gray shell. This simulates a printed document
viewed on screen. It should always feel like a document, not a webpage.

```
Outer shell:        bg-gray-700/50 backdrop-blur-sm — do not remove the blur
Report card:        bg-white shadow-2xl — preserve the shadow, it creates document depth
Report padding:     px-10 pt-10 pb-6 — do not reduce horizontal padding
Section divider:    border-b border-gray-200 pb-2 mb-4 with section label left + source tag right
Data grid:          px-10 py-4 bg-gray-50 border-y-2 border-gray-900 — the heavy border is intentional
```

**Section structure (always):**
```
<div class="flex justify-between items-baseline border-b border-gray-200 pb-2 mb-4">
  <h2 class="text-sm font-bold uppercase tracking-widest text-gray-900">N. Section Title</h2>
  <span class="text-[10px] font-mono text-gray-400">SOURCE TAG</span>
</div>
```
Number every section. Source tag always right-aligned. This is non-negotiable.

## Scoring Display

```
Score badge:        inline-flex px-2 py-1 rounded text-xs font-bold bg-gray-900 text-white
Format:             "[score] / 100" — not "/10", not a percentage
Rationale:          ul list-disc pl-4 text-xs text-gray-600 space-y-1
Disqualified rows:  still appear in table, score shows 0/100, reason explains gate
Top 3 only:         scores.slice(0, 3) in the main report table
```

Do not change score format. Brokers reference the "/100" scale when
discussing properties with clients. Consistency matters.

## Form (Intake) Design

```
Inputs:             px-3 py-2.5 border border-gray-300 rounded-md text-sm
                    focus:ring-1 focus:ring-gray-900 focus:border-gray-900
Labels:             text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5
Select:             same as input + appearance-none + ChevronDown icon right
Toggle button:      full-width, two states — gray-900 active / gray-300 inactive
                    shows ChefHat icon when vented, X icon when dry use
Category chips:     px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide
                    selected: bg-gray-900 text-white / unselected: white bg gray-500 text
Section headers:    border-b border-gray-200 pb-1, title left + subtitle right
Submit button:      w-full py-4 bg-gray-900 text-white font-bold text-sm uppercase
                    tracking-wider rounded shadow-lg — do not shrink this button
```

## Map Display

```
Container:          w-1/2 h-56 bg-slate-100 border border-gray-300 shadow-inner rounded-sm
Image:              w-full h-full object-cover
Loading state:      centered Loader2 spinner (animate-spin) + text-[10px] uppercase label
Fallback:           always show something — never an empty white box
Map style:          Mapbox light-v10 — do not change to satellite or dark
Overlay color:      #3b82f6 fill at 0.3 opacity, #2563eb stroke — blue isochrone ring
```

## Navigation / Header (App Shell)

```
Header:             bg-gray-900 text-white px-4 py-3 shadow-lg sticky top-0 z-50
Back button:        text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-white
                    with ArrowLeft icon h-3 w-3
Report ID:          text-xs font-mono text-gray-500 — hidden on mobile (hidden sm:block)
Download CTA:       bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded
                    text-xs font-bold uppercase tracking-wide + Download icon
```

The blue Download button is the only blue element in the product.
It is intentionally the single CTA in the report view. Do not add
other blue elements — it dilutes the visual hierarchy.

## Animation

```
Report entry:       animate-in fade-in zoom-in-95 duration-300
Loading spinner:    Loader2 animate-spin
Transitions:        transition-colors on buttons, transition-all on inputs
Active states:      active:scale-[0.99] on submit button — subtle press feedback
```

Keep animations minimal. The product must feel fast and precise,
not playful.

## Status Colors (Void Analysis)

These are the only meaningful use of non-neutral color in the product.
Do not add additional status colors or repurpose these for other uses.

```
Underserved (opportunity):
  bg-red-50 border-red-100 text-red-900
  Label: "Underserved" — opportunity framing, not warning framing

Saturated (no gap):
  bg-green-50 border-green-100 text-green-900
  Label: "Saturated"

Balanced (neutral):
  bg-yellow-50 border-yellow-100 text-yellow-900
  Label: "Balanced"
```

Note: Red = opportunity in this context (market gap). Green = saturated.
This is intentional and counterintuitive to non-CRE audiences.
Do not reverse it.

## Icons

Source: lucide-react only. No other icon library.
Current usage:
```
MapPin        — address field prefix
CheckCircle   — selected leasing objective
X             — dry use infrastructure / close states
Loader2       — loading spinner (always animate-spin)
Building2     — wordmark icon
ChevronDown   — select dropdowns
ArrowLeft     — back navigation
Download      — PDF download CTA
ChefHat       — vented/restaurant-ready infrastructure
AlertTriangle — error state
Store         — dry use infrastructure (alternative to X in some contexts)
```

Add new icons from lucide-react only. Keep icon sizes consistent:
h-3 w-3 (inline with xs text), h-4 w-4 (standard), h-5 w-5 (header),
h-6 w-6 (wordmark).

## Footer (Report)

```
mt-12 pt-4 border-t border-gray-200 flex justify-between items-center
text-[9px] text-gray-400 font-mono

Left:   "CONFIDENTIAL • INTERNAL USE ONLY"
Right:  "GENERATED BY TENANTFIT"
```

Always include this footer on generated reports. It sets the professional
register and signals to the broker that this is a document they can share.

## What This Product Must Never Look Like
- Generic SaaS dashboard with rounded cards and purple/blue gradients
- Consumer wellness or lifestyle app aesthetic
- Startup landing page (hero image, large headline, social proof logos)
- A spreadsheet dump without visual hierarchy
- Anything that looks like it was built in a weekend hackathon

The test: could a broker slide this across a conference table to a
Whole Foods real estate director without apology? If not, fix it.
