# ThinkingBlock — Static gray grid, no animation

You see the dots but they don't pulse. Run this in DevTools console first:

```js
document.querySelector('style[data-thinking-block]')
```

- `null` → see **#1**.
- element returned → see **#2** through **#4**.

---

## 1. Keyframes never injected

`injectStyles()` only runs on mount. If `null`, the component either never
mounted, mounted server-side then lost its in-memory flag, or HMR removed
the tag.

**Fix.** Hard refresh (Cmd-Shift-R). If that fixes it, it's a dev-only HMR
glitch — production is fine.

## 2. Keyframe names don't match the style tag

```js
[...document.querySelectorAll('[data-component="thinking-block"] rect')]
  .map(r => getComputedStyle(r).animationName)
```

Should return a mix of `tb-active`, `tb-soft`, `none`. If you see other
names (e.g. `oc-pulse-green-active` from an older copy), the `<style>` tag
and component disagree. Hard refresh, or align the names.

## 3. A parent rule kills `animation`

```js
getComputedStyle(
  document.querySelector('[data-component="thinking-block"] rect:nth-child(2)')
).animationName
```

Returns `none` → some CSS rule overrode it. Most common culprits:

- Global `* { animation: none !important; }`
- Tailwind `motion-reduce:[animation:none]` on a wrapper
- A CSS Module that resets `animation` on `svg *`

## 4. OS / browser reduced-motion

DevTools → Cmd-Shift-P → "Emulate CSS prefers-reduced-motion: no-preference".
If the animation now plays, your OS has Reduce Motion enabled (macOS:
System Settings → Accessibility → Display → Reduce Motion).

---

## If none of the above

The animation is attached and unblocked but never reaches a visible frame.
That means the component is re-mounting every render. Symptoms:

- DevTools "Animations" panel shows new entries appearing every frame.
- `console.log('mount')` inside `ThinkingBlock` fires repeatedly.

**Fix.** Stabilize the parent — use stable React `key`s, memoize the JSX,
or wrap `ThinkingBlock` in `React.memo`. See `ThinkingBlock.md` "Gotchas"
for the remount-loop pattern.
