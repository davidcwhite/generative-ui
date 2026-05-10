# Sidebar — Reusable Component

A persistent left-rail sidebar with collapsible width, three top-level nav
sections, per-section pinned actions, a scrollable groups panel, instant
hover-tooltips on the collapsed rail, and smooth no-flash transitions. Drop
into any React + Tailwind project, supply your data, re-theme in one place.

> **Layout-agnostic.** Everything below describes the *logical* component —
> what it renders, how it behaves, and the props it accepts. Whether you keep
> the whole thing in a single `Sidebar.tsx` or split it across multiple files
> (chip, nav row, section content, tooltip, theme, types) is purely an
> internal organization choice. The public surface is the same either way.

---

## Quick start

1. Bring the `Sidebar` source into your project (one file or several — your
   call).
2. `npm install lucide-react react-dom` (Tailwind 3+ assumed).
3. Render `<Sidebar />` with your data:
   ```tsx
   import { Sidebar } from './Sidebar';
   import { MessageSquare, FileText, BarChart3, Plus, LogOut } from 'lucide-react';

   <Sidebar
     sections={[
       { id: 'chats', label: 'Chats', icon: MessageSquare },
       { id: 'docs',  label: 'Docs',  icon: FileText },
       { id: 'data',  label: 'Data',  icon: BarChart3 },
     ]}
     activeSectionId={section}
     onSectionChange={setSection}
     sectionActions={{ chats: [{ label: 'New chat', icon: Plus, onClick: newChat, tone: 'muted' }] }}
     contextGroups={groups}
     onLinkClick={(link) => open(link.id)}
     bottomAction={{ label: 'Logout', icon: LogOut, onClick: logout }}
   />
   ```
4. Edit the `SIDEBAR_THEME` map (see [Theme tokens](#theme-tokens)) to
   change colors; pass your own `logo` and `brandName` props for branding.

---

## Layout & geometry

```
+------------------- w-72 expanded / w-16 collapsed -------------------+
| Brand row (h-[60px])    [chip 9x9]  Brand name      [collapse 8x8]   |
|                                                                      |
| Primary nav (mt-2)      Sections (Agents / Docs / Data)              |
|                                                                      |
| Section content (mt-5, flex-col)                                     |
|   Pinned actions (shrink-0)        e.g. "New chat", "Search chats"   |
|   ---------------------------                                        |
|   Scrollable groups (flex-1 overflow-y-auto)                         |
|     Group header (button)                                            |
|     Links (active / hover / deletable)                               |
|                                                                      |
| Bottom action (mt-auto, border-t)   e.g. "Logout"                    |
+----------------------------------------------------------------------+
```

**Icon slot pattern.** Every row reserves an `h-5 w-10` cell for its icon:

```tsx
<span className="flex h-5 w-10 shrink-0 items-center justify-center">
  <Icon className="h-5 w-5" />
</span>
```

The slot keeps icons centered at the same x-coordinate in both states, so
chips don't wobble horizontally when the label fades.

---

## Widths and width transition

| State     | Width  | Class    |
|-----------|--------|----------|
| Expanded  | 288 px | `w-72`   |
| Collapsed |  64 px | `w-16`   |

The rail animates between them via:

```tsx
className="transition-[width] duration-200 ease-out motion-reduce:transition-none"
```

200 ms is the sweet spot — fast enough to feel responsive, slow enough that
the eye can track the section content fading.

---

## The brand chip's four-state ladder

The chip swaps its background based on (a) whether the rail is collapsed,
(b) whether the cursor is in the rail, and (c) whether the cursor is on the
chip directly:

| State                                              | Background      | Glyph         |
|----------------------------------------------------|-----------------|---------------|
| Expanded                                           | dark pill       | brand mark    |
| Collapsed + idle (no hover)                        | dark pill       | brand mark    |
| Collapsed + rail hovered, cursor **not** on chip   | transparent     | `PanelLeft`   |
| Collapsed + cursor **directly** on chip            | light-grey pill | `PanelLeft`   |

This preserves brand identity at rest, gives the rail-hover state a subtle
"hint" affordance, and only fully promotes to a click target when you're
actually on it.

```tsx
const bg = !collapsed
  ? 'cursor-default bg-[#1A1A1A] text-white'
  : chipHovered
  ? 'cursor-pointer bg-[#EEEEEC] text-stone-700'
  : railHovered
  ? 'cursor-pointer bg-transparent text-stone-700'
  : 'cursor-pointer bg-[#1A1A1A] text-white';
```

---

## Icon swap as opacity layers (not DOM swap)

The brand mark and `PanelLeft` are stacked as two absolutely-positioned
spans and cross-faded by toggling opacity. No conditional render, no layout
shift:

```tsx
<button className="relative h-9 w-9 overflow-hidden ...">
  <span className={`absolute inset-0 ... transition-opacity duration-150 ${collapsed && railHovered ? 'opacity-0' : 'opacity-100'}`}>
    {logo}
  </span>
  <span className={`absolute inset-0 ... transition-opacity duration-150 ${collapsed && railHovered ? 'opacity-100' : 'opacity-0'}`}>
    <PanelLeft className="h-5 w-5" />
  </span>
</button>
```

---

## Collapse without flashing

Naive collapse — `setCollapsed(true)` — produces a visible 150-200 ms flash
of the `PanelLeft` glyph on the chip during the width animation: the cursor
is still over the rail, so `railHovered` is true, so the swap rule fires
right as the rail starts shrinking, then `mouseLeave` finally arrives.

Fix: clear `railHovered` **before** flipping `collapsed`:

```tsx
const handleCollapse = useCallback(() => {
  setRailHovered(false);
  setCollapsed(true);
}, [setCollapsed]);

const handleExpand = useCallback(() => {
  setRailHovered(false);
  setCollapsed(false);
}, [setCollapsed]);
```

Used by both the top-right collapse button and the chip's open-sidebar click.

---

## Tooltips (portal, fixed, instant, anchored right)

The rail has `overflow-x-hidden` (so the collapse button doesn't poke past
the rail edge during the width animation). Tooltips would be clipped, so
they render through a portal directly onto `document.body` with viewport-
fixed coordinates:

```tsx
function RailTooltip({ label, anchor, show }) {
  if (!show || !anchor) return null;
  const rect = anchor.getBoundingClientRect();
  return createPortal(
    <span
      role="tooltip"
      style={{
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
        transform: 'translateY(-50%)',
        zIndex: 60,
      }}
      className="pointer-events-none whitespace-nowrap rounded-md bg-[#1A1A1A] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
    >
      {label}
    </span>,
    document.body,
  );
}
```

**Instant.** No `setTimeout`, no delay state. A single hook drives every
rail control's tooltip:

```tsx
function useRailTooltip(shouldShow: boolean) {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    show: shouldShow && hovered,
    bind: { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) },
  };
}
```

`shouldShow` is the gate (typically `collapsed`); `bind` is spread onto the
target element.

---

## Section content: pinned actions + scrollable groups

The section content is a `flex-col`. If the active section has actions,
they sit in a `shrink-0` block at the top; everything else scrolls beneath
in a `flex-1 overflow-y-auto` region:

```tsx
<div className="mt-5 flex flex-1 flex-col overflow-hidden ...">
  {actions && <div className="shrink-0 px-3 pb-3">{/* New chat, Search chats */}</div>}
  <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
    {groups.map(renderGroup)}
  </div>
</div>
```

Sections with no actions just scroll from the top of the section content.
The "scroll boundary" sits exactly where you visually expect it to.

---

## Collapsible groups

Group state lives inside the sidebar (in whichever subtree renders the
groups), not in the host:

```tsx
const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
```

Group headers are buttons; the chevron is a `ChevronRight` rotated 90deg
via a CSS transform when the group is open:

```tsx
<span className={`transition-transform duration-150 ${isGroupCollapsed ? '' : 'rotate-90'}`}>
  <ChevronRight className="h-3 w-3" />
</span>
```

---

## Selection, hover, and tone

| Surface              | Default                | Hover                                          | Active                                 |
|----------------------|------------------------|------------------------------------------------|----------------------------------------|
| Nav row              | `text-stone-700`       | `hover:bg-[#EEEEEC] hover:text-[#1A1A1A]`      | `bg-[#E5E5E3] text-[#1A1A1A]`          |
| Nav row (`muted`)    | `text-stone-600`       | `hover:bg-[#EDEDEB] hover:text-[#1A1A1A]`      | —                                      |
| Link (content)       | `text-stone-800`       | `hover:bg-[#EEEEEC]`                           | `bg-[#E5E5E3] text-[#1A1A1A] font-medium` |
| Group header         | `text-stone-400`       | `hover:text-stone-500`                         | —                                      |
| Delete affordance    | `text-stone-400` (opacity 0) | `opacity-100 hover:bg-stone-200/60 hover:text-stone-700` on row hover | — |

Two distinct grays — `#E5E5E3` for "this is selected" and `#EEEEEC` for
"you are hovering" — give clear feedback without ever feeling loud. The
active state is the only thing that needs to read as selected; hover stays
quiet.

---

## Smooth transitions checklist

The "clean" feel comes from a small, consistent set of rules:

- **Width**: `transition-[width] duration-200 ease-out`.
- **Color / background**: `transition-colors duration-150 ease-out`.
- **Opacity layers** (label fade, icon swap, divider, section-content fade): `transition-opacity duration-150 ease-out`.
- **Reduced motion**: every transition is paired with `motion-reduce:transition-none`.
- **Single DOM structure**. Never conditionally render based on collapsed
  state — animate it. Hidden elements get `opacity-0`, `pointer-events-none`,
  and `aria-hidden`. No element appears or disappears from the tree as the
  rail collapses, so there's nothing to "jump".

---

## Hover state isolation

Two hover signals are tracked independently:

- **Rail-hovered**: `<aside onMouseEnter / onMouseLeave>`. Drives the icon
  swap on the brand chip.
- **Chip-hovered**: the chip button's own listeners (via
  `useRailTooltip`'s `bind`). Drives the chip's background fill **and** the
  chip's own tooltip.

Why separate? If the chip's background were gated on `railHovered`, the
dark brand identity would die the moment the cursor entered the rail
anywhere. Gating it on `chipHovered` keeps the dark idle state alive until
the cursor actually arrives at the chip.

---

## Performance

`Sidebar` is exported via `React.memo`. To get the benefit, the host must
keep the props referentially stable:

```tsx
const sections = useMemo<SidebarSection[]>(() => [...], []);
const sectionActions = useMemo(() => ({ chats: [...] }), [handleNewChat]);
const contextGroups = useMemo(() => buildGroups(activeSection, data), [activeSection, data]);
const onLinkClick = useCallback((link) => { ... }, [deps]);
const isLinkActive = useCallback((link) => link.id === activeId, [activeId]);
```

With this in place the sidebar does not re-render on unrelated parent
state changes — e.g. typing in a chat input next to it.

---

## Theme tokens

All colors live in a single `SIDEBAR_THEME` map as Tailwind class strings
keyed by semantic role (put it in its own module, or co-locate it at the
top of `Sidebar.tsx` — doesn't matter):

```ts
export const SIDEBAR_THEME = {
  rail:           { bg, border },
  brand:          { chipBg, chipText, chipHoverBg, chipHoverText, wordmark },
  row:            { activeBg, activeText, defaultText, mutedText, defaultHover, mutedHover },
  link:           { activeBg, activeText, hoverBg, defaultText, emptyText },
  group:          { headerText, headerHover },
  delete:         { text, hoverBg, hoverText },
  collapseButton: { text, hoverBg, hoverText },
  tooltip:        { bg, text },
  focusRing:      'focus-visible:ring-stone-300',
} as const;
```

To re-theme: edit the strings. Tailwind's JIT scans wherever this map
lives, so arbitrary values like `bg-[#1A1A1A]` work without config. To
change the brand mark or name, pass the `logo` and `brandName` props (no
theme edit needed).

---

## Props API

Full TypeScript types are exported alongside the component
(`SidebarProps`, `SidebarSection`, `SidebarLink`, `SidebarContextGroup`,
`SidebarActionRow`). Brief:

| Prop                  | Type                                        | Purpose                                                          |
|-----------------------|---------------------------------------------|------------------------------------------------------------------|
| `brandName`           | `string?`                                   | Wordmark next to the chip. Default `'Primary Flow'`.             |
| `logo`                | `ReactNode?`                                | Brand mark inside the chip. Default `<PFLogoMark />`.            |
| `sections`            | `SidebarSection[]`                          | Top-level nav: `{ id, label, icon: LucideIcon }`.                |
| `activeSectionId`     | `string`                                    | Which section is selected.                                       |
| `onSectionChange`     | `(id: string) => void`                      | Called when a section icon is clicked.                           |
| `sectionActions`      | `Record<string, SidebarActionRow[]>?`       | Optional pinned actions, keyed by section id.                    |
| `contextGroups`       | `SidebarContextGroup[]`                     | Scrollable groups for the active section.                        |
| `onLinkClick`         | `(link, group) => void?`                    | Called when a link in a group is clicked.                        |
| `onLinkDelete`        | `(link) => void?`                           | If supplied, shows a trash icon on link hover.                   |
| `isLinkActive`        | `(link) => boolean?`                        | Predicate: highlight the link as selected.                       |
| `isLinkDeletable`     | `(link) => boolean?`                        | Predicate: gate showing the delete affordance.                   |
| `isLinkDisabled`      | `(link) => boolean?`                        | Predicate: render the link as a non-clickable empty state.       |
| `bottomAction`        | `SidebarActionRow?`                         | Bottom-anchored row above the border (e.g. Logout).              |
| `collapsed`           | `boolean?`                                  | Controlled collapsed state. Omit for uncontrolled.               |
| `defaultCollapsed`    | `boolean?`                                  | Initial collapsed state when uncontrolled. Default `false`.      |
| `onCollapsedChange`   | `(collapsed: boolean) => void?`             | Fires when the user toggles collapse.                            |
| `className`           | `string?`                                   | Extra classes on the outer `<aside>`.                            |

---

## Porting checklist

- Bring the `Sidebar` source into your project (one file or several).
- `npm install lucide-react react-dom`.
- Make sure Tailwind 3+ is set up (or replace classes with your CSS-in-JS).
- Wire your data into `sections`, `sectionActions`, `contextGroups`.
- Pick your own `logo` and `brandName`.
- Re-theme via the `SIDEBAR_THEME` map.
- Memoize the props in your host component (see Performance).

---

## Component anatomy

A logical breakdown of what's inside the sidebar. Keep these as separate
modules, or inline them all into a single `Sidebar.tsx` — the public
behavior is identical either way.

| Piece                       | Responsibility                                                                                                                |
|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| **Sidebar** (root)          | Outer `<aside>`. Owns `collapsed` (controllable) and `railHovered`. Renders brand row, primary nav, section content, optional bottom action. Wrapped in `React.memo`. |
| **BrandChip**               | The dark/transparent/light-grey pill at top-left. Implements the four-state ladder; cross-fades brand mark ↔ `PanelLeft` via stacked opacity layers. |
| **SidebarNavRow**           | The row primitive used for primary nav, pinned actions, and the bottom action. Reserves the `h-5 w-10` icon slot. Shows a tooltip when collapsed. |
| **SectionContent**          | Body below primary nav. Pinned actions (if any) on top, scrollable region of collapsible groups beneath. Owns per-group collapse state. |
| **RailTooltip** + **useRailTooltip** | Portal-rendered fixed-position tooltip and the shared hover hook (`show = shouldShow && hovered`).                   |
| **SIDEBAR_THEME**           | Object of Tailwind class strings keyed by semantic role. The single re-theme surface.                                         |
| **Types**                   | `SidebarProps`, `SidebarSection`, `SidebarLink`, `SidebarContextGroup`, `SidebarActionRow`.                                   |
