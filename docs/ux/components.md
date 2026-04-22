# Components — Conventions & Shared Patterns

This is the source-of-truth for the **patterns every card uses**, so new components stay visually consistent. Per-component implementation detail lives in [components/](components/).

If you take one thing from this document: **almost everything the assistant renders is a `Card` — a white surface with a stone border, rounded corners, a subtle shadow, and a header strip.**

## 1. The Card shell

The base pattern, used by `TableCard`, `ChartCard`, `FilterForm`, `IssuerTimeline`, `MarketIssuance`, and the inner shell of every DCM card:

```tsx
<div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
  <h3 className="m-0 px-4 py-3 text-sm font-semibold bg-stone-100 border-b border-stone-200 text-stone-700">
    {title}
  </h3>
  {/* body */}
</div>
```

Notes on each utility:

- `mt-3` — built-in vertical separation so consecutive tool results breathe
- `bg-white` — every card surface
- `border border-stone-200` — hairline border (matches the chrome `#E5E5E3` in tone)
- `rounded-lg` (8px) — universal card radius
- `overflow-hidden` — clips the gradient/stone header to the rounded corners
- `shadow-sm` — soft 1px shadow

The header strip is fixed at `text-sm font-semibold text-stone-700` over a `bg-stone-100` background.

## 2. The Gradient-header card

DCM domain cards swap the stone header for a saturated 2-stop gradient with white text. The shell stays the same.

```tsx
<div className="px-4 py-3 bg-gradient-to-r from-{hue}-600 to-{hue}-700 text-white">
  <div className="flex justify-between items-start">
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-{hue}-200 text-xs mt-0.5">{subtitle}</p>
    </div>
    {/* optional right-aligned meta */}
  </div>
</div>
```

The hue **carries semantic meaning** — see the gradient table in [colors.md](colors.md#gradient-headers).

## 3. The Metric strip

A horizontal row of small KPIs sitting directly under a card header. Used by `DealCard`, `AllocationBreakdown`, `SecondaryPerformanceView`, and `MarketIssuance` (slightly different).

```tsx
<div className="grid grid-cols-4 divide-x divide-stone-200 border-b border-stone-200">
  <div className="px-3 py-2 text-center">
    <div className="text-xs text-stone-500">{label}</div>
    <div className="font-semibold text-stone-800">{value}</div>
  </div>
  {/* …more cells */}
</div>
```

Variants:

- **Centered cells**: `text-center` (default)
- **Tile metrics**: `MarketIssuance` uses individual rounded tiles (`bg-stone-50 rounded-lg p-3 text-center`) rather than a divided grid
- **Larger numbers**: dashboard cards use `font-bold text-lg` for the value
- **Color-coded values**: positive deltas → `text-emerald-600`; negative deltas → `text-red-600` / `text-rose-600`

## 4. State chips (pills)

Small inline status indicators. The pattern:

```tsx
<span className="text-xs px-1.5 py-0.5 rounded bg-{hue}-100 text-{hue}-700">
  {label}
</span>
```

Common bucketed example (NIP coloring in `IssuerTimeline`):

```tsx
<span className={`text-xs px-1.5 py-0.5 rounded ${
  deal.nip <= 5  ? 'bg-emerald-100 text-emerald-700' :
  deal.nip <= 10 ? 'bg-amber-100 text-amber-700'    :
                   'bg-red-100 text-red-700'
}`}>
  NIP: {deal.nip}bps
</span>
```

The trend chip in the Dashboard's `SecondaryView` uses a wider `px-2 py-0.5` plus a leading Unicode arrow:

```tsx
<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
  trend === 'Tightening' ? 'bg-emerald-100 text-emerald-700' :
  trend === 'Widening'   ? 'bg-rose-100 text-rose-700'       :
                           'bg-stone-100 text-stone-700'
}`}>{glyph} {trend}</span>
```

Filter sector chips (`MarketIssuance`) use the rounded-full variant:

```tsx
<span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
  {sector}: {count} ({percentage}%)
</span>
```

## 5. Buttons

Three button styles cover almost every action in the app.

### Primary — domain action (blue)

```tsx
<button className="px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
  Submit
</button>
```

Used in `FilterForm` and `ApprovalCard`. Full-width variant: add `w-full`.

### Brand-dark — primary chat actions

```tsx
<button className="bg-[#1A1A1A] text-white hover:bg-stone-700 transition-colors disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed">
```

Used for: chat send button, login Continue, active dashboard tab. Often paired with `rounded-full` (icon button), `rounded-xl` (login), or `rounded-lg` (tab).

### Secondary / ghost

```tsx
<button className="bg-white text-stone-600 border border-stone-300 rounded-md hover:bg-stone-50 hover:border-stone-400 focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-colors">
  Cancel
</button>
```

Used for the `Cancel` button in `ApprovalCard`.

### Icon button (rail / input)

```tsx
<button className="w-10 h-10 rounded-lg hover:bg-[#E5E5E3] flex items-center justify-center transition-colors" title="…">
  <svg className="w-5 h-5 text-stone-600">…</svg>
</button>
```

Smaller variant `p-2 rounded-lg hover:bg-stone-100` is used inside the chat input bar.

### Destructive

There is no full destructive button. The only red action is the **Stop generation** button in the chat input:

```tsx
<button className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors">
```

## 6. Inline result strips

Small full-width status messages rendered after a tool runs. Pattern:

```tsx
<div className="mt-2 px-3 py-2 bg-{hue}-50 border border-{hue}-200 rounded-lg text-sm text-{hue}-700">
  {message}
</div>
```

Use cases:

- Filter applied confirmation → `emerald`
- "No results found" / "No matches for X" → `amber`
- Tool error → `red`
- Generic info / "Action approved" → `bg-stone-100 text-stone-600` (no border)

These are emitted directly from [client/src/App.tsx](../../client/src/App.tsx) when handling `tool-invocation` results.

## 7. Loading states

There are three flavours, depending on context:

1. **Inline italic line** (most common — a tool is still pending):

   ```tsx
   <div className="italic text-stone-500 py-2">Querying employees...</div>
   ```

2. **Spinner + label** (top-level chat busy state):

   ```tsx
   <div className="self-start flex items-center gap-2 text-stone-400 text-sm">
     <svg className="animate-spin h-4 w-4">…</svg>
     <span>Thinking...</span>
   </div>
   ```

3. **Tailwind ring spinner** (dashboard data fetches):

   ```tsx
   <div className="animate-spin h-6 w-6 border-2 border-stone-300 border-t-stone-600 rounded-full" />
   ```

## 8. Empty states

```tsx
<div className="py-6 text-center text-stone-400 italic text-sm">
  No data available
</div>
```

Variants in code: `No data available` (`TableCard`), `No deals found` (`IssuanceView`), `No allocation data available` (`AllocationsView`), `No chat history yet` (History flyover).

## 9. Tables (inside cards)

The reusable `<table>` pattern that appears in `TableCard`, `ComparableDealsPanel`, `MarketIssuance`, and the dashboard views:

```tsx
<table className="w-full border-collapse text-sm">
  <thead>
    <tr className="bg-stone-50 border-b border-stone-200">
      <th className="px-3 py-2.5 text-left text-xs font-semibold text-stone-600 whitespace-nowrap sticky top-0 z-10">
        {col}
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
      <td className="px-3 py-2.5 text-stone-600">{value}</td>
    </tr>
  </tbody>
</table>
```

Header row variants:

- Plain stone header for generated tables: `bg-stone-50 border-b border-stone-200` with `text-xs font-semibold text-stone-600`
- Uppercase eyebrow header for `MarketIssuance`: `bg-stone-50 text-stone-600 text-xs uppercase`
- Brand header for dashboard tables: `bg-[#F5F5F3] border-b border-[#E5E5E3]` with `font-medium text-stone-600`

Numeric columns are right-aligned (`text-right`), text columns are left-aligned (`text-left`), trend/chip columns are centered (`text-center`).

## 10. Forms

`FilterForm` defines the field pattern reused for any input collection:

```tsx
<div className="flex flex-col gap-1">
  <label className="text-xs font-semibold text-stone-500">{label}</label>
  <input
    type="text"
    className="px-3 py-2.5 text-sm border border-stone-300 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
  />
</div>
```

`<select>` uses the same classes plus `bg-white`. Date inputs use `type="date"` with the same shell.

## 11. Recharts conventions

Chart colors live in `COLORS` arrays defined inside the chart components ([ChartCard](../../client/src/components/ChartCard.tsx) and [AllocationBreakdown](../../client/src/components/dcm/AllocationBreakdown.tsx)). They share the same hex values — see [colors.md#chart-palette](colors.md#chart-palette).

Standardised props:

- Grid: `<CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />`
- Axis ticks: `tick={{ fontSize: 10-11, fill: '#78716c' }}`
- Tooltip:
  ```tsx
  contentStyle={{
    backgroundColor: '#fff',
    border: '1px solid #e7e5e4',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  }}
  ```
- Reference lines (issue spread / reoffer): `stroke="#9CA3AF" strokeDasharray="3 3"`
- Animations: **enabled** with `animationDuration={500}` in the generic `ChartCard`; **disabled** (`isAnimationActive={false}`) in DCM views to keep them snappy.

## 12. Performance — memoization

DCM cards that render a lot of data are wrapped in `React.memo`:

```tsx
export const IssuerTimeline = React.memo(function IssuerTimeline(props) { … });
```

This applies to: `IssuerTimeline`, `ComparableDealsPanel`, `AllocationBreakdown`, `SecondaryPerformanceView`, `MarketIssuance`. Generic cards (`TableCard`, `ChartCard`, `FilterForm`, `ApprovalCard`, `EntityPicker`, `DealCard`, `ExportPanel`) are not memoised.

The `useChat` hook's `messages` array is rebuilt on each token while streaming, so memoising stable card props avoids re-rendering the rich `Recharts` trees.

## 13. Naming conventions

- Components live as PascalCase files inside [client/src/components/](../../client/src/components/)
- Generic re-usable cards live at the top level of `components/`
- Domain cards live under `components/dcm/` and are re-exported through [client/src/components/dcm/index.ts](../../client/src/components/dcm/index.ts)
- Dashboard tab views live under `components/dashboard/`
- Tool-driven components are referenced **only** through the `App.tsx` switch — they are never imported elsewhere
