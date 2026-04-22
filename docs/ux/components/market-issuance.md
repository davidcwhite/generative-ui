# MarketIssuance

Source: [client/src/components/dcm/MarketIssuance.tsx](../../../client/src/components/dcm/MarketIssuance.tsx)

A multi-deal market view rendered for the `get_market_deals` tool. Combines high-level KPIs, sector chips, and a scrollable deals table. Wrapped in `React.memo`.

## Props

```ts
interface MarketIssuanceProps {
  deals: Deal[];
  filters: { startDate: string; endDate: string; currency?: string; sector?: string; tenor?: string };
  summary: {
    totalDeals: number;
    totalRaised: number;       // EUR millions
    avgNip: number;
    avgOversubscription: number;
    bySector: { sector: string; count: number; percentage: number }[];
  };
}
```

## Visual structure

1. **Card shell** with stone header showing date window + active filters
2. **KPI tile row** (`grid grid-cols-4 gap-3 p-4`) — 4 rounded `bg-stone-50` tiles
3. **Sector breakdown chips row**
4. **Recent deals table** (top 10 by date)

## Tailwind / styles

Header:

```tsx
<div className="px-4 py-3 bg-stone-100 border-b border-stone-200">
  <h3 className="font-semibold text-stone-800">Recent Issuance</h3>
  <p className="text-xs text-stone-600 mt-1">{startDate} to {endDate}{filters joined with ' · '}</p>
</div>
```

KPI tiles:

```tsx
<div className="grid grid-cols-4 gap-3 p-4 border-b border-stone-200">
  <div className="bg-stone-50 rounded-lg p-3 text-center">
    <div className="text-xs text-stone-500 mb-1">Total Deals</div>
    <div className="text-2xl font-bold text-stone-800">{totalDeals}</div>
  </div>
  <Tile label="Total Raised" value={`€${(totalRaised/1000).toFixed(1)}B`} />
  <Tile label="Avg NIP" value={`${avgNip}bps`} valueClass="text-2xl font-bold text-stone-800" />
  <Tile label="Avg Oversub" value={`${avgOversubscription}x`} valueClass="text-2xl font-bold text-emerald-600" />
</div>
```

Sector chips:

```tsx
<div className="px-4 py-3 border-b border-stone-200">
  <h4 className="text-xs font-semibold text-stone-500 mb-2">By Sector</h4>
  <div className="flex flex-wrap gap-2">
    {bySector.map(s => (
      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
        {s.sector}: {s.count} ({s.percentage}%)
      </span>
    ))}
  </div>
</div>
```

Table — uppercase eyebrow header, top 10 rows:

```tsx
<div className="overflow-x-auto">
  <table className="w-full text-xs">
    <thead className="bg-stone-50 text-stone-600 text-xs uppercase">
      <tr>
        <th className="px-3 py-2 text-left">Date</th>
        <th className="text-left">Issuer</th>
        <th className="text-left">Coupon</th>
        <th className="text-left">Tenor</th>
        <th className="text-right">Size</th>
        <th className="text-right">Spread</th>
        <th className="text-right">NIP</th>
        <th className="text-right">Oversub</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-stone-200">
      {deals.slice(0, 10).map(deal => (
        <tr className="hover:bg-stone-50">
          <td className="px-3 py-2 text-stone-700">{shortDate}</td>
          <td className="font-medium text-stone-800">{issuerName}</td>
          <td className="text-stone-700">{coupon}%</td>
          <td className="text-stone-700">{tenor}</td>
          <td className="text-right font-medium text-stone-700">{€size}M</td>
          <td className="text-right text-stone-700">{spread}bps</td>
          <td className="text-right">
            <span className={NIP_CHIP}>NIP {nip}</span>
          </td>
          <td className="text-right text-emerald-600 font-medium">{oversub}x</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

NIP chip uses the same threshold buckets as `IssuerTimeline` and the `IssuanceView` — see [components.md#4-state-chips-pills](../components.md#4-state-chips-pills).

Footer hint when there are more deals than shown:

```tsx
<div className="px-4 py-2 bg-stone-50 text-xs text-stone-500 text-center">
  Showing 10 of {deals.length} deals
</div>
```

## Color usage

- Header: stone (no domain accent — this is a generic market view)
- Tiles: `bg-stone-50` surfaces with `text-2xl font-bold` numerals
- Avg Oversub tile: emerald number (positive metric)
- Sector chips: blue pills (informational accent)
- NIP chips: emerald / amber / red bucketed
- Oversub column: emerald

## Icons

None.

## Performance

`React.memo`.
