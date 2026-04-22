# ChartCard

Source: [client/src/components/ChartCard.tsx](../../../client/src/components/ChartCard.tsx)

The default Recharts wrapper. Used by the `show_chart` tool with one of four chart types: `bar`, `line`, `area`, `pie`.

## Props

```ts
interface ChartCardProps {
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  yLabel?: string;
  color?: string; // defaults to '#3b82f6' (blue-500)
}
```

## Visual structure

- **Card shell** (see [components.md#1-the-card-shell](../components.md#1-the-card-shell))
- **Header strip**: `text-sm font-semibold text-stone-700` on `bg-stone-100`
- **Body**: a `300px` tall `ResponsiveContainer` wrapping the selected chart

## Color palette

```ts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
```

(Same palette is duplicated by the Allocation pie chart — see [colors.md#chart-palette](../colors.md#chart-palette).)

Pie slices iterate `COLORS[index % COLORS.length]`. Bar/line/area use the single `color` prop (default `#3b82f6`).

## Recharts configuration

Shared across all chart types:

- Margin: `{ top: 20, right: 30, left: 20, bottom: 60 }` (60px bottom margin allows rotated x-axis labels)
- `<CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />`
- X-axis tick: `{ fontSize: 11, fill: '#78716c' }` rotated `-45°` with `textAnchor="end"` for readability
- Y-axis: optional label rendered with `angle={-90}, position: 'insideLeft', fill: '#78716c'`
- Tooltip:
  ```tsx
  contentStyle={{
    backgroundColor: '#fff',
    border: '1px solid #e7e5e4',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  }}
  ```
- Legend: default
- Animation: `isAnimationActive={true} animationDuration={500} animationBegin={0}`

### Type-specific

| Type | Chart element | Styling |
|---|---|---|
| `bar` | `<Bar fill={color} name={yLabel \|\| yKey} />` |
| `line` | `<Line type="monotone" stroke={color} strokeWidth={2} />` |
| `area` | `<Area type="monotone" stroke={color} fill={color} fillOpacity={0.6} />` |
| `pie` | `<Pie outerRadius={100} labelLine={true} label={"name: %"} />` with per-slice `<Cell />` from `COLORS` |

The pie label formatter:

```tsx
label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
```

## Tailwind / styles

Root:

```tsx
<div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
  <h3 className="m-0 px-4 py-3 text-sm font-semibold bg-stone-100 border-b border-stone-200 text-stone-700">{title}</h3>
  <div className="p-4">{renderChart()}</div>
</div>
```

Unsupported type fallback:

```tsx
<div className="text-stone-500">Unsupported chart type: {type}</div>
```

## Icons

None — Recharts handles its own legend swatches.

## Performance

Not memoised. Animations (`animationDuration={500}`) play on each mount, including streaming re-renders. For DCM cards that re-render often (`AllocationBreakdown`, `SecondaryPerformanceView`) the components disable animations explicitly with `isAnimationActive={false}` and wrap in `React.memo`.
