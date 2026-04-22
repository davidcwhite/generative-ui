# Icons

There is **no icon library**. Every icon is an inline `<svg>` element written directly into the JSX, allowing per-instance sizing and color via Tailwind utilities. This keeps the bundle small and means icons inherit `currentColor`.

## Convention

```tsx
<svg
  className="w-5 h-5 text-stone-600"
  fill="none"
  stroke="currentColor"
  viewBox="0 0 24 24"
>
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    d="…"
  />
</svg>
```

- **Source family**: paths are taken from [Heroicons](https://heroicons.com/) — outline (24/outline) for nav and inline icons, solid (20/solid) for the ExportPanel format icons.
- **viewBox**: `0 0 24 24` for outline icons, `0 0 20 20` for the solid file-format icons in [client/src/components/dcm/ExportPanel.tsx](../../client/src/components/dcm/ExportPanel.tsx).
- **Stroke**: outline icons use `fill="none" stroke="currentColor" strokeWidth={2}` with rounded caps/joins.
- **Color**: never set `fill`/`stroke` to a hex; use `text-stone-XXX` so the icon reflows with theme changes.
- **Sizing**:
  - `w-3.5 h-3.5` (~14px) — inline action icons inside dense rows (delete in History flyover, provenance shield)
  - `w-4 h-4` (16px) — chat input controls (search, attach, send, stop), chips with leading icon
  - `w-5 h-5` (20px) — rail nav, mobile menu items, summary callouts (EntityPicker info, trend arrows), ExportPanel format buttons
  - `w-6 h-6` (24px) — mobile hamburger only

## Where each icon lives

The catalog below uses the shorthand `[file:line ranges]` of where the SVG `d=` is authored.

### App shell ([client/src/App.tsx](../../client/src/App.tsx))

| Icon | Purpose | Path |
|---|---|---|
| Hamburger | Open mobile menu | `M4 6h16M4 12h16M4 18h16` |
| Close (X) | Dismiss menu / delete chat | `M6 18L18 6M6 6l12 12` |
| Plus | New chat | `M12 4v16m8-8H4` |
| Clock | History / chat | `M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z` |
| Bar-chart (3 columns) | Data Viewer / Dashboard | `M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z` |
| Logout (door + arrow) | Sign out | `M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1` |
| Bookmark | Pin sidebar | `M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z` |

### Chat input ([client/src/App.tsx](../../client/src/App.tsx) footer)

| Icon | Purpose | Path |
|---|---|---|
| Magnifying glass | Search (placeholder) | `M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z` |
| Paperclip | Attach (placeholder) | `M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13` |
| Up-arrow (send) | Submit message | `M5 10l7-7m0 0l7 7m-7-7v18` |
| Stop (filled square) | Cancel generation (`fill="currentColor"`) | `<rect x="6" y="6" width="12" height="12" rx="1" />` |
| Right-arrow (suggestion) | Empty-state suggestion buttons | `M17 8l4 4m0 0l-4 4m4-4H3` |
| Spinner | "Thinking…" — uses `animate-spin` with two paths (circle outline + arc head) | see App.tsx `isLoading` block |

### Domain components

| Icon | Component | Path |
|---|---|---|
| Info / question circle | [EntityPicker](../../client/src/components/dcm/EntityPicker.tsx) header | `M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z` |
| Trend up | [ComparableDealsPanel](../../client/src/components/dcm/ComparableDealsPanel.tsx), [SecondaryPerformanceView](../../client/src/components/dcm/SecondaryPerformanceView.tsx) (Tightening) | `M13 7h8m0 0v8m0-8l-8 8-4-4-6 6` |
| Trend down | [SecondaryPerformanceView](../../client/src/components/dcm/SecondaryPerformanceView.tsx) (Widening) | `M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6` |
| Flat line | [SecondaryPerformanceView](../../client/src/components/dcm/SecondaryPerformanceView.tsx) (Stable) | `M5 12h14` |
| Check | [ExportPanel](../../client/src/components/dcm/ExportPanel.tsx) success | `M5 13l4 4L19 7` |
| Shield-check | [ExportPanel](../../client/src/components/dcm/ExportPanel.tsx) provenance | `M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z` |

### File-format icons (solid, 20×20)

In [client/src/components/dcm/ExportPanel.tsx](../../client/src/components/dcm/ExportPanel.tsx) the export buttons use solid Heroicons-style glyphs:

- **PDF / file** — `M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z`
- **PPTX (slide)** — `M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z`
- **XLSX (table grid)** — composite of two paths, the second drawing four cells
- **Email (envelope)** — composite of two paths drawing the flap + body

These are the only icons that use `fill="currentColor"` (solid) instead of stroked paths.

## Trend glyph fallback

The dashboard's [SecondaryView](../../client/src/components/dashboard/SecondaryView.tsx) uses Unicode arrows directly inside chip text instead of SVGs:

```tsx
{item.trend === 'Tightening' && '↓'}
{item.trend === 'Widening' && '↑'}
{item.trend === 'Stable' && '→'}
```

This is the only place we use textual arrows — every other trend indicator uses the SVG paths above.

## Adding a new icon

1. Find the glyph in Heroicons (prefer 24/outline).
2. Copy the `<path>` data into the JSX, wrapped in the standard `<svg>` shell above.
3. Use `currentColor` and a Tailwind `text-*` class — never hard-code `stroke`/`fill` hex.
4. Pick a size from the scale (`w-3.5`, `w-4`, `w-5`, `w-6`).
5. Reuse an existing semantic color (see [colors.md](colors.md)) — for example, success uses `text-emerald-600`, errors use `text-red-600`.
