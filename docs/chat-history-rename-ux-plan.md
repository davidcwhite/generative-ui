# Chat History & Rename UX — Plan

> Branch: `lab/chat-history-rename-ux`
> Lab: `client/src/lab/chat-history/`

## Goal

Design and prototype the **saved-chat list** and **rename flow** before wiring into `App.tsx` production sidebar. Deliver a self-contained lab that mirrors the rail + flyout pattern and feels polished enough to drop in.

## Current state (production)

- Sessions stored in `localStorage` (`pf-chat-sessions`), max 20.
- Titles auto-generated from first user message (40 chars + `…`).
- History flyout on rail hover: flat list, click to switch, hover delete — **no rename**.
- No grouping, no preview snippet, no keyboard nav.

## Target UX

### Saved chat list
- Flyout panel (256px) anchored to history rail icon — same `#F5F5F3` / white language as today.
- **Grouped by recency**: Today · Yesterday · Earlier (via `Intl.RelativeTimeFormat` / date buckets).
- Each row shows:
  - **Title** (truncate, `min-w-0`)
  - **Preview** — first line of last message (`line-clamp-1`, stone-400)
  - **Relative time** — tabular-nums, right-aligned
- **Active row**: stone-100 bg + 2px left accent bar (communicates selection without colour-only).
- **Empty state**: centred copy + "Start a chat" CTA.
- Click row → **select chat** (preview pane updates in lab).

### Rename flow (the "nice popover" moment)
1. Hover row → reveal **⋯** menu button (`aria-label="Chat options"`).
2. Menu item **Rename** (or click title when row is already active) → **anchored popover** below the row.
3. Popover contents:
   - Eyebrow "Rename chat"
   - Single-line `<input>` pre-filled with current title, `autoFocus` on desktop, `maxLength={80}`.
   - **Save** + **Cancel** — Enter saves, Escape cancels.
   - Inline validation if empty ("Name can't be empty").
4. On save → popover closes, title **crossfades** in place (`cf-enter`), list re-sorts if needed.
5. **Delete** in same menu → confirmation strip inside popover ("Delete this chat?" + Delete / Keep) — not immediate.

### Animation (React 18 — CSS, not ViewTransition)
React is 18.3; `<ViewTransition>` requires canary. Use compositor-friendly CSS matching existing lab tokens:

| Moment | Class / pattern | Properties |
|--------|-----------------|------------|
| Panel enter | `.ch-panel-enter` | opacity + translateX |
| Popover open | `.ch-popover` (extends `.dd-menu`) | opacity + scale + translateY |
| Title saved | `.cf-enter` | opacity crossfade |
| Row hover actions | opacity transition | opacity only |
| List reorder | none (instant) | — |

All honour `prefers-reduced-motion: reduce`.

### Accessibility (Web Interface Guidelines)
- Semantic `<nav>` + `<ul>`/`<li>` for list; popover `role="dialog"` + `aria-labelledby`.
- Icon buttons: `aria-label`; decorative SVGs `aria-hidden`.
- `focus-visible:ring-2` on all interactives; trap focus inside rename popover while open.
- `overscroll-behavior: contain` on flyout scroll area.
- Dates via `Intl.DateTimeFormat`; relative buckets computed once per render.
- Destructive delete requires explicit confirm — never one-click.

## File layout

```
client/src/lab/chat-history/
  ChatHistoryLabView.tsx       # harness: mock rail + flyout + preview pane
  mockSessions.ts              # typed mock data
  format.ts                    # date buckets + relative time
  components/
    ChatHistoryPanel.tsx       # grouped list shell
    ChatHistoryRow.tsx         # row + hover menu trigger
    ChatRenamePopover.tsx      # anchored rename / delete confirm
    ChatOptionsMenu.tsx        # ⋯ dropdown (Rename · Delete)
```

## Lab harness

- Left: mock 64px rail (history icon highlighted).
- Centre: flyout panel (always visible in lab — no hover required).
- Right: preview pane showing selected chat title + mock messages.
- Toggle: **Hover flyout** vs **Pinned panel** (two layout modes to compare).

## Integration path (later, not this PR)

1. Extract `ChatHistoryPanel` + popover components to `client/src/components/chat-history/`.
2. Replace history block in `App.tsx` (~lines 724–787).
3. Add `renameSession(id, title)` to session state alongside existing `deleteSession`.
4. Persist renamed title — stop overwriting with `generateSessionTitle` once user has renamed.

## Acceptance criteria

- [ ] Lab mode `chat_history` selectable in Experiments.
- [ ] Grouped list renders 8+ mock sessions across 3 buckets.
- [ ] Rename popover opens anchored, saves with Enter, cancels with Escape.
- [ ] Delete shows confirm step inside popover.
- [ ] Build passes; no `transition: all`; reduced-motion respected.
- [ ] Icon buttons have `aria-label`; popover traps focus.
