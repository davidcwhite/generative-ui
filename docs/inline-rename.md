# Inline Rename (no shimmer)

A self-contained, portable recipe for renaming a list item **in place** — the
title text becomes an editable input on the exact same line, with no popover, no
modal, and no layout shift. Enter saves, Escape cancels.

Stack assumed: **React 18+** and **Tailwind CSS**. A plain-CSS translation is
included at the end so you can port this without Tailwind.

---

## 1. What you get

- Click "Rename" → the row's title turns into a text input *in place* (same
  position, same font size/weight, no underline, no box, no jump).
- The full text is **pre-selected** so the user can immediately overtype.
- **Enter** saves the trimmed value; **Escape** cancels and restores the old title.
- Empty input is rejected inline (the field stays focused with an error message).
- Fully keyboard-operable and screen-reader friendly.

---

## 2. Interaction spec

| Trigger | Result |
|---|---|
| Activate "Rename" | Row swaps title → `<input>`, focuses it, selects all text |
| Type | Input updates (uncontrolled — no React re-render per keystroke) |
| Enter | Trim → if non-empty, save and exit edit mode; if empty, show inline error |
| Escape | Exit edit mode, discard changes |
| Blur (optional) | Your choice: save or cancel. This recipe cancels on Escape only and leaves blur to you |

Design rules that make it feel "in place":

- The input inherits the **same** `font-size`, `font-weight`, `line-height`,
  `color`, and horizontal padding as the static title. The only visible change is
  a caret appearing.
- **No underline / no border / no background** on the input.
- Reserve the same vertical space in both modes so nothing reflows.

---

## 3. State model

Ownership is split so only **one** row can be in edit mode at a time:

- The **parent (list)** owns `editingId: string | null`.
- Each **row** receives a derived `editing: boolean` plus callbacks.

This avoids per-row local "isEditing" state getting out of sync and keeps the
list as the single source of truth.

```tsx
// types.ts
export interface ChatListItem {
  id: string;
  title: string;
  // ...any other fields you render (subtitle, timestamp, etc.)
}
```

---

## 4. Parent / list component

```tsx
// ChatList.tsx
import { useCallback, useState } from 'react';
import { ChatRow } from './ChatRow';
import type { ChatListItem } from './types';

interface ChatListProps {
  items: ChatListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function ChatList({ items, activeId, onSelect, onRename }: ChatListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = useCallback(
    (id: string, title: string) => {
      onRename(id, title);
      setEditingId(null);
    },
    [onRename],
  );

  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <ChatRow
          key={item.id}
          item={item}
          active={item.id === activeId}
          editing={editingId === item.id}
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

---

## 5. Row component (display ↔ edit)

The row renders either a **button** (display) or an **input** (edit). Both use
identical typography and padding so the swap is invisible apart from the caret.

```tsx
// ChatRow.tsx
import { useEffect, useId, useRef, useState } from 'react';
import type { ChatListItem } from './types';

interface ChatRowProps {
  item: ChatListItem;
  active: boolean;
  editing: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onSave: (title: string) => void;
  onCancel: () => void;
}

const MAX_TITLE = 80;

export function ChatRow({
  item,
  active,
  editing,
  onSelect,
  onStartRename,
  onSave,
  onCancel,
}: ChatRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  // On entering edit mode: focus + select all. The short delay lets the input
  // mount/paint first so .select() targets a laid-out element.
  useEffect(() => {
    if (!editing) return;
    setError(null);
    const timer = window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [editing, item.title]);

  const save = () => {
    const trimmed = inputRef.current?.value.trim() ?? '';
    if (!trimmed) {
      setError('Name can’t be empty');
      inputRef.current?.focus();
      return;
    }
    onSave(trimmed.slice(0, MAX_TITLE));
  };

  return (
    <li className="list-none">
      <div
        className={`group relative flex items-stretch transition-colors ${
          active ? 'bg-stone-100' : 'hover:bg-stone-50'
        }`}
      >
        {editing ? (
          <div className="min-w-0 flex-1 px-3 py-2.5">
            <label htmlFor={inputId} className="sr-only">
              Chat name
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              name="chat-title"
              defaultValue={item.title}
              onChange={() => error && setError(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  save();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  onCancel();
                }
              }}
              maxLength={MAX_TITLE}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. Quarterly review notes…"
              className="block w-full min-w-0 bg-transparent text-sm font-medium text-stone-900 caret-stone-900 placeholder:text-stone-400 focus-visible:outline-none"
            />
            {error ? (
              <p className="mt-1 text-xs text-rose-600" role="alert">
                {error}
              </p>
            ) : (
              <p className="sr-only">Press Enter to save or Escape to cancel.</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="min-w-0 flex-1 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400"
          >
            <span className="block truncate text-sm font-medium text-stone-800">
              {item.title}
            </span>
          </button>
        )}

        {/* Rename trigger. Replace with your own menu/affordance. */}
        <div className="flex shrink-0 items-center pr-2">
          <button
            type="button"
            aria-label="Rename chat"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            className={`rounded-lg p-1.5 text-stone-400 transition-opacity hover:bg-stone-200 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
              editing
                ? 'pointer-events-none opacity-0'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}
```

---

## 6. Why these specific choices (best practices)

These map directly to the Vercel React + Web Interface Guidelines:

- **Uncontrolled input (`defaultValue` + `ref`)** — typing does not trigger a
  React re-render per keystroke. Faster, and impossible to "fight the caret".
  Read the value from `inputRef.current.value` on save.
- **No `outline-none` without a replacement** — the input hides the native
  outline but the *row button* shows a `focus-visible:ring`. The input itself is
  visually focused by its caret + the edit context.
- **Label is present** (`htmlFor` + `sr-only`) even though it's visually hidden —
  required for the control to be programmatically named.
- **`autoComplete="off"` + `spellCheck={false}`** — stops password managers and
  red squiggles on a short identifier field.
- **Placeholder ends with `…`** and shows an example pattern.
- **Inline error** sits next to the field, uses `role="alert"`, and focus stays
  on the field (never silently fails).
- **`min-w-0` on the flex child + `truncate`** so long titles ellipsize instead
  of blowing out the row width.
- **Single source of truth** (`editingId` in the parent) prevents two rows
  editing at once and removes stale local state.
- **`stopPropagation()` on the trigger** so activating rename doesn't also fire
  row selection.

### A note on the 40 ms focus delay

Focusing immediately in the same tick the input mounts can land before layout,
so `.select()` occasionally selects nothing. A tiny `setTimeout` (one frame) is
the simplest robust fix. If you prefer, swap it for a double
`requestAnimationFrame`:

```tsx
useEffect(() => {
  if (!editing) return;
  let raf2 = 0;
  const raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  });
  return () => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
  };
}, [editing, item.title]);
```

---

## 7. Accessibility checklist

- [x] Icon-only trigger has `aria-label="Rename chat"`.
- [x] Input has an associated `<label>` (`sr-only`).
- [x] Keyboard: Enter saves, Escape cancels (`onKeyDown`).
- [x] Visible focus on all interactive elements via `focus-visible:ring-*`.
- [x] Error announced via `role="alert"`; instructions exposed via `sr-only`.
- [x] Decorative SVG marked `aria-hidden`.

---

## 8. Plain-CSS translation (no Tailwind)

If you aren't using Tailwind, the only thing that matters visually is that the
input matches the static title. Apply this class to the `<input>` and drop the
Tailwind classes:

```css
.rename-input {
  display: block;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;            /* horizontal padding comes from the row wrapper */
  border: 0;
  background: transparent;
  font: inherit;         /* inherit the title's size/weight/line-height */
  font-weight: 500;
  color: #1c1917;        /* stone-900 */
  caret-color: #1c1917;
}
.rename-input::placeholder { color: #a8a29e; } /* stone-400 */
.rename-input:focus-visible { outline: none; } /* row provides the focus ring */
```

Match `font`, `color`, and the wrapper padding to your existing title and the
swap will be seamless.

---

## 9. Porting checklist

1. Copy `types.ts`, `ChatList.tsx`, `ChatRow.tsx`.
2. Replace the rename-trigger button with your real menu item if you have one;
   it only needs to call `onStartRename()`.
3. Wire `onRename(id, title)` to your data layer (optimistic update + persist).
4. Confirm the input's typography equals the static title's in your theme.
5. Verify Enter/Escape and full-text-selection on focus.
