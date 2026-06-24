# Inline Rename + Save Shimmer

This is the [Inline Rename](./inline-rename.md) recipe **plus** a one-shot
"sheen" that sweeps across the title the moment a rename is saved — a small,
delightful confirmation that the value was committed. This document is
self-contained: you can implement it without reading the base doc.

Stack assumed: **React 18+** and **Tailwind CSS**. Plain-CSS notes included.

---

## 1. What you get

- Everything from inline rename (edit in place, Enter saves, Escape cancels).
- On save, a narrow bright **glint travels once, left → right, across the title
  glyphs only** (not a box behind the text), then disappears.
- The effect is **toggleable** (`shimmerOnSave`) and is **disabled under
  `prefers-reduced-motion`**.

The sheen is the single hardest part to get right, so the bulk of this doc
explains exactly why each CSS value is what it is.

---

## 2. The CSS (the important part)

```css
/* One-shot left-to-right specular glint, clipped to the glyphs.
   A single highlight band on a 200% NON-repeating gradient: the text stays
   fully painted the whole time (no flash), and the glint crosses exactly once.
   Ease-in (slow → fast) makes it read as "narrow at rest, then streaking". */
.title-sheen {
  background-image: linear-gradient(
    90deg,
    #292524 0%,
    #292524 12%,
    #a8a29e 32%,
    #ffffff 50%,
    #a8a29e 68%,
    #292524 88%,
    #292524 100%
  );
  background-repeat: no-repeat;
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: title-sheen 230ms cubic-bezier(0.5, 0, 0.75, 0) 1 both;
}

@keyframes title-sheen {
  from { background-position: 100% 0; }
  to   { background-position: 0% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .title-sheen {
    animation: none;
    background: none;      /* reset background-image */
    color: #292524;        /* show the plain title color */
  }
}
```

### Why each value — read this before tweaking

This is the part people get wrong (repeatedly). The rules below guarantee a
**single, clean pass**:

1. **`background-clip: text` + `color: transparent`** paints the gradient
   *through the letterforms*, so the shimmer is on the text itself, never a
   rectangle behind it. Always ship the `-webkit-` prefix too — Safari/Chrome
   still need it.

2. **One highlight band.** The gradient is dark (`#292524`, your text color) at
   both ends and bright (`#ffffff`) only at the centre, with soft `#a8a29e`
   (stone-400) shoulders. One bright stop = one glint. The base color equals the
   resting text color so the text looks normal at the start/end frames.

3. **`background-repeat: no-repeat` is mandatory.** With the default `repeat`,
   the gradient *tiles*, so a second copy of the highlight can slide into view —
   that's the infamous "double shimmer". Turn repeat off.

4. **`background-size: 200%` (not 300%+).** At 200% the gradient is twice the
   text width. As `background-position` animates from `100%` → `0%`, the image
   always fully covers the text box, so the glyphs are **never unpainted** (no
   transparent "flash"). Wider sizes (e.g. 300% non-repeating) leave the text
   momentarily uncovered = invisible text at the extremes. 200% is the sweet
   spot: full coverage *and* one pass.

5. **Direction = `100%` → `0%`** moves the bright core from the left edge to the
   right edge — i.e. a natural left-to-right sweep. (Percentage
   `background-position` with an oversized image is counter-intuitive; this
   direction is the one that reads L→R. Don't overthink it — just keep these two
   keyframe values.)

6. **Easing `cubic-bezier(0.5, 0, 0.75, 0)`** is an aggressive ease-in: gentle
   start, fast finish. The acceleration makes the glint feel like it "whips" off
   the end and reads as *narrow then wide* without any extra work.

7. **Duration `230ms`, iteration `1`, fill `both`.** Short and single. `both`
   holds the final frame until the class is removed by React.

### Tuning cheatsheet

| You want… | Change |
|---|---|
| Quicker / slower | `animation` duration (e.g. `230ms` → `400ms`) |
| Wider / narrower band | Move the shoulder stops (`12%/88%` outward = wider, inward = narrower) |
| Brighter / softer | Centre stop color (`#ffffff` → `#f5f5f4`) |
| More/less "whip" | Easing (`cubic-bezier(0.32,0,0.67,0)` is gentler; `(0.5,0,0.75,0)` snappier) |

> ⚠️ Don't increase `background-size` past ~250% with `no-repeat`, or the text
> will flash invisible at the start/end. If you want a longer sweep, increase
> **duration**, not size.

---

## 3. Wiring it in React

The parent already owns `editingId` for the rename. Add a transient `savedId`
that turns the sheen on for one item, then clears itself after the animation.

```tsx
// ChatList.tsx
import { useCallback, useEffect, useState } from 'react';
import { ChatRow } from './ChatRow';
import type { ChatListItem } from './types';

const SHEEN_MS = 330; // a little longer than the CSS animation (230ms)

interface ChatListProps {
  items: ChatListItem[];
  activeId: string | null;
  shimmerOnSave?: boolean;          // toggle the effect
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function ChatList({
  items,
  activeId,
  shimmerOnSave = true,
  onSelect,
  onRename,
}: ChatListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Auto-clear the sheen flag once the animation has finished.
  useEffect(() => {
    if (!savedId) return;
    const timer = window.setTimeout(() => setSavedId(null), SHEEN_MS);
    return () => window.clearTimeout(timer);
  }, [savedId]);

  const handleSave = useCallback(
    (id: string, title: string) => {
      onRename(id, title);
      setEditingId(null);
      if (shimmerOnSave) setSavedId(id);
    },
    [onRename, shimmerOnSave],
  );

  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <ChatRow
          key={item.id}
          item={item}
          active={item.id === activeId}
          editing={editingId === item.id}
          saved={savedId === item.id}
          onSelect={() => {
            setEditingId(null);
            onSelect(item.id);
          }}
          onStartRename={() => setEditingId(item.id)}
          onSave={(title) => handleSave(item.id, title)}
          onCancel={() => setEditingId(null)}
        />
      ))}
    </ul>
  );
}
```

The row is identical to the base recipe except the **title span** conditionally
gets the `title-sheen` class:

```tsx
// inside ChatRow.tsx — display branch only
<button
  type="button"
  onClick={onSelect}
  className="min-w-0 flex-1 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400"
>
  <span
    className={`block truncate text-sm font-medium text-stone-800 ${
      saved ? 'title-sheen' : ''
    }`}
  >
    {item.title}
  </span>
</button>
```

Add `saved: boolean` to `ChatRowProps` and thread it through. Everything else
(the edit input, Enter/Escape handling, focus+select) is unchanged from the base
recipe.

### Why this structure

- **The flag lives in the parent**, keyed by id, so exactly one row sheens at a
  time and the row stays a pure function of props.
- **Toggling the class on/off** (rather than restarting an animation
  imperatively) is the simplest reliable way to fire a one-shot CSS animation:
  add class → it plays once → remove class after it finishes.
- **`SHEEN_MS` (330) > animation (230)** gives a small buffer so the class isn't
  yanked a frame early; when it's finally removed the element reverts cleanly to
  the normal text color.
- **`shimmerOnSave` short-circuits before `setSavedId`** — when off, the class is
  never applied, so there's zero animation cost.

---

## 4. Important caveat: `background-position` vs the "transform/opacity only" rule

The Web Interface Guidelines say *"animate `transform`/`opacity` only
(compositor-friendly)."* This sheen animates `background-position`, which is a
**paint**, not a transform. That's an intentional, justified exception:

- There is no `transform`/`opacity` way to clip a moving highlight to text.
- It runs on a **single, tiny text node** for **230 ms, once** — the paint cost
  is negligible and there is **no layout** (the box never changes size).
- It is fully **gated by `prefers-reduced-motion`**.

This is the standard, accepted technique for text shimmer. Just don't apply it
to large surfaces or run it on an infinite loop over big areas.

---

## 5. Plain-CSS translation (no Tailwind)

The sheen CSS above is already framework-agnostic. The only Tailwind dependency
is the title's resting style; replicate it so the resting `color` matches the
gradient's base color (`#292524`):

```css
.chat-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;   /* 14px */
  font-weight: 500;
  color: #292524;        /* must equal the gradient's end stops */
}
```

Toggle the `.title-sheen` class on `.chat-title` exactly as the React example
does.

---

## 6. Accessibility & QA checklist

- [x] Reduced-motion users get the plain title (no animation).
- [x] The animation is **non-blocking** and purely decorative — no content is
      hidden behind it; the title is readable at every frame.
- [x] Resting `color` equals the gradient base color so there's no color "pop"
      when the class is added/removed.
- [x] Single pass — verify there is exactly **one** glint (no tiling, no flash).
- [x] Toggle off (`shimmerOnSave={false}`) → save still works, no animation.

---

## 7. Porting checklist

1. Paste the `.title-sheen` rules (incl. `@keyframes` and the reduced-motion
   block) into your global stylesheet.
2. Set the gradient end stops (`#292524`) to **your** resting title color.
3. Add `savedId` + the clear-timer effect to your list, and the `saved` prop to
   your row.
4. Apply `title-sheen` to the title element when `saved` is true.
5. Confirm: one clean L→R pass, no flash, disabled under reduced motion.
