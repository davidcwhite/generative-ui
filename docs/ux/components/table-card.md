# TableCard

Source: [client/src/components/TableCard.tsx](../../../client/src/components/TableCard.tsx)

The default tabular surface. Used by:

- The `show_table` tool (custom tables)
- The `query_data` tool via the `formatQueryResult` helper in [client/src/App.tsx](../../../client/src/App.tsx)
- The `get_participation_history` DCM tool (rows mapped manually)

## Props

```ts
interface TableCardProps {
  title: string;
  columns: string[];
  rows: Record<string, string | number | null>[];
}
```

`columns` is the ordered list of header strings; each `row` is keyed by those same strings.

## Visual structure

- **Card shell** (see [components.md#1-the-card-shell](../components.md#1-the-card-shell))
- **Header**: `text-sm font-semibold text-stone-700` over `bg-stone-100 border-b border-stone-200`
- **Body**: scrollable `<table>` capped at `max-h-[350px]` with sticky `<thead>`
- **Empty state**: italic stone-400 placeholder when `rows.length === 0`

## Tailwind / styles

Root:

```tsx
<div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
```

Header:

```tsx
<h3 className="m-0 px-4 py-3 text-sm font-semibold bg-stone-100 border-b border-stone-200 text-stone-700">
```

Scroll body:

```tsx
<div className="overflow-x-auto overflow-y-auto max-h-[350px]">
  <table className="w-full border-collapse text-sm">
```

Header cells (sticky on scroll):

```tsx
<th className="px-3 py-2.5 text-left text-xs font-semibold text-stone-600 bg-stone-50 border-b border-stone-200 whitespace-nowrap sticky top-0 z-10">
```

Body rows:

```tsx
<tr className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
  <td className="px-3 py-2.5 text-stone-600">{row[col] ?? '-'}</td>
</tr>
```

Empty state:

```tsx
<div className="py-6 text-center text-stone-400 italic text-sm">No data available</div>
```

## Behavior

- Missing cell values render as `-`
- Header `<thead>` is `sticky top-0 z-10` — when the body is scrolled the header stays anchored within the card
- Hover row highlight is `bg-stone-50`
- No sorting, no pagination — the assistant decides how many rows to send

## Related patterns

- A header strip with metadata (data source, totals) is rendered **above** the TableCard inside `formatQueryResult` in `App.tsx`:
  ```tsx
  <div className="mt-2 mb-2 px-3 py-2 bg-stone-100 rounded-md text-xs text-stone-600">
    {dataSource} | Showing {showing} of {totalMatches} | …
  </div>
  ```
- Empty result strips (when `rows.length === 0` from the tool) use the amber inline strip — see [components.md#6-inline-result-strips](../components.md#6-inline-result-strips).

## Icons

None.

## Performance

Not memoised — generated tables are short and re-renders are cheap.
