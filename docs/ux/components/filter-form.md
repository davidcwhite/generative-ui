# FilterForm

Source: [client/src/components/FilterForm.tsx](../../../client/src/components/FilterForm.tsx)

A dynamically-shaped form rendered when the assistant calls `collect_filters`. Client-side tool — the form lives only on the client, and submission resolves the tool via `addToolResult`.

## Props

```ts
interface Field {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: string[];      // required when type === 'select'
  defaultValue?: string;
}

interface FilterFormProps {
  title: string;
  fields: Field[];
  onSubmit: (values: Record<string, string>) => void;
}
```

The model populates `fields` (e.g. dropdowns for currency, sector, tenor) — see the system-prompt examples in [server/src/index.ts](../../../server/src/index.ts).

## Visual structure

- **Card shell** (see [components.md#1-the-card-shell](../components.md#1-the-card-shell))
- Body padded `p-4` with a vertical stack of fields (`gap-3`)
- Each field has a small uppercase-style label above the input
- A primary blue Submit button at the bottom

## Tailwind / styles

Root:

```tsx
<div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
  <h3 className="m-0 px-4 py-3 text-sm font-semibold bg-stone-100 border-b border-stone-200 text-stone-700">{title}</h3>
  <form className="p-4 flex flex-col gap-3">
```

Field row:

```tsx
<div className="flex flex-col gap-1">
  <label className="text-xs font-semibold text-stone-500">{label}</label>
  <input
    className="px-3 py-2.5 text-sm border border-stone-300 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
  />
</div>
```

`<select>` uses the same input shell plus `bg-white`.

Submit button (primary blue — see [components.md#5-buttons](../components.md#5-buttons)):

```tsx
<button className="mt-2 px-6 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
  Submit
</button>
```

## State

- `useState` keeps `values` keyed by `field.key`, initialised from each field's `defaultValue` (or `''`).
- `handleChange(key, value)` updates `values` immutably.
- `handleSubmit` calls `onSubmit(values)` — App.tsx in turn calls `addToolResult({ toolCallId, result: { values } })`.

## Result confirmation strip

After submission, the form is replaced (in App.tsx) with an emerald success strip:

```tsx
<div className="mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
  Filtered by department: Engineering, status: ACTIVE
</div>
```

If the user typed `''` or `'All'` in every field, the message reads `No filters applied`.

## Auto-cancel

If the user types a new chat message before submitting the form, App.tsx's `getPendingInteractiveTools` resolves the form with `{ values: {}, skipped: true }` so the assistant continues. See [generative-ui.md](../generative-ui.md#auto-cancel-on-new-user-input).

## Icons

None.
