# DealCard

Source: [client/src/components/dcm/DealCard.tsx](../../../client/src/components/dcm/DealCard.tsx)

Detailed view of a single bond deal. Currently exported but **not** mounted by any tool wiring in `App.tsx` — kept as a reusable building block for future tools or as an embeddable element inside other cards. The compact variant (`compact={true}`) is the same shape used inside the `ComparableDealsPanel` "Recent Deals" strip and `Issuer Timeline` entries.

## Props

```ts
interface DealCardProps {
  deal: Deal;
  compact?: boolean;
}
```

The `Deal` type is locally redeclared (the same shape is used across DCM components).

## Variants

### Compact (`compact={true}`)

A single-line summary used as a list item:

```tsx
<div className="bg-white border border-stone-200 rounded-lg p-3 shadow-sm">
  <div className="flex justify-between items-start">
    <div>
      <div className="font-semibold text-stone-800 text-sm">{issuerName} {coupon}% {tenor}</div>
      <div className="text-xs text-stone-500 mt-0.5">{pricingDate}</div>
    </div>
    <div className="text-right">
      <div className="font-semibold text-stone-800 text-sm">{€size}M</div>
      <div className="text-xs text-stone-500">{spread}bps</div>
    </div>
  </div>
</div>
```

### Full (default)

Three sections stacked inside the standard Card shell:

1. **Gradient header** (blue) with issuer + size:

   ```tsx
   <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
     <div className="font-bold text-lg">{issuerName}</div>
     <div className="text-blue-100 text-sm mt-0.5">{coupon}% {tenor} {seniority}</div>
     <!-- right column: size + format -->
   </div>
   ```

2. **Metric strip** (4 cells, divided):

   ```tsx
   <div className="grid grid-cols-4 divide-x divide-stone-200 border-b border-stone-200">
     <Metric label="Spread" value="{spread}bps" />
     <Metric label="NIP" value="{nip}bps" />
     <Metric label="Reoffer" value="{reoffer}" />
     <Metric label="Oversub" value="{oversub}x" valueClass="text-emerald-600" />
   </div>
   ```

   Each cell: `px-3 py-2 text-center` with tiny `text-xs text-stone-500` label and `font-semibold text-stone-800` value.

3. **Details grid** (`grid grid-cols-2 gap-4`):
   - Pricing Date / ISIN (`font-mono text-xs`) on first row
   - Lead Managers spanning both columns (`col-span-2`)
   - Optional Co-Leads spanning both columns

## Currency formatting

```ts
const formatCurrency = (value: number, currency: string) => {
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${symbol}${value.toLocaleString()}M`;
};
```

This pattern is repeated in most DCM components.

## Color usage

- Header: blue gradient (info / domain accent — see [colors.md#gradient-headers](../colors.md#gradient-headers))
- Oversubscription value: `text-emerald-600` (positive)
- ISIN: `font-mono text-xs text-stone-700`

## Icons

None.

## Performance

Not memoised.
