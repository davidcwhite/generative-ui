# ComparableDealsPanel

Source: [client/src/components/dcm/ComparableDealsPanel.tsx](../../../client/src/components/dcm/ComparableDealsPanel.tsx)

A peer-comparison view rendered for the `get_peer_comparison` tool. Wrapped in `React.memo`.

## Props

```ts
interface DealSummary { totalDeals; totalRaised; avgTenor; avgNip; avgOversubscription; }
interface Deal { /* same shape as IssuerTimeline */ }
interface Peer { issuerId; issuerName; deals: Deal[]; summary: DealSummary; }

interface ComparableDealsPanelProps {
  issuer: { id: string; name: string; sector: string };
  issuerSummary: DealSummary;
  issuerDeals: Deal[];
  peers: Peer[];
  comparison: { nipVsPeers: string };
}
```

## Visual structure

1. **Indigo gradient header** with sector and "vs sector peers" subtitle
2. **Insight strip** — indigo, with a trend-up icon and the `comparison.nipVsPeers` text
3. **Comparison table** — first row is the highlighted issuer, subsequent rows are peers
4. **Recent deals strip** — horizontally scrollable cards for the issuer's last 3 deals

## Tailwind / styles

Header (indigo gradient):

```tsx
<div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
  <h3 className="font-semibold">Peer Comparison - {sector}</h3>
  <p className="text-indigo-200 text-xs mt-0.5">{name} vs sector peers</p>
</div>
```

Insight strip:

```tsx
<div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
  <div className="flex items-center gap-2">
    <svg className="w-4 h-4 text-indigo-600">…trend-up icon…</svg>
    <span className="text-sm text-indigo-800 font-medium">{comparison.nipVsPeers}</span>
  </div>
</div>
```

Table header:

```tsx
<thead>
  <tr className="bg-stone-50 border-b border-stone-200">
    <th className="px-4 py-2 text-left text-xs font-semibold text-stone-600">Issuer</th>
    <!-- right-aligned: Deals · Total Raised · Avg Tenor · Avg NIP · Avg Oversub -->
  </tr>
</thead>
```

Issuer row (highlighted):

```tsx
<tr className="bg-blue-50">
  <td className="px-4 py-2 font-semibold text-blue-800">{issuer.name}</td>
  <td className="text-right">{totalDeals}</td>
  <td className="text-right">{€totalRaised}M</td>
  <td className="text-right">{avgTenor}</td>
  <td className="text-right font-semibold text-blue-700">{avgNip}bps</td>
  <td className="text-right text-emerald-600 font-semibold">{avgOversubscription}x</td>
</tr>
```

Peer rows: `hover:bg-stone-50` with `text-stone-600` cells.

Recent deals strip:

```tsx
<div className="px-4 py-3 border-t border-stone-200">
  <h4 className="text-xs font-semibold text-stone-500 mb-2">{name} - Recent Deals</h4>
  <div className="flex gap-2 overflow-x-auto pb-1">
    <div className="flex-shrink-0 bg-stone-50 rounded px-3 py-2 border border-stone-200 text-xs">
      <div className="font-semibold text-stone-700">{coupon}% {tenor}</div>
      <div className="text-stone-500">€{size}M | {spread}bps</div>
    </div>
  </div>
</div>
```

## Color usage

- Header: indigo (peer comparison context — see [colors.md](../colors.md#indigo--peer-comparison-context))
- Issuer row highlight: `bg-blue-50` with `text-blue-800` / `text-blue-700`
- Avg NIP: blue-700 (intentional — flags the metric most relevant to comparison)
- Oversubscription: emerald

## Icons

Single trend-up icon (`w-4 h-4 text-indigo-600`) — see [icons.md](../icons.md#domain-components).

## Performance

`React.memo`.
