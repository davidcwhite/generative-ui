# Dashboard Views

The Dashboard is the **non-AI** counterpart to the chat — three tabs that fetch directly from REST endpoints and render with the brand-chrome styles (`#FAFAF8`, `#F5F5F3`, `#E5E5E3`) rather than the chat's stone palette. The shell is documented in [layout.md#dashboard-shell](../layout.md#dashboard-shell); this file covers the three tabs.

All three views follow the same skeleton:

```tsx
useEffect(() => fetch(`/api/data/...`)) // load on mount
if (loading) return <Spinner />
if (error)   return <ErrorMessage />
return <ViewBody />
```

with these shared elements:

- Loading: `flex items-center justify-center py-12` with the ring spinner `animate-spin h-6 w-6 border-2 border-stone-300 border-t-stone-600 rounded-full`
- Error: `text-center py-12 text-stone-500`
- Section header: `text-xl font-semibold text-[#1A1A1A]` + `text-sm text-stone-500` description, with `mb-6` separation
- Card surface: `bg-white border border-[#E5E5E3] rounded-xl` (note `rounded-xl` here, not the `rounded-lg` of the chat cards)

## IssuanceView

Source: [client/src/components/dashboard/IssuanceView.tsx](../../../client/src/components/dashboard/IssuanceView.tsx)

Endpoint: `GET /api/data/deals` → `{ deals: Deal[] }`

### Visual structure

- Section header: `Recent Issuance` / `Latest bond deals across all issuers`
- Single full-width table inside a `rounded-xl` card
- Empty state: `<div className="text-center py-8 text-stone-500">No deals found</div>`

### Tailwind / styles

Header row:

```tsx
<thead>
  <tr className="bg-[#F5F5F3] border-b border-[#E5E5E3]">
    <th className="text-left px-4 py-3 font-medium text-stone-600">Date</th>
    <!-- Issuer · ISIN · Size · Tenor · Coupon · Spread · NIP · Overs. -->
  </tr>
</thead>
```

Body rows:

```tsx
<tr className="border-b border-[#E5E5E3] hover:bg-[#FAFAF8] transition-colors">
  <td className="px-4 py-3 text-stone-600">{date}</td>
  <td className="px-4 py-3 font-medium text-[#1A1A1A]">{issuer}</td>
  <td className="px-4 py-3 text-stone-500 font-mono text-xs">{isin}</td>
  …
  <td className={`px-4 py-3 text-right font-medium ${nipColor}`}>{nip}bps</td>
  <td className="px-4 py-3 text-right text-stone-600">{oversub}x</td>
</tr>
```

NIP coloring (note: uses **rose** instead of red, matching the dashboard's color register):

```ts
deal.nip <= 5  ? 'text-emerald-600' :
deal.nip <= 10 ? 'text-amber-600'   :
                 'text-rose-600'
```

### Notes

- All numeric columns are `text-right` except Tenor which is `text-center`
- Issuer cell uses brand text `text-[#1A1A1A]` for emphasis
- ISIN cell uses `font-mono text-xs text-stone-500`

## AllocationsView

Source: [client/src/components/dashboard/AllocationsView.tsx](../../../client/src/components/dashboard/AllocationsView.tsx)

Endpoint: `GET /api/data/allocations` → `{ allocations: AllocationSummary[] }`

### Visual structure

- Section header: `Allocation Summary` / `Investor allocation breakdown by deal`
- Responsive grid of cards (1 / 2 / 3 columns):

  ```tsx
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  ```

  > This is the **only** place in the app that uses the `lg:` breakpoint.

- Empty state: `text-center py-12 text-stone-500` with `No allocation data available`

### Card structure

```tsx
<div className="bg-white border border-[#E5E5E3] rounded-xl p-5 hover:shadow-md transition-shadow">
  <div className="flex justify-between items-start mb-4">
    <div>
      <h3 className="font-semibold text-[#1A1A1A]">{issuerName}</h3>
      <p className="text-xs text-stone-500 mt-0.5">€{size}M</p>
    </div>
    <span className="text-emerald-600 font-semibold text-sm">{oversubscription}x</span>
  </div>

  <div className="space-y-2">
    {topInvestorTypes.map(inv => (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-[#E5E5E3] rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${inv.percentage}%` }} />
        </div>
        <span className="text-xs text-stone-600 w-24 text-right">{inv.type}</span>
        <span className="text-xs font-medium text-stone-800 w-10 text-right">{inv.percentage}%</span>
      </div>
    ))}
  </div>
</div>
```

### Notes

- Card hover: `hover:shadow-md transition-shadow` — promotes the card subtly
- Progress bar: `h-2` (8px) inside `bg-[#E5E5E3] rounded-full`, fill `bg-blue-500 rounded-full` with inline `width: ${pct}%`
- Numeric labels are right-aligned and width-locked (`w-10`, `w-24`) to keep rows perfectly aligned

## SecondaryView

Source: [client/src/components/dashboard/SecondaryView.tsx](../../../client/src/components/dashboard/SecondaryView.tsx)

Endpoint: `GET /api/data/secondary` → `{ secondary: SecondaryData[] }`

### Visual structure

- Section header: `Secondary Performance` / `Spread drift and trading activity`
- Single full-width table inside a `rounded-xl` card

### Drift coloring

Same logic as `SecondaryPerformanceView` — negative drift (tighter spread) is good:

```ts
spreadDrift < 0 ? 'text-emerald-600' :
spreadDrift > 0 ? 'text-rose-600'    :
                  'text-stone-600'
```

The cell shows a leading `+` when positive:

```tsx
{item.spreadDrift > 0 ? '+' : ''}{item.spreadDrift}bps
```

### Trend chip with Unicode arrow

```tsx
<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
  item.trend === 'Tightening' ? 'bg-emerald-100 text-emerald-700' :
  item.trend === 'Widening'   ? 'bg-rose-100 text-rose-700'        :
                                 'bg-stone-100 text-stone-700'
}`}>
  {item.trend === 'Tightening' && '↓'}
  {item.trend === 'Widening'   && '↑'}
  {item.trend === 'Stable'     && '→'}
  {item.trend}
</span>
```

This is the **only** place the app uses Unicode arrows instead of the SVG trend icons used in `SecondaryPerformanceView` (the chat-mode equivalent). See [icons.md#trend-glyph-fallback](../icons.md#trend-glyph-fallback).

### Avg Volume formatting

Volume is divided down to millions before display:

```tsx
€{(item.avgVolume / 1000000).toFixed(1)}M
```

## Why dashboard styles differ from chat-card styles

| | Chat-card cards | Dashboard cards |
|---|---|---|
| Border | `border-stone-200` | `border-[#E5E5E3]` |
| Radius | `rounded-lg` | `rounded-xl` |
| Header | `bg-stone-100` (or gradient) | `bg-[#F5F5F3]` table header / no header strip on grid cards |
| Hover row | `hover:bg-stone-50` | `hover:bg-[#FAFAF8]` |
| Risk hue | `red` | `rose` |

The dashboard intentionally uses the **chrome** palette (`#E5E5E3`, `#F5F5F3`, `#FAFAF8`) to feel like part of the surrounding shell, while chat cards use the warmer **stone** palette to read as discrete, generated artefacts that float on the page.
