# Sidebar Icon & Logo Alignment

How to size the rail so the logo SVG and every collapsed icon sit
dead-center, never jump on collapse/expand, and never get clipped —
regardless of how you've structured your own rail.

---

## The one rule

Match the rail's collapsed interior to a fixed **40 px slot**. Anything
that needs to be centered when collapsed lives inside that slot.

```
collapsed rail:   w-16  →  64 px
horizontal pad:   px-3  →  12 + 12 = 24 px
interior width:           64 − 24 = 40 px   → use w-10 for the slot
icon center:              12 + 20 = 32 px   → exactly rail-width / 2
```

If you change the rail width or the padding, recompute. The numbers must
land on each other or the chip will sit off-center when collapsed.

---

## Sizes used everywhere

| Element                          | Tailwind                                  | px        |
|----------------------------------|-------------------------------------------|-----------|
| Rail (expanded / collapsed)      | `w-72` / `w-16`                           | 288 / 64  |
| Row horizontal padding           | `px-3`                                    | 12 each   |
| Icon slot (chip wrapper + rows)  | `w-10` (and `h-10` for the chip wrapper)  | 40        |
| Brand chip pill                  | `h-9 w-9`                                 | 36        |
| Every icon glyph                 | `h-5 w-5` + `strokeWidth={1.75}`          | 20        |

The chip pill is 36 px inside a 40 px slot, leaving a 2 px halo on each
side — keeps the click target comfortable without breaking alignment.

---

## 1. The rail

No horizontal padding here. Width is animated. `overflow-x-hidden` is
non-negotiable — without it the wordmark and collapse button visibly slide
past the right edge during the width animation.

```tsx
<aside
  className={`flex h-full flex-col overflow-x-hidden border-r
              transition-[width] duration-200 ease-out motion-reduce:transition-none
              ${collapsed ? 'w-16' : 'w-72'}`}
>
```

---

## 2. The brand row

`px-3` lives on the row, not the rail. Items are arranged with `flex` and
`gap-3`. The chip slot is `w-10` and `shrink-0`.

```tsx
<div className="flex h-[60px] items-center gap-3 px-3">
  {/* slot — fixes the chip's horizontal position */}
  <div className="flex h-10 w-10 shrink-0 items-center justify-center">
    <BrandChip ... />
  </div>

  {/* wordmark — kept in DOM, faded when collapsed */}
  <span
    className={`min-w-0 flex-1 truncate text-sm font-semibold
                transition-opacity duration-150
                ${collapsed ? 'opacity-0' : 'opacity-100'}`}
    aria-hidden={collapsed || undefined}
  >
    {brandName}
  </span>

  {/* collapse button — kept in DOM, faded when collapsed */}
  <button
    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                transition-opacity duration-150
                ${collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
  >
    <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
  </button>
</div>
```

---

## 3. The brand chip (logo + collapsed-state expand icon)

Both glyphs share `absolute inset-0`. They occupy the **exact same rect**,
so toggling which one is opaque cannot cause any position jump.

```tsx
<button
  className="relative flex h-9 w-9 items-center justify-center
             overflow-hidden rounded-lg transition-colors duration-150"
>
  {/* layer 1: your logo */}
  <span
    className={`absolute inset-0 flex items-center justify-center
                transition-opacity duration-150
                ${collapsed && railHovered ? 'opacity-0' : 'opacity-100'}`}
  >
    <YourLogo className="h-5 w-5" />
  </span>

  {/* layer 2: collapsed-state expand icon */}
  <span
    className={`absolute inset-0 flex items-center justify-center
                transition-opacity duration-150
                ${collapsed && railHovered ? 'opacity-100' : 'opacity-0'}`}
  >
    <PanelLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden />
  </span>
</button>
```

---

## 4. Nav rows (and bottom action)

Same 40-px slot pattern, just 20 px tall. The row itself has no horizontal
padding — the parent (`<nav className="px-3">`) supplies it, and the slot
is what positions the icon.

```tsx
<button className="flex w-full items-center rounded-lg py-2">
  <span className="flex h-5 w-10 shrink-0 items-center justify-center">
    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
  </span>
  <span
    className={`ml-3 min-w-0 flex-1 truncate transition-opacity duration-150
                ${collapsed ? 'opacity-0' : 'opacity-100'}`}
  >
    {label}
  </span>
</button>
```

Result: every nav icon's center sits at the same 32 px as the chip's
center. Collapsing the rail simply fades the label; the icon doesn't move
a pixel.

---

## 5. Your logo SVG

Use `currentColor` for strokes so the logo inherits the chip's text color
in every state (white on dark, stone-700 on light grey). Stick with a
24-unit viewBox so `h-5 w-5` (20 px) matches Lucide icons optically.

```tsx
export function YourLogo({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="..." stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}
```

Match the visual weight of Lucide icons (`strokeWidth={1.75}` at the
component level translates to roughly 2.25 in 24-unit SVG coordinates).

---

## Gotchas and anti-patterns

- **Don't conditionally render the wordmark or collapse button** when
  collapsed. Removing them from the flex layout shifts the chip a few
  pixels. Always use `opacity-0 pointer-events-none` (and `aria-hidden`)
  instead — they stay in the DOM, get clipped by `overflow-x-hidden`.
- **Don't mismatch padding between rail sections.** If the brand row has
  `px-3` and the nav has `px-4`, icons won't line up vertically. Keep
  every row's horizontal padding identical.
- **Don't size the chip glyph differently from nav icons.** Both must be
  `h-5 w-5`. Mismatched sizes (e.g. `h-4` chip vs `h-5` nav) read as a
  visible step at the top of the rail.
- **Don't drop the chip directly into the flex row without a fixed `w-10`
  wrapper.** The wrapper is what pins the chip's left edge. Without it,
  small gaps or font-metric changes can drift the chip.
- **Don't omit `shrink-0` on the icon slot.** Flex will happily compress
  it under pressure, off-centering the icon when the wordmark is wide.
- **Don't conditionally render brand mark vs. expand icon.** Use stacked
  opacity layers (both `absolute inset-0`). DOM swap = layout flicker.
- **Don't forget `overflow-x-hidden` on the rail.** Without it, the
  faded wordmark and collapse button slide out past the right edge during
  the width transition.
- **Don't put tooltips on the row itself.** The rail's `overflow-x-hidden`
  will clip them. Render via `createPortal(..., document.body)` with
  `position: fixed`.
- **Don't animate `width` with `transition-all`.** Use
  `transition-[width]` so unrelated property changes don't get caught up
  in the 200 ms animation.

---

## Quick checklist

Use this when porting the pattern into a new rail:

- [ ] Rail uses `overflow-x-hidden` and `transition-[width]`.
- [ ] Collapsed width − total horizontal padding = the slot width (`w-10`
      for `w-16` + `px-3`).
- [ ] Brand chip sits in a `w-10 h-10 shrink-0` wrapper.
- [ ] Every nav row starts with a `w-10 h-5 shrink-0` icon slot.
- [ ] Every glyph is `h-5 w-5` with `strokeWidth={1.75}`.
- [ ] Logo SVG uses `viewBox="0 0 24 24"` and `currentColor`.
- [ ] Brand mark and expand icon are two `absolute inset-0` layers.
- [ ] Wordmark + collapse button fade with opacity, not by unmounting.
- [ ] Horizontal padding (`px-3`) is identical across brand row, nav, and
      every section underneath.
