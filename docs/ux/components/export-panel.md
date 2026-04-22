# ExportPanel

Source: [client/src/components/dcm/ExportPanel.tsx](../../../client/src/components/dcm/ExportPanel.tsx)

A multi-format export action card rendered for the `generate_mandate_brief` tool. Lets the user pick PDF / PPTX / XLSX / Email and shows a simulated processing → success flow.

## Props

```ts
interface ExportPanelProps {
  documentTitle: string;
  documentType: string;
  formats: ('pdf' | 'pptx' | 'xlsx' | 'email')[];
  metadata: { issuer: string; sector: string; dataSources: string[]; complianceChecked: boolean };
}
```

## Visual structure

1. **Amber/orange gradient header** with title + subtitle
2. **Metadata strip** — issuer / sector eyebrow row plus a Data Sources list
3. **Format buttons** — 4 large icon-tile buttons in a `grid grid-cols-4 gap-2`
4. **Processing state** — spinner + status line, format buttons disabled
5. **Success state** — emerald success strip with checkmark + filename + "Open"
6. **Provenance footer** — when `complianceChecked === true`

## Tailwind / styles

Header (amber/orange gradient):

```tsx
<div className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
  <h3 className="font-semibold">{documentTitle}</h3>
  <p className="text-amber-100 text-xs mt-0.5">{documentType}</p>
</div>
```

Metadata strip:

```tsx
<div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
  <div className="grid grid-cols-2 gap-3 text-xs">
    <div>
      <span className="text-stone-500">Issuer:</span>
      <span className="font-medium text-stone-700 ml-1">{issuer}</span>
    </div>
    <div>
      <span className="text-stone-500">Sector:</span>
      <span className="font-medium text-stone-700 ml-1">{sector}</span>
    </div>
  </div>
  <div className="mt-2 text-xs">
    <span className="text-stone-500">Data Sources: </span>
    {dataSources.map(src => <span key={src} className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-xs text-stone-600 mx-0.5">{src}</span>)}
  </div>
</div>
```

Format button (default):

```tsx
<button className="flex flex-col items-center gap-1 px-3 py-3 bg-white border border-stone-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
  <svg className="w-5 h-5 text-stone-600">…format icon…</svg>
  <span className="text-xs font-medium text-stone-700">{label}</span>
</button>
```

Format button (disabled after selection):

```tsx
disabled
  ? 'bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed'
  : '…default classes…'
```

Processing strip:

```tsx
<div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
  <div className="flex items-center gap-2">
    <svg className="w-4 h-4 text-blue-600 animate-spin">…spinner…</svg>
    <span className="text-sm text-blue-800">Generating {format.toUpperCase()}...</span>
  </div>
</div>
```

Success strip:

```tsx
<div className="px-4 py-3 bg-emerald-50 border-t border-emerald-200">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 text-emerald-600">…check icon…</svg>
      <div>
        <div className="text-sm font-medium text-emerald-800">{filename}</div>
        <div className="text-xs text-emerald-600">Document ready</div>
      </div>
    </div>
    <button className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700">Open</button>
  </div>
</div>
```

Provenance footer:

```tsx
<div className="px-4 py-2 bg-stone-50 border-t border-stone-200 text-xs text-stone-500 flex items-center gap-1">
  <svg className="w-3.5 h-3.5">…shield-check icon…</svg>
  Compliance checked - All data verified from source registry
</div>
```

## State machine

```
idle ──[click PDF]──▶ generating(pdf) ──[2s timer]──▶ generated(pdf)
                                                       │
                                                       └─▶ second click resets to idle
```

Implemented with two `useState`s (`generating: format | null`, `generated: format | null`) plus a `setTimeout(..., 2000)`.

After "generated", the buttons remain disabled to prevent double-export. `handleClick(format)` is a no-op while generating.

## Color usage

- Header: amber/orange (action accent — see [colors.md](../colors.md#amber--orange--caution--pending-decisions))
- Format hover: `border-blue-400 hover:bg-blue-50`
- Generating: blue informational
- Success: emerald
- Provenance shield: stone

## Icons

- 4 file-format icons (`w-5 h-5`, solid, 20×20 viewBox) — see [icons.md](../icons.md#file-format-icons-solid-2020)
- Spinner (`w-4 h-4 animate-spin`)
- Checkmark (`w-4 h-4 text-emerald-600`)
- Shield-check (`w-3.5 h-3.5`)

## Performance

Not memoised — only one ExportPanel typically renders per chat.
