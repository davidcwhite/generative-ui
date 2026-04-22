# Primary Flow — UX & Design System

This folder documents the visual language and component patterns of **Primary Flow**, the generative-UI chat app in [client/src](../../client/src). It is grounded in the actual code (Tailwind classes, hex codes, SVG paths) so designers and engineers can stay in sync.

If you're new, read in this order:

1. [layout.md](layout.md) — the app shell (rail, header, drawers, panels)
2. [typography.md](typography.md) — fonts, sizes, weights, prose
3. [colors.md](colors.md) — palette, gradients, semantic state colors
4. [icons.md](icons.md) — inline SVG conventions and the icon catalog
5. [styles.md](styles.md) — spacing, radius, shadows, borders, focus, transitions
6. [components.md](components.md) — the canonical patterns every card uses
7. [generative-ui.md](generative-ui.md) — how the AI maps tool calls to React components
8. [components/](components/) — one file per component with implementation detail

## Folder map

```
docs/ux/
├── README.md            ← you are here
├── typography.md
├── colors.md
├── icons.md
├── styles.md
├── layout.md
├── generative-ui.md
├── components.md
└── components/
    ├── table-card.md
    ├── chart-card.md
    ├── filter-form.md
    ├── approval-card.md
    ├── entity-picker.md
    ├── deal-card.md
    ├── issuer-timeline.md
    ├── comparable-deals-panel.md
    ├── allocation-breakdown.md
    ├── secondary-performance.md
    ├── export-panel.md
    ├── market-issuance.md
    └── dashboard-views.md
```

## Stack at a glance

- **React 18 + Vite + TypeScript** ([client/package.json](../../client/package.json))
- **Tailwind v4** via `@tailwindcss/postcss` — imported with `@import "tailwindcss"` in [client/src/index.css](../../client/src/index.css)
- **Recharts** for all data visualisations
- **react-markdown** for streamed assistant text
- **Vercel AI SDK** (`@ai-sdk/react` `useChat`) drives the generative-UI loop

## Design intent

- Quiet, document-like surfaces (warm off-white `#FAFAF8`, stone borders) with one near-black brand accent `#1A1A1A`.
- Heavy reliance on the **stone** Tailwind palette for text and chrome; saturated colours (blue / emerald / amber / rose / violet / indigo) are reserved for **state** and **DCM domain headers**.
- Every generated UI artifact is a **card**: `bg-white border border-stone-200 rounded-lg shadow-sm` with a header strip — see [components.md](components.md).
- Icons are inline `<svg>` (Heroicons-style outline) — no icon library dependency.
- The chat surface is intentionally narrow (`max-w-3xl`) to keep generated cards legible inside a conversation column.
