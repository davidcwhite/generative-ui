# ApprovalCard

Source: [client/src/components/ApprovalCard.tsx](../../../client/src/components/ApprovalCard.tsx)

The confirmation gate. Rendered when the assistant calls `confirm_action`. Client-side tool — the user's choice resolves the tool through `addToolResult`.

## Props

```ts
interface Action {
  id: string;
  label: string;
}

interface ApprovalCardProps {
  summary: string;
  risk: 'low' | 'medium' | 'high';
  actions: Action[];
  onAction: (actionId: string) => void;
  onCancel: () => void;
}
```

## Visual structure

- Surface: `mt-3 p-4 bg-stone-50 border border-stone-200 rounded-lg shadow-sm` (slightly warmer than the standard `bg-white` card to read as an alert)
- Header row: `Confirmation Required` label on the left, risk badge on the right
- Summary paragraph (color follows risk)
- Action button row at the bottom

## Risk styling

```ts
const riskStyles = {
  low:    { badge: 'bg-emerald-500', text: 'text-emerald-700' },
  medium: { badge: 'bg-amber-500',   text: 'text-amber-700'   },
  high:   { badge: 'bg-rose-500',    text: 'text-rose-700'    },
};
```

The badge:

```tsx
<span className={`px-2 py-1 text-[10px] font-bold text-white rounded ${badge}`}>
  {risk.toUpperCase()} RISK
</span>
```

The summary:

```tsx
<p className={`m-0 mb-4 text-sm leading-relaxed ${text}`}>{summary}</p>
```

## Buttons

Primary action(s) — blue (see [components.md#5-buttons](../components.md#5-buttons)):

```tsx
<button className="px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
  {action.label}
</button>
```

Cancel — secondary/ghost:

```tsx
<button className="px-4 py-2.5 text-sm font-semibold bg-white text-stone-600 border border-stone-300 rounded-md hover:bg-stone-50 hover:border-stone-400 focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-colors">
  Cancel
</button>
```

Buttons wrap on small widths via `flex flex-wrap gap-2`.

## Result strip

After the user clicks an action, App.tsx replaces the card with:

```tsx
<div className="mt-2 px-3 py-2 bg-stone-100 rounded-lg text-sm text-stone-600">
  {cancelled ? 'Action cancelled' : `Action approved: ${approvedActionId}`}
</div>
```

## Auto-cancel

If the user types a new chat message before responding, App.tsx resolves the tool with `{ cancelled: true, skipped: true }`. See [generative-ui.md](../generative-ui.md#auto-cancel-on-new-user-input).

## Icons

None — risk is conveyed by color and copy alone.
