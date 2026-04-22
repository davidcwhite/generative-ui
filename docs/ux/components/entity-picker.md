# EntityPicker

Source: [client/src/components/dcm/EntityPicker.tsx](../../../client/src/components/dcm/EntityPicker.tsx)

A disambiguation picker rendered when the `resolve_entity` tool returns multiple ambiguous matches for a company name.

## Props

```ts
interface Issuer {
  id: string;
  lei: string;
  name: string;
  shortName: string;
  sector: string;
  country: string;
  ratings: { agency: string; rating: string }[];
}

interface EntityPickerProps {
  query: string;
  matches: Issuer[];
  onSelect: (issuerId: string) => void;
}
```

## Visual structure

- Card shell (white surface) with an **amber** border to read as a soft warning: `border border-amber-200`
- Amber header strip with info icon, title `Multiple matches for "{query}"`, and small instruction
- Vertically divided list of issuer rows
- Optional bottom strip showing the current selection

## Tailwind / styles

Root:

```tsx
<div className="mt-3 bg-white border border-amber-200 rounded-lg overflow-hidden shadow-sm">
```

Header:

```tsx
<div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
  <div className="flex items-center gap-2">
    <svg className="w-5 h-5 text-amber-600">…info icon…</svg>
    <span className="text-sm font-semibold text-amber-800">Multiple matches for "{query}"</span>
  </div>
  <p className="text-xs text-amber-600 mt-1">Please select the correct issuer:</p>
</div>
```

List:

```tsx
<div className="divide-y divide-stone-100">
```

Each row is a button:

```tsx
<button className={
  selectedId === issuer.id
    ? 'bg-blue-50 border-l-4 border-blue-500'
    : selectedId !== null
      ? 'opacity-50 cursor-not-allowed'
      : 'hover:bg-stone-50 cursor-pointer'
}>
```

Inside each row:

- Left column: shortName (`font-semibold text-stone-800`), legal name (`text-xs text-stone-500`), sector + country chips (`bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-xs`)
- Right column: small `Ratings` eyebrow, then `text-xs font-medium text-stone-700` chips like `S&P: A+`

Selected confirmation strip (after selection):

```tsx
<div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-700">
  Selected: {issuer.shortName}
</div>
```

## Behavior

- `useState<string | null>` for `selectedId`
- After clicking a row, the row is highlighted (blue left border) and **all other rows become disabled** (`opacity-50 cursor-not-allowed`)
- `onSelect` is invoked once per click — the parent (`App.tsx`) currently logs the selection (a follow-up tool call to refine the query is the production wiring path)

## Icons

Single info-circle (`w-5 h-5 text-amber-600`) — see [icons.md](../icons.md#domain-components).

## Performance

Not memoised — picker only renders for one specific tool result.

## Single-match fallback

If `resolve_entity` returns a single match (`confidence !== 'ambiguous'`), the picker is skipped in favour of an inline stone chip rendered directly in `App.tsx`:

```tsx
<div className="mt-2 px-3 py-2 bg-stone-100 rounded-lg text-sm inline-block">
  <span className="text-stone-800 font-medium">{shortName}</span>
  <span className="text-stone-500 ml-2">({sector}, {country})</span>
</div>
```

If there are no matches at all, an amber strip is rendered instead — see [components.md#6-inline-result-strips](../components.md#6-inline-result-strips).
