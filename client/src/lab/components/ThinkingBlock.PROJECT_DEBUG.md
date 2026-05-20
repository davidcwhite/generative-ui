# ThinkingBlock — Doesn't animate in another React + Vite project

The component works in this repo but not in your other app. The SVG renders,
the style tag is present, but nothing pulses. You've tried other keyframe
animations in the same app and they don't run either.

That's not a `ThinkingBlock` problem — that's a **project-wide animation
problem**. Solve that and `ThinkingBlock` works.

---

## Step 1 — Isolation test (60 seconds)

In the other project, paste this into the top-level `App.tsx`. Run it. Does
the box pulse?

```tsx
function AnimationTest() {
  return (
    <>
      <style>{`
        @keyframes test-pulse {
          0%, 100% { background: red; }
          50%      { background: blue; }
        }
      `}</style>
      <div
        style={{
          width: 100,
          height: 100,
          animation: 'test-pulse 1s ease-in-out infinite',
        }}
      />
    </>
  );
}

export default function App() {
  return <AnimationTest />;
}
```

- **Does NOT pulse** → CSS animations are globally broken. See **Step 2**.
- **Pulses fine** → animations work; the problem is how `ThinkingBlock` is
  mounted. See **Step 3**.

---

## Step 2 — Global animation killer

Ranked by likelihood.

### A. macOS Reduce Motion / DevTools emulation

- macOS: System Settings → Accessibility → Display → Reduce Motion → **off**.
- Chrome DevTools: Cmd-Shift-P → "Show Rendering" → set
  `prefers-reduced-motion` to **no preference**.

### B. Global CSS killing animations

In `src/index.css` (or whatever the global stylesheet is):

```bash
rg "animation" src/index.css
rg "prefers-reduced-motion" src/
```

Look for patterns like:

```css
* { animation: none !important; }
*, *::before, *::after { animation: none; transition: none; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
```

Even one match kills every animation. Remove or scope tighter.

### C. Tailwind config

```bash
rg "animation" tailwind.config.*
```

Preflight is fine; custom plugins that reset `animation` are not.

### D. Browser extension

Disable extensions and retry in incognito. React DevTools profiling,
ad-blockers, dark-mode extensions occasionally inject `animation: none`.

### E. CSS reset library

`modern-normalize`, `@unocss/reset`, custom forks. Check imports in
`main.tsx` and `index.css`.

---

## Step 3 — ThinkingBlock-specific

The test box pulses but `ThinkingBlock` doesn't. Inspect a rect in DevTools
→ **Computed** tab → find `animation-name`:

- **Empty** → a parent CSS rule overrides `animation` on `svg *` or `rect`.
  Grep:

  ```bash
  rg "svg \*|svg rect" src/
  ```

- **`tb-active` or `tb-soft`** → animation is attached but never paints.
  That's a remount loop. Wrap in `React.memo`:

  ```tsx
  import { memo } from 'react';

  export const ThinkingBlock = memo(function ThinkingBlock({
    size = 16,
    className,
    style,
  }: ThinkingBlockProps) {
    // existing body
  });
  ```

- **`none`** → an explicit rule is killing it. In DevTools **Styles** panel,
  find the strikethrough rule that wins specificity.

---

## Step 4 — Nuclear option

If you can't find what's breaking it, force `ThinkingBlock` with
`!important` and attribute selectors. Replace the inline `style` on rects
with this scoped pattern:

```tsx
<style data-thinking-block>{`
  @keyframes tb-active {
    0%, 100% { opacity: .4;  fill: #d6d3d1; }
    50%      { opacity: 1;   fill: #10b981; }
  }
  @keyframes tb-soft {
    0%, 100% { opacity: .15; fill: #e7e5e4; }
    50%      { opacity: .45; fill: #a8a29e; }
  }
  [data-component="thinking-block"] rect[data-inner="true"] {
    animation: tb-active var(--d) ease-in-out infinite both !important;
    animation-delay: var(--delay) !important;
  }
  [data-component="thinking-block"] rect[data-inner="false"] {
    animation: tb-soft var(--d) ease-in-out infinite both !important;
    animation-delay: var(--delay) !important;
  }
`}</style>
```

Then on each rect:

```tsx
<rect
  data-inner={s.inner ? 'true' : 'false'}
  style={{
    ...(s.corner ? { opacity: 0 } : {}),
    ['--d' as never]: `${s.duration}s`,
    ['--delay' as never]: `${s.delay}s`,
  }}
  ...
/>
```

`!important` plus an attribute selector beats almost everything except
inline styles. If this still doesn't animate, you're in reduced-motion
territory or the `<style>` tag isn't reaching the DOM at all.

---

## Most likely cause

Given "anything with keyframes does nothing", it's almost always **B**
(global `* { animation: none }` in `index.css`) or **A** (Reduce Motion
toggled on). The Step 1 test confirms in 10 seconds.
