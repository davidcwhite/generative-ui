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

## Single-file portable variant (recommended for drop-in)

If you’re copying this into another project and don’t want to fight the host
bundler over CSS imports, ship the keyframes **inline as a `<style>` tag** and
delete `thinking-block.css` entirely. The component becomes one file with no
external CSS dependency — works in Vite, CRA, Next.js (both routers), Remix,
Astro islands, and isolated Storybook stories without any config.

```tsx
import { useMemo, type CSSProperties } from 'react';

const INNER = new Set([5, 6, 9, 10]);
const CORNER = new Set([0, 3, 12, 15]);

const STYLES = `
@keyframes tb-active {
  0%,100% { opacity: .4;  fill: #d6d3d1; }
  50%     { opacity: 1;   fill: #10b981; }
}
@keyframes tb-soft {
  0%,100% { opacity: .15; fill: #e7e5e4; }
  50%     { opacity: .45; fill: #a8a29e; }
}
`;

let injected = false;
function injectStyles() {
  if (injected || typeof document === 'undefined') return;
  const tag = document.createElement('style');
  tag.setAttribute('data-thinking-block', '');
  tag.textContent = STYLES;
  document.head.appendChild(tag);
  injected = true;
}

interface ThinkingBlockProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function ThinkingBlock({ size = 16, className, style }: ThinkingBlockProps) {
  injectStyles();
  const squares = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: (i % 4) * 4,
        y: Math.floor(i / 4) * 4,
        delay: Math.random() * 1.8,
        duration: 1.2 + Math.random() * 1.2,
        corner: CORNER.has(i),
        inner: INNER.has(i),
      })),
    [],
  );

  return (
    <svg
      viewBox="0 0 15 15"
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      aria-hidden
    >
      {squares.map((s) => (
        <rect
          key={s.id}
          x={s.x}
          y={s.y}
          width="3"
          height="3"
          rx="1"
          fill="#d6d3d1"
          style={
            s.corner
              ? { opacity: 0 }
              : {
                  animation: `${s.inner ? 'tb-active' : 'tb-soft'} ${s.duration}s ease-in-out infinite both`,
                  animationDelay: `${s.delay}s`,
                }
          }
        />
      ))}
    </svg>
  );
}
```

Why this works everywhere:

- **`injectStyles()` runs once** at module-eval time on the client; the `<style>`
  tag is appended to `<head>`, deduped via a module-level flag. No bundler CSS
  pipeline involved.
- **`typeof document === 'undefined'` guard** keeps SSR safe (Next.js, Remix).
- **`useMemo` for stagger** stops the random delays regenerating on every
  render — also makes each instance unique (vs the module-level version, which
  syncs all instances).
- **Keyframe names use a short prefix (`tb-*`)** unlikely to clash with host
  styles.

Trade-off: a single `<style>` tag in the document head per page load. If you
need it gone for SSR-pure pages or strict CSP without `style-src 'unsafe-inline'`,
fall back to the two-file version with a proper CSS import.

---

## Gotchas

Ordered by how often each one breaks the indicator when porting to a new
project. The single-file variant above sidesteps 1, 3, 4, and 10.

### 1. CSS file not actually imported

The two-file version imports `'./thinking-block.css'`, but bundlers handle
side-effect CSS imports differently:

- **Vite / CRA / Next.js App Router (`'use client'`)** — works as-is.
- **Next.js Pages Router** — CSS imports in non-page components are restricted.
  Move the import to `_app.tsx`, or use the single-file variant.
- **Storybook / Vitest / Jest** — CSS imports may be stubbed by config. Import
  once in your test setup / storybook preview, or use the single-file variant.
- **Library bundles (rollup, tsup)** — by default CSS isn’t bundled into the JS.
  Ship CSS as a separate entry, or use the single-file variant.

**Sanity check.** Open DevTools → Elements → click a `<rect>` → Computed →
look for `animation-name`. If empty, the CSS never loaded.

### 2. Tailwind Preflight overriding `fill`

If the host project sets `svg *, svg rect { fill: currentColor }` (common with
icon packs), it beats the keyframe’s `fill` because the selector is more
specific than the element-style animation property.

**Fix.** Bump specificity by scoping the keyframe’s effect to a class:

```css
[data-component='thinking-block'] rect[data-inner] { animation-name: oc-pulse-green-active; }
[data-component='thinking-block'] rect:not([data-inner]) { animation-name: oc-pulse-green-soft; }
```

…and tag inner rects with `data-inner` instead of inlining `animation-name`.
Or remove the static `fill` attribute and animate `color` + `fill="currentColor"`.

### 3. PurgeCSS / Tailwind v3 stripping the keyframes

Tailwind’s content scanner can drop `@keyframes oc-pulse-green-active` if it
never sees the name in a class attribute. The animation name is referenced
from JS strings, which the scanner doesn’t see.

**Fix.** Add to `tailwind.config.js`:

```js
safelist: ['oc-pulse-green-active', 'oc-pulse-green-soft']
```

…or use the single-file variant (no purge involved).

### 4. CSS Modules eating the keyframe name

If the host treats every `.css` as a CSS module (Next.js does this for
`*.module.css`), keyframe names get hashed and won’t match the string passed
to inline `style`.

**Fix.** Don’t name the file `*.module.css`, or use the single-file variant.

### 5. SSR / Next.js hydration mismatch

`SQUARES` at module scope calls `Math.random()` — server and client produce
different delay sets, React warns, and inline `style` can fail to apply on
hydration.

**Fix.** Move the random generation into `useMemo` inside the component (the
single-file variant above already does this).

### 6. Global `prefers-reduced-motion` rule

If your app sets `* { animation: none !important; }` inside a reduced-motion
media query, this indicator dies along with everything else. Either narrow
the rule or scope an explicit reduced-motion fallback for this component:

```css
@media (prefers-reduced-motion: reduce) {
  [data-component='thinking-block'] rect {
    animation: none !important;
    opacity: 0.5;
  }
}
```

### 7. Animations work in dev, not in production

Almost always one of:

- **#1** — CSS not bundled into the prod build.
- **#3** — Purge removed the keyframes.
- **#4** — CSS modules transformed the keyframe names.

Diff the prod and dev DOM for `<style>` tags / linked stylesheets; whatever’s
missing in prod is the culprit. The single-file variant removes all three.

### 8. `SQUARES` accidentally moved into the component

Looks fine but appears frozen. If `Array.from(...)` runs every render without
`useMemo`, new random delays apply each frame and the dots never sit long
enough to read as an animation. Keep it at module scope **or** wrap in
`useMemo` — never plain in-render.

### 9. Dots all same brightness

Confirm inner indices `{5, 6, 9, 10}` use the active keyframe; the corners
`{0, 3, 12, 15}` stay opacity 0. A common mistake during refactors is to
flip the inner/outer sets.

### 10. Other quick ones

| Issue | Fix |
|-------|-----|
| Clipped in flex row | `flex-shrink: 0` on the SVG (single-file variant sets this inline). |
| Flash on hot reload | Module-level random regenerates; harmless in dev. Use `useMemo` to stop it. |
| Too subtle / too loud | Tune opacity stops in keyframes, not `size`. |
| CSP blocks inline `<style>` | Use the two-file variant; inline styles need `style-src 'unsafe-inline'`. |

---

## Where this lives in this repo

This repo ships the **single-file variant** — keyframes are injected at
runtime, no separate CSS file.

| File | Role |
|------|------|
| `client/src/lab/components/ThinkingBlock.tsx` | Component + inline `<style>` injection |
| `client/src/lab/variants/V21ThinkingFollow.tsx` | Lab variant — block-only streaming UX |

**Provenance:** Grid layout and stagger logic from OpenCode
`packages/ui/src/components/spinner.tsx` + `animations.css`. Green accent
and inner/outer split are local additions for Primary Flow.
