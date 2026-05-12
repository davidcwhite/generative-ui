# Sidebar Transitions & Scroll Layout

Three things this covers:

1. The expand/collapse transition (effect + timing).
2. The rail's vertical layout: per-section pinned actions, a scrollable
   middle, and a fixed bottom row (e.g. a settings or logout button).
3. Collapsible sub-groups inside the section panel.

All Tailwind. Keep these patterns and the UX ports cleanly into any rail.

---

## 1. Expand / Collapse — Effect & Timing

### Two widths, one animated property

```tsx
<aside
  className={`flex h-full flex-col overflow-x-hidden border-r
              transition-[width] duration-200 ease-out motion-reduce:transition-none
              ${collapsed ? 'w-16' : 'w-72'}`}
>
```

Why each class earns its place:

- `transition-[width]` — only the width animates; nothing else gets caught
  in the 200 ms curve.
- `duration-200 ease-out` — fast enough to feel responsive, slow enough
  for the eye to track the labels fading.
- `overflow-x-hidden` — the wordmark and collapse button stay in the DOM
  and get clipped during the shrink instead of poking past the edge.
- `motion-reduce:transition-none` — respects `prefers-reduced-motion`.

### Labels fade, never unmount

Anything that disappears when collapsed (wordmark, collapse button, row
labels, section panel) fades via opacity. Same duration, faster curve:

```tsx
className={`transition-opacity duration-150 ease-out motion-reduce:transition-none
            ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
aria-hidden={collapsed || undefined}
```

The 50 ms gap (200 ms width / 150 ms opacity) means labels finish fading
just before the width finishes — feels like one motion, not two.

### Timing summary

| What                       | Class                                | Duration |
|----------------------------|--------------------------------------|----------|
| Rail width                 | `transition-[width] ease-out`        | 200 ms   |
| Labels, panel, glyph swap  | `transition-opacity ease-out`        | 150 ms   |
| Background/text colors     | `transition-colors ease-out`         | 150 ms   |
| Group chevron rotation     | `transition-transform ease-out`      | 150 ms   |

### Gotchas

- **Don't use `transition-all`.** It catches color/opacity/transform
  changes you didn't mean to animate and produces jitter.
- **Don't unmount labels** when collapsed — layout shifts. Fade only.
- **Don't omit `overflow-x-hidden`.** Without it, fading content visibly
  slides past the right edge while the width animates.

---

## 2. Top / Bottom Split + Fixed Bottom Row

The rail is a `flex flex-col` with three regions, top-to-bottom:

```
+-------------------------------+
| Brand row                     |  ← fixed height
+-------------------------------+
| Primary nav                   |  ← natural height
+-------------------------------+
| Section content (flex-1)      |  ← takes remaining space
|   ┌─ Pinned actions (shrink-0)│
|   └─ Scrollable groups        │
|       (flex-1 overflow-y-auto)│
+-------------------------------+
| Bottom row (mt-auto, border-t)|  ← settings / logout — always visible
+-------------------------------+
```

### The pieces

```tsx
<aside className="flex h-full flex-col">
  {/* Brand row — fixed height */}
  <div className="flex h-[60px] items-center px-3">...</div>

  {/* Primary nav — natural height */}
  <nav className="mt-2 flex flex-col gap-0.5 px-3">...</nav>

  {/* Section content — fills available space */}
  <SectionContent ... />

  {/* Bottom row — pushed to the very bottom by mt-auto */}
  <div className="mt-auto border-t px-3 py-3">
    <SidebarNavRow icon={Settings} label="Settings" ... />
  </div>
</aside>
```

`mt-auto` on the bottom row is what keeps it pinned. The section content
above expands (`flex-1`) to absorb the remaining vertical space.

### Inside section content — pinned actions + scrollable groups

```tsx
<div className="mt-5 flex flex-1 flex-col overflow-hidden">
  {actions && actions.length > 0 && (
    <div className="shrink-0 space-y-0.5 px-3 pb-3">
      {actions.map(renderAction)}
    </div>
  )}

  <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
    {groups.map(renderGroup)}
  </div>
</div>
```

Two children of a `flex-col`:

- **Pinned actions** — `shrink-0`. Stays put. This is where "New chat",
  "Search chats", or any other section-specific quick action lives.
- **Scrollable groups** — `flex-1 overflow-y-auto`. Absorbs the rest and
  scrolls independently.

### Per-section behavior: Agents vs. the others

Pinned actions are keyed by section id. Only sections that have actions
get the pinned region:

```tsx
const sectionActions = {
  agents: [
    { label: 'New chat',     icon: Plus,   onClick: newChat },
    { label: 'Search chats', icon: Search, onClick: openSearch },
  ],
  // documents: undefined — no pinned region rendered
  // data:      undefined — no pinned region rendered
};

<Sidebar sectionActions={sectionActions} ... />
```

Result:

- **Agents** — "New chat" and "Search chats" pinned at the top; history
  scrolls underneath.
- **Documents / Data** — no pinned region; the entire group list scrolls
  from the top of the section content. Bottom row (settings/logout)
  still pinned.

### Porting tip: where to put a "Settings" button

Pass it as `bottomAction`. It will land in the fixed bottom row,
separated by a top border, and stays visible regardless of how many
groups or chats are in the scrollable region.

```tsx
<Sidebar bottomAction={{ label: 'Settings', icon: Settings, onClick: openSettings }} />
```

If you need **both** a settings button and a logout button, render both
inside a single wrapper passed as `bottomAction.icon`/`onClick`, or
extend the prop in your fork to accept an array. Either way, the
`mt-auto border-t` row is the slot that guarantees they stay pinned.

### Gotchas

- **Don't put pinned actions inside the scrollable container.** They'll
  scroll with the rest. They must be a sibling, marked `shrink-0`.
- **Don't drop `overflow-hidden` from the outer section wrapper.** Without
  it, both children take their natural height and you lose the
  pin-vs-scroll split.
- **Don't forget `flex-1` on the scrollable child.** It needs to absorb
  remaining height for `overflow-y-auto` to do anything useful.
- **Don't hard-code the bottom row's `bottom: 0` with `position: absolute`.**
  Use `mt-auto` in the flex column — it composes with the section content
  above instead of overlapping it.
- **Don't put the pinned actions on every section by default.** Key them
  by section id so list views without quick actions (Documents/Data)
  scroll cleanly from the very top of the panel.

---

## 3. Collapsible Sub-Groups

Each context group inside the scrollable region is a `<section>` with a
toggle header. State lives **inside** the section panel — not the host —
so the API stays simple.

### State + toggle

```tsx
const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
const toggleGroup = (id: string) =>
  setCollapsedGroups((c) => ({ ...c, [id]: !c[id] }));
```

### Header (a `button` with a rotating chevron)

```tsx
<button
  type="button"
  onClick={() => toggleGroup(group.id)}
  aria-expanded={!isGroupCollapsed}
  className="flex w-full items-center justify-between rounded-md px-2 py-1.5
             text-[11px] font-semibold uppercase tracking-wider text-stone-400
             hover:text-stone-500 transition-colors"
>
  <span>{group.title}</span>
  <span className={`transition-transform duration-150 ease-out
                    ${isGroupCollapsed ? '' : 'rotate-90'}`}>
    <ChevronRight className="h-3 w-3" strokeWidth={1.75} aria-hidden />
  </span>
</button>
```

- Header is a real `<button>` — keyboard/focus accessible by default.
- `aria-expanded` is the screen-reader contract for collapsible regions.
- Chevron is one `ChevronRight` glyph rotated 90° via CSS transform.
  Don't swap to `ChevronDown` — the transform animates, a DOM swap won't.

### Body (conditional render is fine here)

```tsx
{!isGroupCollapsed && (
  <div className="flex flex-col">
    {group.links.map(renderLink)}
  </div>
)}
```

Unlike the rail's collapse animation, group bodies *can* unmount —
they're not animating dimensions, and the chevron rotation already gives
the user the affordance that the panel is collapsing.

### Gotchas

- **Don't share collapse state across sections.** Use a `Record<string, boolean>`
  keyed by group id. Two sections that both have a "Recent" group should
  collapse independently.
- **Don't make group headers `<div>`s.** They must be `<button>`s with
  `aria-expanded` for screen readers and keyboard activation.
- **Don't conditionally swap chevron icons.** Rotate one icon with
  `transition-transform`. DOM swap = no animation + jitter.
- **Don't put the collapsible state in the host.** It bloats the host's
  props, defeats `React.memo`, and re-renders the sidebar on every group
  toggle.
- **Default state should be expanded.** Junior devs sometimes default to
  collapsed for "cleanliness" — but the first thing the user sees is
  empty groups, which reads as broken.

---

## Quick checklist

- [ ] Rail uses `transition-[width] duration-200 ease-out` (not `transition-all`).
- [ ] Labels and panel fade with `transition-opacity duration-150` and
      `pointer-events-none` when hidden — never unmount.
- [ ] Rail is `flex flex-col`; section content is `flex-1`; bottom row
      uses `mt-auto border-t`.
- [ ] Pinned actions are a `shrink-0` sibling of the scrollable groups,
      not nested inside it.
- [ ] Pinned actions are keyed by section id; absent for sections that
      shouldn't show any.
- [ ] Group state is owned by the section panel, keyed by group id.
- [ ] Group headers are `<button>`s with `aria-expanded`; chevron is a
      single rotated `ChevronRight`.
- [ ] All transitions paired with `motion-reduce:transition-none`.
