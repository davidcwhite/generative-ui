# Issuance dashboard

A single-page analytics view over a bond issuance dataset: a headline volume
figure, a stacked time series, a composition donut, and a virtualised table with
a detail panel. Every control narrows one shared query, and every surface reacts
to it.

The design goal is a quiet, white, borderless page. Grouping is done with
whitespace and hairlines rather than cards, motion is short and opacity-led, and
data that is already on screen is never blanked out while newer data loads.

---

## Documents

| Document | Answers |
| --- | --- |
| [01-design-system.md](./01-design-system.md) | Where everything sits on the page, then what every colour, size, space and animation is |
| [02-functional-spec.md](./02-functional-spec.md) | What each control does, including the non-obvious cases |
| [03-architecture.md](./03-architecture.md) | How the layers fit together, and how to extend or substitute them |
| [04-performance.md](./04-performance.md) | Which patterns keep it fast, and which will quietly break it |
| [05-loading.md](./05-loading.md) | Every skeleton and loading indicator, in full |
| [06-date-picker.md](./06-date-picker.md) | The date range popover on its own: layout, calendar, footer, Reset |

Start with the [page map](./01-design-system.md#page-map) — it names the eight
regions and links each to its own specification. Then read 01 and 02 to build
it, 05 alongside them for the loading states, 03 before changing it, and 04
before optimising it, because several things that look like waste are
load-bearing.

---

## Stack

| Concern | Choice | Why this one |
| --- | --- | --- |
| Build | Vite + React 18 + TypeScript | — |
| Styling | Tailwind CSS v4 | `@theme inline` tokens, no config file |
| Primitives | shadcn/ui over Radix | Copied in, so they can be edited |
| Charts | Recharts 3 | Composable, and the shadcn chart wrapper targets it |
| Table | AG Grid Community 36 | Infinite row model and column pinning |
| Dates | date-fns 4 + react-day-picker 10 | Formatting, bucketing, range calendar |
| Date entry | React Aria `DateField` + `@internationalized/date` | Segmented dd/mm/yyyy that a native `<input type="date">` cannot guarantee |
| Command lists | cmdk 1 | Searchable filter field and option lists |
| Icons | lucide-react | — |

```jsonc
{
  "dependencies": {
    "@internationalized/date": "^3.12.2",
    "@radix-ui/react-dropdown-menu": "^2.1.23",
    "@radix-ui/react-popover": "^1.1.23",
    "@radix-ui/react-slot": "^1.3.2",
    "@radix-ui/react-tabs": "^1.1.20",
    "ag-grid-community": "^36.0.0",
    "ag-grid-react": "^36.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.4.0",
    "lucide-react": "^1.24.0",
    "react": "^18.3.0",
    "react-aria-components": "^1.19.0",
    "react-day-picker": "^10.0.1",
    "react-dom": "^18.3.0",
    "recharts": "^3.8.0",
    "tailwind-merge": "^3.6.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.18",
    "tailwindcss": "^4.1.18",
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

`@` must resolve to the source root, in both `vite.config.ts` and
`tsconfig.json`:

```ts
// vite.config.ts
resolve: { alias: { '@': path.resolve(__dirname, './src') } }
```

```jsonc
// tsconfig.json
"compilerOptions": { "baseUrl": ".", "paths": { "@": ["./src"], "@/*": ["./src/*"] } }
```

---

## Files

Nineteen files in one folder. Listed in dependency order — each depends only on
those above it, so they can be read top to bottom.

| File | Lines | Role |
| --- | --- | --- |
| `format.ts` | 9 | Currency formatting |
| `issuanceData.ts` | 575 | Types, dataset, bucketing and ranking |
| `issuanceRange.ts` | 81 | Date presets and granularity rules |
| `issuanceApi.ts` | 228 | Async query layer |
| `issuanceFilters.ts` | 108 | Filter field registry and clause algebra |
| `useIssuanceAggregates.ts` | 67 | Fetch hook and the loading-flag hook |
| `useScrolled.ts` | 26 | Scroll-aware hairline |
| `chartFrame.tsx` | 55 | Band height, control bar, collapsible legend hook |
| `IssuanceSkeletons.tsx` | 108 | Loading placeholders |
| `IssuanceHero.tsx` | 54 | Headline stats strip |
| `IssuanceControls.tsx` | 548 | Range, granularity, dimension and date controls |
| `IssuanceDetail.tsx` | 108 | Selected-record panel |
| `IssuanceFilterBar.tsx` | 460 | Search, filter popover, chips |
| `IssuanceGrid.tsx` | 326 | AG Grid |
| `VolumeChart.tsx` | 211 | Bar chart and its legend |
| `MixDonut.tsx` | 178 | Donut chart and its legend |
| `IssuanceTable.tsx` | 99 | Filter bar + grid + detail panel |
| `DashboardShell.tsx` | 103 | Top bar and navigation |
| `IssuanceDashboard.tsx` | 254 | Orchestrator |

The folder's only outside imports are React, the libraries above, and these ten
files from the shadcn `ui/` directory:

```
badge  button  calendar  chart  command
dropdown-menu  input  popover  skeleton  tabs
```

Eight are the stock primitives, two of them patched. `chart` and `calendar` only
follow the shadcn conventions — both are written by hand and share no styling
with the generated versions. The setup checklist covers all four cases.

---

## Setup checklist

The components alone are not enough. Four of these five steps are easy to skip
and each produces a silently broken result.

**1. Add the primitives.**

```bash
npx shadcn@latest add badge button command \
  dropdown-menu input popover skeleton tabs
```

`chart` and `calendar` are missing from that list on purpose — see steps 3 and 4.

**2. Patch two primitives.** Both diverge from stock, and both are relied on.

`skeleton.tsx` must render the shimmer class instead of `animate-pulse`:

```tsx
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('sk-shimmer rounded-md', className)} {...props} />;
}
```

`button.tsx` needs two extra sizes:

```ts
size: {
  default: 'h-9 px-4',
  sm: 'h-8 px-3 text-xs',
  xs: 'h-7 gap-1 px-2 text-[11px]',   // added
  icon: 'h-9 w-9',
  'icon-sm': 'h-8 w-8',               // added
},
```

`Button` must also forward its ref, or Radix popover and dropdown triggers
cannot measure it.

**3. Use the chart wrapper from this specification, not the stock one.**
`ChartTooltipContent` here supports row capping, empty-series suppression,
per-point ranking and a footer slot. None of that exists upstream, and the
charts pass all four. The full source is in
[01-design-system.md](./01-design-system.md#chart-wrapper).

**4. Write `calendar.tsx` by hand as well.** It is `react-day-picker` v10 with
every class in the map replaced, so it shares no palette or type scale with a
generated calendar. Pin `react-day-picker` to v10 and do not import its
stylesheet. Full source and the reasoning behind each decision are in
[01-design-system.md](./01-design-system.md#calendar).

**5. Set the date-field locale deliberately.** The segmented start and end fields
are React Aria's `DateField`, wrapped in `<I18nProvider locale="en-GB">` because
that provider — not the host machine — decides whether they read `dd/mm/yyyy` or
`mm/dd/yyyy`. Pick the locale your desk expects. `react-aria-components` ships no
stylesheet you need to import; every class comes from the render props shown in
[02-functional-spec.md](./02-functional-spec.md#typed-dates).

**6. Copy the stylesheet blocks.** Roughly 120 lines of CSS live outside the
components: the shimmer, the stale-data dim, the refresh fade, the popover
transitions, two AG Grid overrides, the chart colour tokens, and the
reduced-motion block. Without them the skeletons are static grey, popovers snap,
and the charts render uncoloured. All of it is in
[01-design-system.md](./01-design-system.md#stylesheet).

---

## Mounting it

```tsx
import { IssuanceDashboard } from './issuance-dashboard/IssuanceDashboard';

<IssuanceDashboard />;
```

Both props are optional:

```tsx
interface DisplayPrefs {
  density: 'comfortable' | 'compact';  // grid row height and spacing
  showSectorMix: boolean;              // donut column
  showDetailPanel: boolean;            // right-hand record panel
}

<IssuanceDashboard prefs={prefs} toolbar={<SettingsButton />} />;
```

`toolbar` renders in the top bar to the right of the view tabs, which is where
host-specific chrome belongs. Everything else the dashboard owns itself.

The dashboard fills its container and expects the page to scroll. If it sits in
a scrollable element rather than the document, mark that element so the sticky
top bar can find it:

```html
<div data-dashboard-scroll class="overflow-y-auto">…</div>
```

---

## Data

`issuanceData.ts` generates a deterministic dataset at module load: 842 rows
across five years, seeded so it is identical on every reload. It stands in for a
service and is meant to be replaced.

The contract that matters is `IssuanceRecord` plus the two functions in
`issuanceApi.ts`. Satisfy those and the entire UI works against a real backend
unchanged. See
[03-architecture.md](./03-architecture.md#replacing-the-data-layer).
