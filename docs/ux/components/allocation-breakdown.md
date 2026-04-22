# AllocationBreakdown

Source: [client/src/components/dcm/AllocationBreakdown.tsx](../../../client/src/components/dcm/AllocationBreakdown.tsx)

A combined chart + ranking view rendered for the `get_allocations` tool. Shows investor distribution by type (donut) and geography (horizontal bar), plus a top-investors leaderboard. Wrapped in `React.memo`.

## Props

```ts
interface AllocationBreakdownProps {
  deal: { id: string; issuer: string; size: number; oversubscription: number };
  allocations: Allocation[];
  breakdown: {
    byType: BreakdownItem[];      // { type, amount, percentage }
    byGeography: BreakdownItem[]; // { geography, amount, percentage }
  };
  summary: { totalInvestors: number; totalAllocated: number; avgFillRate: number };
}
```

## Visual structure

1. **Emerald gradient header** (issuer + size)
2. **Metric strip** with 3 KPIs (Investors · Oversubscription · Avg Fill Rate)
3. **Two-column chart row**: donut by investor type / horizontal bar by geography
4. **Top Investors** list (5 rows)

## Tailwind / styles

Header (emerald gradient):

```tsx
<div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
  <h3 className="font-semibold">Allocation Breakdown</h3>
  <p className="text-emerald-200 text-xs mt-0.5">{issuer} - €{size}M</p>
</div>
```

Metric strip:

```tsx
<div className="grid grid-cols-3 divide-x divide-stone-200 border-b border-stone-200">
  <Metric label="Investors" value={totalInvestors} valueClass="font-bold text-lg text-stone-800" />
  <Metric label="Oversubscription" value={`${oversubscription}x`} valueClass="font-bold text-lg text-emerald-600" />
  <Metric label="Avg Fill Rate" value={`${avgFillRate}%`} valueClass="font-bold text-lg text-stone-800" />
</div>
```

Charts row:

```tsx
<div className="grid grid-cols-2 gap-4 p-4">
  {/* Donut */}
  <div>
    <h4 className="text-xs font-semibold text-stone-500 mb-2">By Investor Type</h4>
    <div className="h-48"><ResponsiveContainer>…<PieChart>…</PieChart></ResponsiveContainer></div>
    <!-- legend: small color dot + name + percentage -->
  </div>

  {/* Horizontal bar */}
  <div>
    <h4 className="text-xs font-semibold text-stone-500 mb-2">By Geography</h4>
    <div className="h-48"><ResponsiveContainer>…<BarChart layout="vertical">…</BarChart></ResponsiveContainer></div>
  </div>
</div>
```

Top Investors:

```tsx
<div className="px-4 py-3 border-t border-stone-200">
  <h4 className="text-xs font-semibold text-stone-500 mb-2">Top Investors</h4>
  <div className="space-y-1">
    <div className="flex justify-between items-center text-xs py-1 px-2 bg-stone-50 rounded">
      <div>
        <span className="font-medium text-stone-700">{investorName}</span>
        <span className="text-stone-400 ml-2">{investorType}</span>
      </div>
      <div className="text-right">
        <span className="font-semibold text-stone-700">€{allocatedSize}M</span>
        <span className="text-stone-400 ml-2">({fillRatePct}% fill)</span>
      </div>
    </div>
  </div>
</div>
```

## Recharts configuration

Donut:

```tsx
<Pie data={typeData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" isAnimationActive={false}>
  {typeData.map((entry, i) => <Cell fill={entry.color} key={i} />)}
</Pie>
<Tooltip formatter={(v) => [`€${v}M`, 'Allocated']} />
```

Bar:

```tsx
<BarChart data={geoData} layout="vertical">
  <XAxis type="number" tickFormatter={(v) => `€${v}M`} fontSize={10} />
  <YAxis type="category" dataKey="name" fontSize={10} width={40} />
  <Tooltip formatter={(v) => [`€${v}M`, 'Allocated']} />
  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} isAnimationActive={false} />
</BarChart>
```

Animations are disabled across both charts.

## Color usage

- Header: emerald gradient (positive / oversubscription accent)
- Donut palette: same `COLORS` array as [ChartCard](chart-card.md) — `['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']`
- Geography bars: blue-500 (`#3B82F6`)
- Oversubscription metric: emerald-600

## Icons

None.

## Performance

`React.memo`. Recharts animations are disabled (`isAnimationActive={false}`) since this component re-renders frequently while the streamed assistant message is updating.
