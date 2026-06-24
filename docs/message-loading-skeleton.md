# Loading Skeleton for an In-Flight Message

A portable recipe for showing a **shimmering skeleton placeholder** while a
message/response is being generated — both as a **sidebar list row** (a new chat
whose title hasn't been generated yet) and as an **assistant bubble** in the
message thread. When the response resolves, the skeleton is replaced by real
content.

Stack assumed: **React 18+** and **Tailwind CSS**. Plain-CSS notes included.

---

## 1. What you get

- The instant the user sends a message, a new list item appears in a
  **loading** state: two shimmering bars stand in for the title and subtitle.
- In the conversation pane, the user's message shows immediately and the
  assistant's reply is represented by a **multi-line shimmer bubble**.
- When the backend responds, `loading` flips to `false` and the real title /
  text fade in. (Optional: glint the freshly generated title — see
  [Inline Rename + Save Shimmer](./inline-rename-with-shimmer.md).)
- Honors `prefers-reduced-motion` (shimmer becomes a static block).

---

## 2. The skeleton CSS

```css
/* Continuous left-to-right shimmer for placeholder blocks. */
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton {
  background-image: linear-gradient(
    90deg,
    #f5f5f4 0%,    /* stone-100 */
    #ebeae8 20%,
    #e7e5e4 40%,   /* stone-200 — the brighter sweep */
    #ebeae8 60%,
    #f5f5f4 80%
  );
  background-size: 200% 100%;
  border-radius: 0.25rem;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; } /* falls back to a solid stone-100 block */
}
```

### Why this differs from a one-shot text sheen

This is **continuous and looping**, so the default `background-repeat` is fine —
the gradient tiles and loops seamlessly, which is exactly what you want for an
"in progress" affordance. (Contrast with the one-shot title sheen, which must be
`no-repeat` to avoid a second band. Different goals, different rules.)

`background-position` is a paint, not a transform — acceptable here because each
skeleton bar is tiny and the effect is the standard skeleton idiom. It is still
gated by `prefers-reduced-motion`.

---

## 3. Reusable skeleton primitives

Keep them dumb and size them with utility classes at the call site.

```tsx
// Skeleton.tsx
export function SkeletonLine({ className = '' }: { className?: string }) {
  return <span className={`skeleton block ${className}`} aria-hidden />;
}
```

That's all you need — one element, sized per use.

---

## 4. Data model

Add a single transient flag to your list item:

```tsx
// types.ts
export interface ChatListItem {
  id: string;
  title: string;
  subtitle: string;     // e.g. a preview of the first user message
  updatedAt: number;
  /** True while the first response is generating → row shows a shimmer skeleton. */
  loading?: boolean;
}
```

---

## 5. Sidebar row: loading branch

Render the skeleton instead of the title/subtitle while `loading` is true. The
skeleton mirrors the **same layout** as the loaded row so nothing jumps when it
resolves.

```tsx
// ChatRow.tsx (loading branch)
import { SkeletonLine } from './Skeleton';

// ...inside the row, choose a branch with a ternary (not &&):
{item.loading ? (
  <div className="min-w-0 flex-1 px-3 py-2.5" role="status" aria-label="Generating chat…">
    <div className="flex items-center justify-between gap-2">
      <SkeletonLine className="h-3.5 w-2/3" />
      <SkeletonLine className="h-2.5 w-7 shrink-0" />   {/* timestamp stand-in */}
    </div>
    <SkeletonLine className="mt-2 h-2.5 w-5/6" />        {/* subtitle stand-in */}
    <span className="sr-only">Generating response…</span>
  </div>
) : (
  /* ...your normal display button with item.title / item.subtitle... */
)}
```

Also **hide row affordances** (the `⋯` menu, rename trigger, etc.) while loading
so the user can't act on a half-born item:

```tsx
className={`... ${item.loading ? 'pointer-events-none opacity-0' : '...'}`}
```

---

## 6. Conversation pane: assistant bubble skeleton

While waiting for the reply, show the user's message immediately and a shimmer
bubble for the assistant:

```tsx
// MessageThread.tsx (waiting state)
{pendingPrompt && (
  <>
    {/* user message — shown instantly */}
    <div className="ml-auto max-w-[85%] rounded-2xl bg-stone-900 px-4 py-3 text-sm leading-relaxed text-stone-100">
      {pendingPrompt}
    </div>

    {/* assistant reply placeholder */}
    <div
      className="max-w-[85%] rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200"
      role="status"
      aria-label="Generating response…"
    >
      <SkeletonLine className="h-3 w-11/12" />
      <SkeletonLine className="mt-2 h-3 w-4/5" />
      <SkeletonLine className="mt-2 h-3 w-2/3" />
    </div>
  </>
)}
```

The varied widths (`w-11/12`, `w-4/5`, `w-2/3`) read as "paragraph of text"
rather than a flat block.

---

## 7. The send → resolve flow

Optimistically insert a loading item, then patch it when the response lands.
Pattern shown with `setTimeout`; replace with your real request.

```tsx
// useSendMessage.ts (sketch)
import { useCallback, useRef, useState } from 'react';
import type { ChatListItem } from './types';

export function useSendMessage(
  setItems: React.Dispatch<React.SetStateAction<ChatListItem[]>>,
  setActiveId: (id: string) => void,
) {
  const [sending, setSending] = useState(false);
  const idRef = useRef(0);

  const send = useCallback(
    async (prompt: string) => {
      if (sending) return;
      setSending(true);

      const id = `chat-${Date.now()}-${idRef.current++}`;

      // 1) Optimistic loading row at the top of the list.
      setItems((prev) => [
        { id, title: '', subtitle: prompt, updatedAt: Date.now(), loading: true },
        ...prev,
      ]);
      setActiveId(id);

      try {
        // 2) Your real request.
        const { title, reply } = await generateResponse(prompt);

        // 3) Patch the same row — flip loading off, fill content.
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? { ...it, loading: false, title, subtitle: prompt, updatedAt: Date.now() }
              : it,
          ),
        );
        // store `reply` in your message thread as well
      } catch {
        // On failure: remove the row, or set an error state on it.
        setItems((prev) => prev.filter((it) => it.id !== id));
      } finally {
        setSending(false);
      }
    },
    [sending, setItems, setActiveId],
  );

  return { send, sending };
}
```

Key points:

- **Functional `setItems` updates** (`prev => ...`) so the callback stays stable
  and you never read stale state.
- **Patch by `id`** rather than by index — the list may have re-sorted.
- The send button should be **disabled while `sending`** and show a
  `"Generating…"` label (note the `…`).

### Optional: glint the title when it resolves

To make the title's arrival feel intentional, fire the one-shot sheen from the
[shimmer recipe](./inline-rename-with-shimmer.md) when an item transitions
`loading: true → false`. Track previous loading state in a ref and set a
transient `savedId`:

```tsx
const prevLoading = useRef<Record<string, boolean>>({});

useEffect(() => {
  const prev = prevLoading.current;
  const next: Record<string, boolean> = {};
  let justLoaded: string | null = null;
  for (const it of items) {
    next[it.id] = !!it.loading;
    if (prev[it.id] && !it.loading) justLoaded = it.id;
  }
  prevLoading.current = next;
  if (justLoaded) setSavedId(justLoaded);
}, [items]);
```

---

## 8. Best practices applied

- **`role="status"` + `aria-label="Generating…"`** on each placeholder so screen
  readers announce the pending state; a redundant `sr-only` "Generating
  response…" gives a spoken phrase. Loading copy ends with `…`.
- **Decorative shimmer bars are `aria-hidden`** — they carry no meaning beyond
  the announced status.
- **Skeleton mirrors the loaded layout** (same paddings, same line positions) so
  resolving causes **no layout shift (CLS)**.
- **Ternary for the loading/loaded branch**, not `&&` — avoids accidentally
  rendering `0`/falsy and keeps the two states explicit.
- **`prefers-reduced-motion`** removes the animation (static block remains).
- **Send button disabled only while in flight**, with a `…` label.
- **Hide row actions while loading** so users can't rename/delete a half-created
  item.

---

## 9. Plain-CSS translation (no Tailwind)

The `.skeleton` class above is framework-agnostic. For the sizes, use plain
rules instead of utility classes:

```css
.skeleton-title    { height: 0.875rem; width: 66%; }
.skeleton-subtitle { height: 0.625rem; width: 83%; margin-top: 0.5rem; }
.skeleton-line     { height: 0.75rem; margin-top: 0.5rem; }
```

Match the heights/widths to your real title and subtitle so the swap is
seamless.

---

## 10. Porting checklist

1. Paste the `.skeleton` keyframes + class (and the reduced-motion block) into
   your global stylesheet; tune the three gradient colors to your surface.
2. Add `loading?: boolean` to your list-item type.
3. Add the loading branch to your row and the assistant-bubble skeleton to your
   thread, mirroring your real layouts.
4. Insert an optimistic loading item on send; patch it by `id` on resolve;
   remove/error it on failure.
5. Verify: no layout shift on resolve, status is announced, and the shimmer
   stops under reduced motion.
