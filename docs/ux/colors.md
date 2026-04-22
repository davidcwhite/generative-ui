# Colors

Primary Flow uses a near-monochrome **stone** palette for chrome plus a small set of saturated accent hues reserved for state and DCM domain headers. Tailwind v4 (no custom theme file) is used, with a few hard-coded hex values for the brand surfaces.

## Brand colors (hard-coded hex)

These appear as `bg-[#1A1A1A]`, `bg-[#FAFAF8]`, etc. in [client/src/App.tsx](../../client/src/App.tsx) and [client/src/components/Dashboard.tsx](../../client/src/components/Dashboard.tsx):

| Token | Hex | Usage |
|---|---|---|
| Brand near-black | `#1A1A1A` | Logo tile, primary CTA (`Send`), active nav text, H1 headings |
| App surface | `#FAFAF8` | Page background, sticky header (with `/80 backdrop-blur-sm`) |
| Rail / panel surface | `#F5F5F3` | Mobile header strip, desktop rail sidebar |
| Hairline border | `#E5E5E3` | All borders inside the shell (rail, header, drawer, dashboard cards) |
| Hover surface (rail) | `#E5E5E3` | Hover state for rail icon buttons |
| Hover input border | `#D5D5D3` | Focus-within border on the chat input |

> Note: the favicon also uses `#1A1A1A` (background) and `#FAFAF9` (text) — see the inline SVG in [client/index.html](../../client/index.html).

## Stone palette (Tailwind)

Used everywhere for text, surfaces, borders, and dividers. Hex values reproduced from `index.css` comments and Tailwind defaults:

| Class | Hex | Common use |
|---|---|---|
| `stone-50` | `#fafaf9` | Subtle hover on table rows, ApprovalCard surface |
| `stone-100` | `#f5f5f4` | Card header strip, secondary buttons, info chips |
| `stone-200` | `#e7e5e4` | Card borders, dividers (`divide-x divide-stone-200`) |
| `stone-300` | `#d6d3d1` | Form input borders, blockquote rule |
| `stone-400` | `#a8a29e` | Placeholder text, disabled icons, eyebrow labels |
| `stone-500` | `#78716c` | Caption text, axis ticks |
| `stone-600` | `#57534e` | Body / table cell text |
| `stone-700` | `#44403c` | Card headers, default text on light surfaces |
| `stone-800` | `#292524` | Headings, important values |
| `stone-900` | `#1c1917` | User-message strong text |

## Semantic state colors

Colors are used **meaningfully**: each hue has a single role across the app.

### Emerald — positive / tightening / oversubscription

Examples:

- Oversubscription multiplier in [client/src/components/dcm/IssuerTimeline.tsx](../../client/src/components/dcm/IssuerTimeline.tsx) (`text-emerald-600`)
- Trend = `Tightening` in [client/src/components/dcm/SecondaryPerformanceView.tsx](../../client/src/components/dcm/SecondaryPerformanceView.tsx)
- Filter applied confirmation in [client/src/App.tsx](../../client/src/App.tsx) (`bg-emerald-50 border-emerald-200 text-emerald-700`)
- AllocationBreakdown gradient header (`from-emerald-600 to-emerald-700`)

Tones used: `emerald-50`, `emerald-100`, `emerald-200`, `emerald-600`, `emerald-700`.

### Amber / orange — caution / pending decisions

Examples:

- "No results" warnings (`bg-amber-50 border-amber-200 text-amber-700`)
- Mid-range NIP chip in IssuerTimeline (`bg-amber-100 text-amber-700`)
- EntityPicker disambiguation header (`bg-amber-50 border-amber-200 text-amber-800`)
- ExportPanel gradient header (`from-amber-500 to-orange-500`)

### Red / rose — risk / widening / errors

Examples:

- Tool error banner in App.tsx (`bg-red-50 border-red-200 text-red-700`)
- Stop-generation button (`bg-red-500 hover:bg-red-600`)
- High-NIP chip (`bg-red-100 text-red-700`)
- Trend = `Widening` (`text-red-600`)
- High-risk badge in [client/src/components/ApprovalCard.tsx](../../client/src/components/ApprovalCard.tsx) uses `bg-rose-500` + `text-rose-700`

Note: `rose` is reserved for the ApprovalCard and Dashboard NIP indicators; everything else uses `red`.

### Blue — primary action / info / neutral chart series

Examples:

- Primary buttons in FilterForm and ApprovalCard (`bg-blue-600 hover:bg-blue-700`)
- Active highlight rows in tables (`bg-blue-50` for the issuer row in ComparableDealsPanel)
- Login input focus ring (`focus:ring-blue-100`)
- DealCard gradient header (`from-blue-600 to-blue-700`)
- AllocationsView progress bars (`bg-blue-500`)
- Markdown link color (`#2563eb`)

### Indigo — peer comparison context

Used only by [client/src/components/dcm/ComparableDealsPanel.tsx](../../client/src/components/dcm/ComparableDealsPanel.tsx):

- Header gradient `from-indigo-600 to-indigo-700`
- Insight strip `bg-indigo-50 border-indigo-100 text-indigo-800`

### Violet — secondary performance

Used only by [client/src/components/dcm/SecondaryPerformanceView.tsx](../../client/src/components/dcm/SecondaryPerformanceView.tsx):

- Header gradient `from-violet-600 to-violet-700`
- Spread chart line (`stroke="#8B5CF6"`)

## Gradient headers

Rich DCM cards use a left→right two-stop gradient with white text:

```tsx
<div className="px-4 py-3 bg-gradient-to-r from-{hue}-600 to-{hue}-700 text-white">
  <h3 className="font-semibold">{title}</h3>
  <p className="text-{hue}-200 text-xs mt-0.5">{subtitle}</p>
</div>
```

| Component | Hue |
|---|---|
| [DealCard](../../client/src/components/dcm/DealCard.tsx) | `blue` |
| [ComparableDealsPanel](../../client/src/components/dcm/ComparableDealsPanel.tsx) | `indigo` |
| [AllocationBreakdown](../../client/src/components/dcm/AllocationBreakdown.tsx) | `emerald` |
| [SecondaryPerformanceView](../../client/src/components/dcm/SecondaryPerformanceView.tsx) | `violet` |
| [ExportPanel](../../client/src/components/dcm/ExportPanel.tsx) | `from-amber-500 to-orange-500` |

Plain stone-100 headers are used for "data" cards without a domain accent (e.g. `IssuerTimeline`, `MarketIssuance`, `TableCard`, `ChartCard`, `FilterForm`).

## Chart palette

Defined in [client/src/components/ChartCard.tsx](../../client/src/components/ChartCard.tsx) (and duplicated with same hex in [client/src/components/dcm/AllocationBreakdown.tsx](../../client/src/components/dcm/AllocationBreakdown.tsx)):

```ts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
```

Translated:

1. Blue 500 `#3b82f6`
2. Emerald 500 `#10b981`
3. Amber 500 `#f59e0b`
4. Red 500 `#ef4444`
5. Violet 500 `#8b5cf6`
6. Cyan 500 `#06b6d4`
7. Orange 500 `#f97316`
8. Pink 500 `#ec4899`

Recharts axis ticks use `#78716c` (stone-500); grid lines use `#e7e5e4` (stone-200).

## Reference lines / dashed strokes

Reference lines in [client/src/components/dcm/SecondaryPerformanceView.tsx](../../client/src/components/dcm/SecondaryPerformanceView.tsx) use `stroke="#9CA3AF"` (Tailwind `gray-400`) with `strokeDasharray="3 3"`.

## Backdrops & overlays

- Mobile drawer backdrop: `bg-black/50` (50% black) — see [client/src/App.tsx](../../client/src/App.tsx).
- Sticky header transparency: `bg-[#FAFAF8]/80 backdrop-blur-sm`.
- User-message inline `<code>`: `rgba(0, 0, 0, 0.08)` (defined in `index.css`).
