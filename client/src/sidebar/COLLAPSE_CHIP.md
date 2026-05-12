# Sidebar Collapse / Expand — Brand Chip

A focused spec + reference implementation for the brand-chip-driven
collapse/expand interaction.

---

## 1. Mini PRD

**Goal.** A persistent left rail that collapses to a narrow strip but never
loses brand identity, and only telegraphs "click to expand" when the user
is actually looking at the rail.

**Functional requirements.**

1. **Two widths.** Expanded ~288 px, collapsed ~64 px. Animated (~200 ms).
2. **Always-present brand chip.** Top-left, in both states. At rest: brand
   mark on a dark pill.
3. **Rail-hover hint.** Cursor anywhere in the collapsed rail → brand mark
   cross-fades to an expand glyph (e.g. `PanelLeft`) on a transparent
   background (outline only).
4. **Direct-hover affordance.** Cursor on the chip itself → chip lights up
   with a light-grey pill background. Glyph stays the expand glyph.
5. **Reversible.** Cursor leaves the chip but stays in the rail → returns
   to the hint state. Cursor leaves the rail → returns to brand identity.
6. **Click to expand.** Click the chip while collapsed → rail expands. No
   flash during the width animation.
7. **Collapse control.** When expanded, a separate collapse button in the
   brand row triggers the reverse. Same no-flash guarantee.
8. **Reduced motion.** All transitions disabled under
   `prefers-reduced-motion`.
9. **Focus model.** Chip is a focusable button only when collapsed; when
   expanded it's decorative (`tabIndex={-1}`, `aria-hidden`).

**Non-goals.** Mobile drawer. Persisting the collapsed state across
sessions (host's responsibility).

---

## 2. Implementation

Three pieces of state, one ternary, two anti-flash tricks.

### State

```tsx
const [collapsed, setCollapsed] = useState(false);
const [railHovered, setRailHovered] = useState(false);
const { hovered: chipHovered, bind } = useRailTooltip(collapsed);
```

### Rail-level hover (outer `<aside>`)

```tsx
<aside
  onMouseEnter={() => setRailHovered(true)}
  onMouseLeave={() => setRailHovered(false)}
  className={`transition-[width] duration-200 ease-out motion-reduce:transition-none ${
    collapsed ? 'w-16' : 'w-72'
  }`}
>
```

### Chip background — the four-state ladder

Background is gated on `chipHovered` (not `railHovered`) once collapsed,
so the dark brand identity survives a cursor entering the rail elsewhere:

```tsx
const bg = !collapsed
  ? 'bg-[#1A1A1A] text-white'         // expanded: dark pill
  : chipHovered
  ? 'bg-[#EEEEEC] text-stone-700'     // collapsed + direct hover
  : railHovered
  ? 'bg-transparent text-stone-700'   // collapsed + rail-hover only
  : 'bg-[#1A1A1A] text-white';        // collapsed + idle
```

### Glyph cross-fade via stacked opacity layers

Both glyphs stay in the DOM; only opacity toggles. No DOM swap, no layout
shift, smooth cross-fade:

```tsx
<button
  {...bind}
  onClick={collapsed ? handleExpand : undefined}
  tabIndex={collapsed ? 0 : -1}
  aria-hidden={collapsed ? undefined : true}
  className={`relative h-9 w-9 overflow-hidden rounded-lg transition-colors duration-150 ease-out motion-reduce:transition-none ${bg}`}
>
  <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 motion-reduce:transition-none ${
    collapsed && railHovered ? 'opacity-0' : 'opacity-100'
  }`}>
    <BrandMark className="h-5 w-5" />
  </span>
  <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 motion-reduce:transition-none ${
    collapsed && railHovered ? 'opacity-100' : 'opacity-0'
  }`}>
    <PanelLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden />
  </span>
</button>
```

### Anti-flash trick: clear `railHovered` before flipping `collapsed`

Without this, the chip displays `PanelLeft` for ~150 ms mid-animation —
`mouseLeave` hasn't fired yet, so the swap rule briefly remains true while
the rail is already shrinking.

```tsx
const handleCollapse = () => {
  setRailHovered(false); // do this first
  setCollapsed(true);
};

const handleExpand = () => {
  setRailHovered(false);
  setCollapsed(false);
};
```

Use these handlers from both the chip's `onClick` (expand) and the
in-brand-row collapse button (collapse).

### Tooltip on the chip (when collapsed)

Same instant tooltip hook the rest of the rail uses. `useRailTooltip` owns
the hover state and gates visibility on a `shouldShow` flag:

```tsx
function useRailTooltip(shouldShow: boolean) {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    show: shouldShow && hovered,
    bind: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  };
}
```

The tooltip itself renders through `createPortal(..., document.body)` so
it isn't clipped by the rail's `overflow-x-hidden`.

---

## 3. Where this lives in this repo

`client/src/App.tsx` only wires the sidebar into the app. It prepares the
sections, actions, context groups, callbacks, and renders `<Sidebar />`.

The collapse/expand behavior itself lives in `client/src/sidebar/Sidebar.tsx`:

- `useControllableCollapse(...)` chooses controlled vs local collapsed state.
- `collapsed` controls the rail width: `w-16` collapsed, `w-72` expanded.
- `railHovered` is set by the outer `<aside onMouseEnter/onMouseLeave>`.
- `BrandChip` owns the four-state chip visual logic.
- `handleCollapse` / `handleExpand` clear `railHovered` before flipping
  `collapsed`, preventing the expand-icon flash.

Supporting files:

- `client/src/sidebar/PFLogoMark.tsx` defines the default SVG brand mark.
- `client/src/sidebar/RailTooltip.tsx` provides `useRailTooltip`, which gives
  the chip its direct-hover state and instant tooltip.
- `client/src/sidebar/theme.ts` contains the dark chip, light-grey hover,
  rail, tooltip, and focus-ring class tokens.
- `client/src/sidebar/SidebarNavRow.tsx` applies the same collapsed tooltip
  and fixed icon-slot pattern to normal rail items.

---

That's the whole behavior: three booleans, one ternary, two opacity layers,
one `setRailHovered(false)` line before each state flip.
