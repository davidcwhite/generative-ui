# SecondaryPerformanceView

Source: [client/src/components/dcm/SecondaryPerformanceView.tsx](../../../client/src/components/dcm/SecondaryPerformanceView.tsx)

A spread / price secondary-trading view rendered for the `get_performance` tool. Shows current spread / price / change vs reoffer plus two time-series charts. Wrapped in `React.memo`.

## Props

```ts
interface SecondaryPerformanceViewProps {
  bond: { isin: string; issuer: string; coupon: number; tenor: string };
  pricing: { issueSpread: number; reoffer: number };
  current: { spread: number; price: number; trend: 'Tightening' | 'Widening' | 'Stable' };
  performance: { spreadChange: number; priceChange: number };
  timeline: { date: string; spread: number; price: number }[];
}
```

## Visual structure

1. **Violet gradient header** with bond identifier on the left, ISIN badge on the right
2. **Metric strip** — Current Spread / Current Price / Trend / vs Reoffer (4 cells)
3. **Spread Evolution chart** (line) with reference line at issue spread
4. **Price Performance chart** (area) with reference line at reoffer (par = 100)

## Tailwind / styles

Header (violet gradient):

```tsx
<div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white">
  <div className="flex justify-between items-start">
    <div>
      <h3 className="font-semibold">Secondary Performance</h3>
      <p className="text-violet-200 text-xs mt-0.5">{issuer} {coupon}% {tenor}</p>
    </div>
    <div className="text-right">
      <span className="text-xs bg-white/20 px-2 py-1 rounded font-mono">{isin}</span>
    </div>
  </div>
</div>
```

Metric strip:

```tsx
<div className="grid grid-cols-4 divide-x divide-stone-200 border-b border-stone-200">
  <Metric label="Current Spread" value={`${spread}bps`} valueClass="font-bold text-stone-800" />
  <Metric label="Current Price" value={`${price}`} valueClass="font-bold text-stone-800" />
  <Metric label="Trend">
    <div className={`flex items-center justify-center gap-1 font-bold ${trendColor}`}>
      {trendIcon} {trend}
    </div>
  </Metric>
  <Metric label="vs Reoffer">
    <div className={`font-bold ${priceChangeColor}`}>
      {priceChange > 0 ? '+' : ''}{priceChange}
    </div>
  </Metric>
</div>
```

`trendColor` mapping (also see [components.md#4-state-chips-pills](../components.md#4-state-chips-pills)):

```ts
trend === 'Tightening' ? 'text-emerald-600' :
trend === 'Widening'   ? 'text-red-600'     :
                         'text-stone-600'
```

Spread chart container:

```tsx
<div className="px-4 py-3 border-b border-stone-200">
  <div className="flex justify-between items-center mb-2">
    <h4 className="text-xs font-semibold text-stone-500">Spread Evolution</h4>
    <div className="text-xs">
      <span className="text-stone-500">Change: </span>
      <span className={`font-semibold ${spreadChangeColor}`}>{spreadChange > 0 ? '+' : ''}{spreadChange} bps</span>
    </div>
  </div>
  <div className="h-32"><ResponsiveContainer>…<LineChart>…</LineChart></ResponsiveContainer></div>
</div>
```

Sign convention: **negative spread change is positive** (tighter spreads), so colors invert:

```ts
spreadChange < 0 ? 'text-emerald-600' :
spreadChange > 0 ? 'text-red-600'     :
                   'text-stone-600'
```

Price colors do **not** invert (positive change = positive color).

## Recharts configuration

Spread chart:

```tsx
<LineChart data={timeline} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
  <XAxis dataKey="date" tickFormatter={…} fontSize={10} stroke="#9CA3AF" />
  <YAxis fontSize={10} stroke="#9CA3AF" tickFormatter={(v) => `${v}bps`} domain={['auto', 'auto']} />
  <Tooltip /* white surface, rounded, shadow */ />
  <ReferenceLine y={issueSpread} stroke="#9CA3AF" strokeDasharray="3 3" label={{ value: `Issue: ${issueSpread}bps`, position: 'right', fontSize: 10, fill: '#6B7280' }} />
  <Line type="monotone" dataKey="spread" stroke="#7C3AED" strokeWidth={2} dot={false} isAnimationActive={false} />
</LineChart>
```

Price chart:

```tsx
<AreaChart data={timeline}>
  <defs>
    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
  …axes / tooltip…
  <ReferenceLine y={reoffer} stroke="#9CA3AF" strokeDasharray="3 3" label={{ value: `Reoffer: ${reoffer}`, position: 'right', fontSize: 10, fill: '#6B7280' }} />
  <Area type="monotone" dataKey="price" stroke="#8B5CF6" strokeWidth={2} fill="url(#priceGradient)" isAnimationActive={false} />
</AreaChart>
```

`#7C3AED` (violet-600) for the spread line, `#8B5CF6` (violet-500) for the price line/gradient — both within the violet-domain palette.

## Icons

Trend icons (`w-5 h-5`): trend-up, trend-down, flat (`M5 12h14`) — see [icons.md](../icons.md#domain-components).

## Performance

`React.memo`. Both charts are pinned at `isAnimationActive={false}`.
