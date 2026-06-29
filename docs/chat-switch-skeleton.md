# Chat Switch Skeleton

A portable loading pattern for chat-style UIs: when the user switches conversations
(and the whole conversation is fetched from a data source), the **entire chat area**
renders as a single skeleton — a solid user-message block at the top, a stack of
response lines beneath — under one **top-to-bottom fading gradient** so the lower lines
progressively dissolve. A slow, subtle sheen sweeps across while it loads.

It uses only HTML + CSS (Tailwind utility classes are used for layout in the example,
but every visual effect lives in plain CSS that you can copy as-is). No JS animation
loop, no dependencies.

---

## 1. The idea in three parts

1. **Shape match** — the skeleton mirrors the real chat layout: one right-aligned
   "user message" block, then left-aligned "response" lines of varying width. Matching
   the final shape avoids layout shift when real content replaces it.
2. **Vertical fade (the gradient)** — a CSS `mask-image` makes the skeleton fully opaque
   near the top and fade toward transparent at the bottom, so content "trails off"
   instead of ending in a hard edge.
3. **Sheen + line shimmer** — a soft white band sweeps diagonally across the block, and
   each line has its own gentle left-to-right shimmer. Both are slow and low-contrast.

---

## 2. Markup

```html
<!-- aria-busy + aria-live let assistive tech announce the loading state -->
<section aria-live="polite" aria-busy="true">
  <div class="chat-skeleton" role="status" aria-label="Loading chat">
    <!-- User message: a single solid block (right-aligned) -->
    <div class="skeleton-line user-block" aria-hidden="true"></div>

    <!-- Response: a stack of lines (left-aligned), varied widths -->
    <div class="response-lines">
      <span class="skeleton-line" style="width: 94%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 88%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 76%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 92%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 64%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 82%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 90%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 70%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 86%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 58%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 80%" aria-hidden="true"></span>
      <span class="skeleton-line" style="width: 48%" aria-hidden="true"></span>
    </div>

    <span class="sr-only">Loading chat</span>
  </div>
</section>
```

Notes:

- Use **~10–12 response lines** so the stack is tall enough for the fade to read.
- Randomising / varying the widths makes it look like real prose rather than a table.
- The user block is intentionally **one solid block**, not inner lines — it reads as a
  pending bubble and keeps the top calm.
- `aria-hidden` on the visual bars stops screen readers announcing each one; the single
  `role="status"` + `sr-only` label is what gets announced.

---

## 3. CSS

```css
/* ── Container: clips the sheen + applies the vertical fade ─────────────── */
.chat-skeleton {
  position: relative;
  overflow: hidden;

  /* The fade. Fully opaque to ~42%, then ramps down so the bottom is barely
     visible. Raise the first stop to fade higher; lower the last alpha to make
     the very end harder to see. */
  -webkit-mask-image: linear-gradient(
    180deg,
    #000 0%,
    #000 42%,
    rgba(0, 0, 0, 0.55) 68%,
    rgba(0, 0, 0, 0.08) 100%
  );
  mask-image: linear-gradient(
    180deg,
    #000 0%,
    #000 42%,
    rgba(0, 0, 0, 0.55) 68%,
    rgba(0, 0, 0, 0.08) 100%
  );

  /* Gentle entrance when the skeleton mounts */
  animation: chat-skeleton-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ── The diagonal sheen that sweeps across while loading ────────────────── */
.chat-skeleton::after {
  content: '';
  position: absolute;
  inset: -40% -12%;          /* overscan so the band fully clears the edges */
  z-index: 2;                /* above the bars (see z-index note below) */
  pointer-events: none;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 42%,
    rgba(255, 255, 255, 0.26) 50%,   /* peak brightness — keep low for subtlety */
    rgba(255, 255, 255, 0.08) 58%,
    transparent 100%
  );
  transform: translateX(-18%);
  animation: chat-skeleton-wash 3.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

/* ── A skeleton bar (used for both the user block and response lines) ───── */
.skeleton-line {
  position: relative;   /* REQUIRED so z-index applies and bars sit under sheen */
  z-index: 1;
  height: 0.75rem;      /* response line height */
  border-radius: 9999px;
  background: linear-gradient(90deg, #eceae9 0%, #f5f5f4 45%, #eceae9 100%);
  background-size: 220% 100%;
  animation: skeleton-shimmer 2.8s ease-in-out infinite;
}

/* User message block: taller, less round, right-aligned */
.user-block {
  height: 3.5rem;
  width: 58%;
  max-width: 82%;
  margin-left: auto;            /* push to the right */
  border-radius: 1rem;          /* bubble, not a pill */
}

/* Response stack: vertical rhythm between lines */
.response-lines {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Keyframes ──────────────────────────────────────────────────────────── */
@keyframes chat-skeleton-in {
  from { opacity: 0; transform: translateY(3px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Sheen fades in as it crosses the centre, fades out at the edges */
@keyframes chat-skeleton-wash {
  0%   { opacity: 0; transform: translateX(-30%); }
  50%  { opacity: 1; transform: translateX(0%); }
  100% { opacity: 0; transform: translateX(30%); }
}

/* Per-bar shimmer: slides the 220%-wide gradient across the bar */
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* sr-only helper, if your stack doesn't already provide one */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0);
  white-space: nowrap; border: 0;
}
```

---

## 4. Why these details matter

- **`z-index` only works on positioned elements.** The sheen (`::after`) is absolutely
  positioned; if the bars are left `static`, the sheen paints *over* them and the
  skeleton looks blank. Giving `.skeleton-line` `position: relative; z-index: 1` puts the
  bars above the container background but below the sheen — the sheen reads as a wash
  *over* the bars, which is the intended effect.
- **The fade is a mask, not an overlay.** Using `mask-image` means the fade works on any
  background colour — no need to match a gradient to the page background.
- **Overscan the sheen (`inset: -40% -12%`).** This guarantees the bright band fully
  enters and exits off-screen, so you never see a hard rectangle edge crossing.
- **Keep brightness and speed low.** Peak sheen alpha `~0.26` and durations `~2.8–3.4s`
  make it feel calm. Higher alpha or faster timing reads as "busy" and cheapens it.

---

## 5. Tunable parameters

| Effect | Where | Increase to… |
| --- | --- | --- |
| Fade starts higher | mask 2nd stop (`42%`) | lower the % → fade begins sooner |
| Bottom more invisible | mask last alpha (`0.08`) | lower → harder to see at the end |
| Longer response | number of `.skeleton-line` rows | add rows / increase `gap` |
| Sheen subtlety | `::after` peak alpha (`0.26`) | lower → more subtle |
| Overall speed | `wash 3.4s` / `shimmer 2.8s` | raise → slower, calmer |
| Bar tone/contrast | `.skeleton-line` gradient stops | widen stop colours → more contrast |

---

## 6. Wiring it up

Toggle the skeleton on the async boundary — show it while the conversation is being
fetched, swap to real content when it resolves:

```jsx
{isLoading ? (
  <ChatSkeleton key={activeChatId} /> // key forces a fresh entrance per switch
) : (
  <RealConversation messages={messages} />
)}
```

- **`key` on the skeleton**: keying it by the active chat id re-runs the entrance
  animation each time the user switches, so every switch feels responsive.
- Render the skeleton only after a short delay (e.g. 150–300 ms) if your fetch is often
  instant, to avoid a flash for cached data.

---

## 7. Reduced motion

Always disable the animations under `prefers-reduced-motion`. The static skeleton (with
its fade) still communicates loading without movement.

```css
@media (prefers-reduced-motion: reduce) {
  .chat-skeleton,
  .chat-skeleton::after,
  .skeleton-line {
    animation: none;
  }
}
```

---

## 8. Accessibility checklist

- Wrap the loading region in `aria-busy="true"` and flip it to `false` when content
  arrives.
- Put `role="status"` + a visually-hidden label (`"Loading chat"`) on the skeleton so
  screen readers announce the state once.
- Mark the individual bars `aria-hidden="true"` so they aren't announced.
- Don't rely on the sheen/shimmer to convey loading — the `role="status"` text does that.
