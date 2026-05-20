# ThinkingBlock — Portable Component

A small **4×4 dot-matrix loading indicator** for “thinking” / streaming states.
Inner dots pulse to a primary green at peak; outer dots stay soft gray — a quiet
gradient-like shimmer without looking noisy. Based on [OpenCode’s web UI
spinner](https://github.com/anomalyco/opencode/blob/dev/packages/ui/src/components/spinner.tsx),
with green accent added for active cells.

Drop into any React project. No Tailwind required (plain CSS + SVG).

> **Layout-agnostic.** Two files: a React component and a CSS file with
> keyframes. Merge into one file if you prefer; behavior is unchanged.

---

## Quick start

1. Copy `ThinkingBlock.tsx` and `thinking-block.css` into your project.
2. Import the CSS in the component (or globally).
3. Render while work is in progress:

```tsx
import { ThinkingBlock } from './ThinkingBlock';

{isStreaming && (
  <div aria-live="polite" aria-busy="true">
    <ThinkingBlock size={18} />
  </div>
)}
```

---

## Visual model

```
Grid indices (4×4, corners hidden):

  ·  ■  ■  ·
  ■  ■  ■  ■
  ■  ■  ■  ■
  ·  ■  ■  ·

■ outer  — soft gray pulse (low opacity, stone tones)
■ inner  — gray → primary green at peak (indices 5, 6, 9, 10)
· corner — opacity 0 (never shown)
```

Each visible cell is a `3×3` rounded rect in a `15×15` viewBox, spaced on a
4px grid. Random **delay** (0–1.8s) and **duration** (1.2–2.4s) per cell create
the organic, non-synchronized shimmer.

---

## Props

| Prop        | Type              | Default | Description                          |
|-------------|-------------------|---------|--------------------------------------|
| `size`      | `number`          | `16`    | Width/height in px (square)          |
| `className` | `string`          | `''`    | Extra classes on the `<svg>`         |
| `style`     | `CSSProperties`   | —       | Inline styles (merged with size)     |

The root SVG sets `aria-hidden` — pair with visible status text or
`aria-live` on a parent (see [Accessibility](#accessibility)).

---

## Files to copy

### `thinking-block.css`

```css
@keyframes oc-pulse-green-active {
  0%,
  100% {
    opacity: 0.4;
    fill: #d6d3d1; /* inactive gray */
  }
  50% {
    opacity: 1;
    fill: #10b981; /* primary green at peak */
  }
}

@keyframes oc-pulse-green-soft {
  0%,
  100% {
    opacity: 0.15;
    fill: #e7e5e4;
  }
  50% {
    opacity: 0.45;
    fill: #a8a29e;
  }
}

[data-component='thinking-block'] {
  flex-shrink: 0;
  width: 16px;
  aspect-ratio: 1;
}
```

### `ThinkingBlock.tsx` (minimal portable version)

```tsx
import type { CSSProperties } from 'react';
import './thinking-block.css';

const INNER_INDICES = new Set([5, 6, 9, 10]);
const CORNER_INDICES = new Set([0, 3, 12, 15]);

const SQUARES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: (i % 4) * 4,
  y: Math.floor(i / 4) * 4,
  delay: Math.random() * 1.8,
  duration: 1.2 + Math.random() * 1.2,
  corner: CORNER_INDICES.has(i),
  inner: INNER_INDICES.has(i),
}));

interface ThinkingBlockProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function ThinkingBlock({
  size = 16,
  className = '',
  style,
}: ThinkingBlockProps) {
  return (
    <svg
      data-component="thinking-block"
      viewBox="0 0 15 15"
      className={className}
      style={{ width: size, height: size, ...style }}
      aria-hidden
    >
      {SQUARES.map((square) => (
        <rect
          key={square.id}
          x={square.x}
          y={square.y}
          width="3"
          height="3"
          rx="1"
          fill="#d6d3d1"
          style={
            square.corner
              ? { opacity: 0 }
              : {
                  animation: `${square.inner ? 'oc-pulse-green-active' : 'oc-pulse-green-soft'} ${square.duration}s ease-in-out infinite`,
                  animationFillMode: 'both',
                  animationDelay: `${square.delay}s`,
                }
          }
        />
      ))}
    </svg>
  );
}
```

---

## Theming

All color lives in the two `@keyframes` blocks — no runtime props needed.

| Token role        | Default   | Where to change                          |
|-------------------|-----------|------------------------------------------|
| Peak active fill  | `#10b981` | `oc-pulse-green-active` at 50%         |
| Inactive active   | `#d6d3d1` | `oc-pulse-green-active` at 0% / 100%     |
| Peak soft fill    | `#a8a29e` | `oc-pulse-green-soft` at 50%             |
| Inactive soft     | `#e7e5e4` | `oc-pulse-green-soft` at 0% / 100%       |
| Base rect fill    | `#d6d3d1` | `fill` on `<rect>` (fallback before anim)|

To use a brand primary instead of emerald, replace `#10b981` only. For a
monochrome variant, set both keyframes to the same gray pair and drop the
green stop.

**Opacity ranges** control how “loud” the block feels:

- Inner: `0.4 → 1.0` — reads as the focal pulse.
- Outer: `0.15 → 0.45` — ambient context, never competes with inner green.

---

## Sizing

Default is 16px (matches OpenCode’s session-turn thinking row). Common sizes:

| Context              | `size` |
|----------------------|--------|
| Inline with body text| `16`   |
| Standalone / chat    | `18`   |
| Larger empty state   | `24`   |

The SVG scales cleanly; keep `viewBox="0 0 15 15"` fixed.

---

## Accessibility

- The SVG is decorative: `aria-hidden` on the root.
- Wrap with a live region when it indicates ongoing work:

```tsx
<div aria-live="polite" aria-busy={isThinking}>
  <ThinkingBlock size={18} />
</div>
```

- Prefer adding visible copy (“Thinking…”) for screen-reader users if the
  block is the only loading affordance.
- Respect `prefers-reduced-motion` if you add it project-wide:

```css
@media (prefers-reduced-motion: reduce) {
  [data-component='thinking-block'] rect {
    animation: none !important;
    opacity: 0.5;
  }
}
```

---

## Behavior notes

**Random stagger is fixed per page load.** Delays/durations are computed once
when the module loads (`Math.random()` in `SQUARES`). Every instance on the
page shares the same pattern — intentional, so multiple blocks stay in sync.
For per-mount randomness, move the `Array.from` into `useMemo` inside the
component.

**No white ring / halo.** Unlike some timeline markers, dots sit directly on
the background — works on white, stone, or dark panels without a cut-out ring.

**CSS-driven animation.** No JS animation loop; cheap to run during long
streams. Keyframe names are prefixed (`oc-pulse-*`) to avoid clashing with
app-level `pulse` utilities.

---

## Usage patterns

**Minimal — block only**

```tsx
{active && <ThinkingBlock size={18} />}
```

**With label (OpenCode-style row)**

```tsx
<div className="flex items-center gap-2">
  <ThinkingBlock size={16} />
  <span className="text-sm text-gray-400">Thinking</span>
</div>
```

**Timed visibility (mock or real stream)**

Drive mount/unmount from your stream state; linger after complete so the block
does not vanish instantly:

```tsx
const [show, setShow] = useState(true);
const active = /* stream in progress */;

useEffect(() => {
  if (active) return;
  const t = setTimeout(() => setShow(false), 2800);
  return () => clearTimeout(t);
}, [active]);

if (!show) return null;
return <ThinkingBlock size={18} />;
```

---

## Gotchas

| Issue | Fix |
|-------|-----|
| Animations don’t run | Ensure `thinking-block.css` is imported (component or global entry). |
| Dots all same brightness | Confirm inner indices `{5,6,9,10}` use `oc-pulse-green-active`. |
| Clipped in flex row | `[data-component='thinking-block']` sets `flex-shrink: 0`. |
| Flash on hot reload | Module-level random regenerates; harmless in dev. |
| Too subtle / too loud | Tune opacity stops in keyframes, not `size`. |

---

## Where this lives in this repo

| File | Role |
|------|------|
| `client/src/lab/components/ThinkingBlock.tsx` | Component |
| `client/src/lab/components/thinking-block.css` | Keyframes + base size |
| `client/src/lab/variants/V21ThinkingFollow.tsx` | Lab variant — block-only streaming UX |

**Provenance:** Grid layout and stagger logic from OpenCode
`packages/ui/src/components/spinner.tsx` + `animations.css`. Green accent
and inner/outer split are local additions for Primary Flow.
