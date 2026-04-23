---
name: generative-ui-design
description: Build UI for the Primary Flow generative-UI app — React + Vite + Tailwind v4, custom (non-shadcn) components rendered in response to AI tool calls. Use when adding new generative-UI cards, dashboard views, chat surfaces, or styling any client/src/components/** code. Enforces the project's documented Card shell, gradient-header, metric-strip, stone palette, inline-SVG icon, and React.memo conventions defined in docs/ux/.
---

# generative-ui-design

This skill keeps every new component in this repo consistent with the documented design system in [docs/ux/](../../../docs/ux/). Read [docs/ux/README.md](../../../docs/ux/README.md) first whenever you are about to author or modify UI.

## Stack

- **React 18 + Vite + TypeScript** ([client/](../../../client/))
- **Tailwind CSS v4** via `@tailwindcss/postcss`, imported with `@import "tailwindcss"` in [client/src/index.css](../../../client/src/index.css)
- **Recharts** for all charts
- **react-markdown** for streamed assistant text
- **Vercel AI SDK** (`@ai-sdk/react` `useChat`) drives the generative-UI loop

## Non-goals (do not introduce these)

- **No shadcn/ui, Radix, MUI, or any other component library** — every component is hand-rolled
- **No icon libraries** (Lucide, Heroicons npm packages, etc.) — icons are inline `<svg>` per [docs/ux/icons.md](../../../docs/ux/icons.md)
- **No CSS-in-JS** (styled-components, Emotion) — Tailwind utilities only
- **No new global CSS** beyond what is already in [client/src/index.css](../../../client/src/index.css)
- **No new fonts** — the system font stack from `index.css` is the only typeface

## Workflow — adding a new component

1. **Read the convention doc first**: [docs/ux/components.md](../../../docs/ux/components.md). Decide whether the new component is a plain Card (stone header) or a Gradient-header card (DCM domain accent).
2. **Reuse colors from** [docs/ux/colors.md](../../../docs/ux/colors.md). Do not invent new hex values. Use the stone palette for chrome and one of the documented semantic hues for state (emerald positive, amber caution, red/rose risk, blue info, indigo peer-comparison, violet secondary).
3. **Reuse icons from** [docs/ux/icons.md](../../../docs/ux/icons.md). Search the catalog before pasting a new SVG path.
4. **Match the spacing/radius/shadow scale** in [docs/ux/styles.md](../../../docs/ux/styles.md). Cards use `rounded-lg shadow-sm`; dashboard cards use `rounded-xl`.
5. **Look at the closest existing component** under [client/src/components/](../../../client/src/components/) and clone its structure. The per-component reference docs in [docs/ux/components/](../../../docs/ux/components/) annotate every card with its Tailwind classes.
6. **Document the new component** by adding a file to [docs/ux/components/](../../../docs/ux/components/) following the same template (Purpose, Props, Visual structure, Tailwind, Icons, Performance, Source link).

## Workflow — adding a new generative-UI tool

1. **Read** [docs/ux/generative-ui.md](../../../docs/ux/generative-ui.md) for the end-to-end flow.
2. **Define the tool** server-side in [server/src/tools.ts](../../../server/src/tools.ts) (generic) or [server/src/mcp/client.ts](../../../server/src/mcp/client.ts) (DCM). Use Zod for parameters. Omit `execute` for client-side tools (forms, approvals).
3. **Register the tool** in the appropriate combined-tools object exported by [server/src/index.ts](../../../server/src/index.ts) (`dcmCombinedTools` for the DCM endpoint).
4. **Update the system prompt** in `buildDCMSystemPrompt()` to instruct the model when to call the new tool.
5. **Build the React component** in [client/src/components/](../../../client/src/components/) following the conventions above.
6. **Wire it into the App.tsx switch** following the existing pattern:

   ```tsx
   if (toolInvocation.toolName === 'my_new_tool') {
     if (toolInvocation.state === 'call') {
       return <div key={callId} className="italic text-stone-500 py-2">Loading…</div>;
     }
     if (toolInvocation.state === 'result') {
       const result = toolInvocation.result;
       if (result.error) {
         return <div key={callId} className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{result.error}</div>;
       }
       return <div key={callId} className="mb-4"><MyNewComponent {...result} /></div>;
     }
   }
   ```

7. **Document the new component** in [docs/ux/components/](../../../docs/ux/components/) and update the mapping list in [docs/ux/generative-ui.md](../../../docs/ux/generative-ui.md).

## Hard rules

### Brand colors (hard-coded hex — do not substitute)

- Brand near-black: `#1A1A1A` (logo, primary CTAs, H1, brand text)
- App surface: `#FAFAF8` (page background, sticky header with `/80 backdrop-blur-sm`)
- Rail / panel surface: `#F5F5F3`
- Hairline border: `#E5E5E3`
- Hover input border: `#D5D5D3`

### Card shell (memorize this)

```tsx
<div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
  <h3 className="m-0 px-4 py-3 text-sm font-semibold bg-stone-100 border-b border-stone-200 text-stone-700">
    {title}
  </h3>
  {/* body */}
</div>
```

### Gradient-header card (DCM domain only)

```tsx
<div className="px-4 py-3 bg-gradient-to-r from-{hue}-600 to-{hue}-700 text-white">
  <h3 className="font-semibold">{title}</h3>
  <p className="text-{hue}-200 text-xs mt-0.5">{subtitle}</p>
</div>
```

The hue must come from the documented mapping (blue=DealCard, indigo=ComparableDealsPanel, emerald=AllocationBreakdown, violet=SecondaryPerformanceView, amber/orange=ExportPanel). Do not invent new hues.

### Icons

Every icon is an inline `<svg>` with `fill="none" stroke="currentColor" strokeWidth={2}` (outline, 24x24). Use a Tailwind `text-*` class — never hard-code stroke/fill hex. Sizes from the scale: `w-3.5`, `w-4`, `w-5`, `w-6`. Search [docs/ux/icons.md](../../../docs/ux/icons.md) before pasting a new path.

### Performance

- Wrap any component that renders Recharts or 5+ rows in `React.memo(function Name(...) { ... })` (see IssuerTimeline, ComparableDealsPanel, AllocationBreakdown, SecondaryPerformanceView, MarketIssuance).
- Set `isAnimationActive={false}` on Recharts series in DCM views — they re-render on every streamed token. The generic `ChartCard` is the only place that uses `animationDuration={500}`.

### Inline result strips (for tool errors / empty states)

```tsx
// error
<div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{message}</div>
// no matches / caution
<div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">{message}</div>
// success / filter applied
<div className="mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">{message}</div>
```

## Anti-patterns (do not do these)

- Adding a new package to render a chart, an icon, a date, or a form — the existing tools in the stack cover all of these
- Using `text-blue-XXX` for a non-info accent (blue is reserved for primary actions, info, and the DealCard gradient)
- Using `red-XXX` inside an `ApprovalCard` (it uses `rose` — see [docs/ux/colors.md](../../../docs/ux/colors.md))
- Mixing the dashboard chrome palette (`#E5E5E3`, `rounded-xl`) with the chat-card palette (`stone-200`, `rounded-lg`) on the same surface — keep them separate (see [docs/ux/components/dashboard-views.md](../../../docs/ux/components/dashboard-views.md))
- Adding `shadow-md` or larger to a chat card — the canonical card uses `shadow-sm`
- Generating "skeleton" loading components — the project uses italic stone-500 inline text or the `animate-spin` ring spinner instead

## Reference index

- [docs/ux/README.md](../../../docs/ux/README.md) — entry point + reading order
- [docs/ux/typography.md](../../../docs/ux/typography.md)
- [docs/ux/colors.md](../../../docs/ux/colors.md)
- [docs/ux/icons.md](../../../docs/ux/icons.md)
- [docs/ux/styles.md](../../../docs/ux/styles.md)
- [docs/ux/layout.md](../../../docs/ux/layout.md)
- [docs/ux/components.md](../../../docs/ux/components.md) — patterns
- [docs/ux/generative-ui.md](../../../docs/ux/generative-ui.md) — tool-to-component flow
- [docs/ux/components/](../../../docs/ux/components/) — per-component implementation files
