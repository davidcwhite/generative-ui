# Prompt Starters — portable prompt suggestions for any chat input

A small, self-contained UI for **prompt suggestions**: pill chips sit above (or
below) your chat input; clicking a chip opens a dropdown panel of prompts; hovering
a prompt previews its full text inside your input; clicking fills the input so the
user can edit and send.

The point of this doc is portability. You are **not** expected to adopt our composer
— you bind this onto **your app's existing chat input**. Saved prompts are an
optional add-on you can omit entirely.

Assumes **React 18 + Vite + Tailwind CSS** and [`lucide-react`](https://lucide.dev)
for icons (swap for any icon set).

```
npm i lucide-react
```

---

## What ports across

| Piece                                   | Status        | Notes                                          |
| --------------------------------------- | ------------- | ---------------------------------------------- |
| Category chips → dropdown panel         | **Port this** | The core feature.                              |
| Hover-to-preview + click-to-fill        | **Port this** | The interaction that makes it feel good.       |
| `usePromptStarters` integration hook    | **Port this** | Binds the behavior to *your* input.            |
| Saved prompts (`localStorage`)          | Optional      | Drop it without affecting suggestions.         |
| The hero composer (`WelcomeHero`)       | Not needed    | Demo only — use your own input.                |

---

## Interaction model (four moves)

1. **Browse** — a row of category chips (pills) near the input. Low commitment.
2. **Open** — clicking a chip swaps the chip row for a panel listing that category's
   prompts (header + close button + scrollable list). `Esc` closes it.
3. **Preview** — hovering a prompt row shows its full text *inside your input*,
   rendered muted and read-only so the user's own draft is not lost.
4. **Fill** — clicking a row writes the prompt into your input for real and focuses it.

The trick: your input doubles as the preview surface, so there is no separate tooltip
or detail pane to manage.

---

## Integration contract

Your chat input must be **controlled** — i.e. you have a value and a setter:

```tsx
const [input, setInput] = useState('');   // or useChat()'s { input, setInput }, a form lib, etc.
```

The feature owns only two pieces of state (`hovered`, `openCategoryId`); your input
keeps owning its own value. The displayed value is simply:

```ts
const displayValue = hovered ?? input;   // preview overrides your draft, then snaps back
const isPreview    = hovered !== null;   // -> read-only + muted while previewing
```

---

## 1. The headless hook (the integration layer)

This is the only glue you need. It manages `hovered` + `openCategoryId`, derives the
open category and its items, and returns values to bind to your input and to the
chips/panel UI.

```tsx
import { useMemo, useState } from 'react';
import { promptCategories, promptSuggestions } from './promptData';
import type { PromptPanelItem } from './PromptCategoryPanel';

export function usePromptStarters(opts: {
  value: string;                     // your input's current value
  onCommit: (text: string) => void;  // called to write a prompt into your input
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const openCategory = useMemo(
    () => promptCategories.find((c) => c.id === openId) ?? null,
    [openId],
  );

  const items = useMemo<PromptPanelItem[]>(
    () =>
      promptSuggestions
        .filter((s) => s.categoryId === openId)
        .map((s) => ({ id: s.id, label: s.label, prompt: s.prompt })),
    [openId],
  );

  return {
    // (a) bind these onto YOUR existing input
    inputValue: hovered ?? opts.value, // preview overrides your value
    isPreview: hovered !== null,       // -> readOnly + muted text

    // (b) drive the chips + panel UI
    isOpen: openCategory !== null,
    openCategory,
    items,
    open: setOpenId,
    close: () => { setOpenId(null); setHovered(null); },
    hover: setHovered,
    commit: (item: PromptPanelItem) => {
      opts.onCommit(item.prompt);
      setHovered(null);
      setOpenId(null);
    },
  };
}
```

---

## 2. Binding to your existing input

Whatever your input already is, you only change two things while previewing: its
**value** becomes `inputValue`, and it becomes **read-only + muted**.

```tsx
function ChatComposer() {
  const [input, setInput] = useState('');           // YOUR existing state
  const ref = useRef<HTMLTextAreaElement>(null);

  const starters = usePromptStarters({
    value: input,
    onCommit: (text) => {
      setInput(text);
      requestAnimationFrame(() => ref.current?.focus()); // focus after re-render
    },
  });

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* chips on top — swap for the panel when open */}
      {starters.isOpen ? (
        <PromptCategoryPanel
          title={starters.openCategory!.label}
          icon={starters.openCategory!.icon}
          items={starters.items}
          onClose={starters.close}
          onHover={starters.hover}
          onCommit={starters.commit}
          /* saved-prompt props are optional — see §5 */
          variant="canned"
          isSaved={() => false}
          onToggleSave={() => {}}
          onDelete={() => {}}
        />
      ) : (
        <PromptCategoryBar chips={promptCategories} onSelect={starters.open} />
      )}

      {/* YOUR existing input — only value + readOnly + text color change */}
      <textarea
        ref={ref}
        value={starters.inputValue}
        readOnly={starters.isPreview}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        placeholder="Ask anything, or pick a prompt above"
        className={`mt-3 block w-full resize-none rounded-2xl border border-[#E5E5E3] bg-white px-4 py-3 text-[15px] outline-none ${
          starters.isPreview ? 'text-stone-400' : 'text-stone-800'
        }`}
      />
    </div>
  );
}
```

### With Vercel AI SDK (`useChat`)

`onCommit` just maps to whatever sets your input:

```tsx
const { input, setInput } = useChat();
const starters = usePromptStarters({ value: input, onCommit: setInput });
// <textarea value={starters.inputValue} readOnly={starters.isPreview} onChange={(e) => setInput(e.target.value)} />
```

### No-preview fallback

If you cannot toggle your input to read-only (e.g. it is uncontrolled or owned by a
form library), skip the preview: don't pass `hover`, ignore `inputValue`/`isPreview`,
and just use `commit` on click. You keep the chips, the dropdown, and click-to-fill —
you only lose the in-input preview.

---

## 3. The chip bar (collapsed state)

A single non-wrapping row: a fixed circular search button is pinned on the left, then
chips scroll horizontally beside it. When the chips overflow, edge fades plus hover
arrows appear; otherwise the row looks like a plain set of pills. The arrows and fades
are purely additive, so it degrades gracefully on touch (native swipe scroll).

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, type LucideIcon } from 'lucide-react';

export interface PromptCategoryChip { id: string; label: string; icon: LucideIcon; }

export function PromptCategoryBar({
  chips, onSelect, onSearch,
}: { chips: PromptCategoryChip[]; onSelect: (id: string) => void; onSearch?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges); // re-check when width changes
    observer.observe(el);
    window.addEventListener('resize', updateEdges);
    return () => { observer.disconnect(); window.removeEventListener('resize', updateEdges); };
  }, [updateEdges, chips.length]);

  const scrollByDir = (dir: -1 | 1) =>
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });

  return (
    <div className="group flex items-center gap-2">
      {/* fixed circular search, always pinned left */}
      <button type="button" onClick={onSearch} aria-label="Search prompts"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E5E3] bg-white text-stone-500 transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700">
        <Search className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="relative min-w-0 flex-1">
        {canLeft && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#FAFAF8] to-transparent" />
            <button type="button" onClick={() => scrollByDir(-1)} aria-label="Scroll left"
              className="absolute left-0 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E5E3] bg-white text-stone-500 opacity-0 transition-opacity hover:text-stone-800 group-hover:opacity-100">
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
          </>
        )}

        {/* one row, native horizontal scroll, scrollbar hidden */}
        <div ref={scrollRef} onScroll={updateEdges}
          className="flex gap-2 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => {
            const Icon = chip.icon;
            return (
              <button key={chip.id} type="button" onClick={() => onSelect(chip.id)}
                className="flex shrink-0 items-center gap-2 rounded-2xl border border-[#E5E5E3] bg-white px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50">
                <Icon className="h-4 w-4 text-stone-500" strokeWidth={1.75} />
                {chip.label}
              </button>
            );
          })}
        </div>

        {canRight && (
          <>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#FAFAF8] to-transparent" />
            <button type="button" onClick={() => scrollByDir(1)} aria-label="Scroll right"
              className="absolute right-0 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E5E3] bg-white text-stone-500 opacity-0 transition-opacity hover:text-stone-800 group-hover:opacity-100">
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

> The edge-fade color (`#FAFAF8`) must match your page background so chips appear to
> dissolve under the arrows. If your input is docked/narrow, this same row keeps the
> search button visible while the categories scroll independently.

---

## 4. The panel (expanded state)

Give it the same width/corner radius as the chip row so the swap reads as an
in-place morph. Row hover fires `onHover`; row click fires `onCommit`; `Esc` closes.
The save/delete affordances are optional (see §5) — pass no-ops if you don't use them.

```tsx
import { useEffect } from 'react';
import { Bookmark, BookmarkCheck, Trash2, X, type LucideIcon } from 'lucide-react';

export interface PromptPanelItem { id: string; label: string; prompt: string; }

interface Props {
  title: string;
  icon: LucideIcon;
  items: PromptPanelItem[];
  onClose: () => void;
  onHover: (prompt: string | null) => void;
  onCommit: (item: PromptPanelItem) => void;
  // optional saved-prompt affordances
  variant?: 'canned' | 'saved';
  isSaved?: (prompt: string) => boolean;
  onToggleSave?: (item: PromptPanelItem) => void;
  onDelete?: (item: PromptPanelItem) => void;
}

export function PromptCategoryPanel({
  title, icon: Icon, items, onClose, onHover, onCommit,
  variant = 'canned', isSaved = () => false, onToggleSave = () => {}, onDelete = () => {},
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#E5E5E3] bg-white">
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2 text-stone-400">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600">
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* clearing hover on list-leave makes the input snap back to the draft */}
      <div className="max-h-[320px] overflow-y-auto" onMouseLeave={() => onHover(null)}>
        {items.map((item) => {
          const saved = isSaved(item.prompt);
          return (
            <div key={item.id} onMouseEnter={() => onHover(item.prompt)}
              className="group flex items-center gap-3 border-t border-[#EFEFEC] px-5 transition-colors hover:bg-stone-50">
              <button type="button" onClick={() => onCommit(item)}
                className="min-w-0 flex-1 py-3.5 text-left text-[15px] text-stone-800 outline-none">
                <span className="block truncate">{item.label}</span>
              </button>

              {/* optional: stopPropagation so this doesn't also commit the row */}
              {variant === 'saved' ? (
                <button type="button" aria-label="Delete saved prompt"
                  onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                  className="shrink-0 rounded-md p-1.5 text-stone-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              ) : (
                <button type="button" aria-label={saved ? 'Remove from saved' : 'Save prompt'}
                  onClick={(e) => { e.stopPropagation(); onToggleSave(item); }}
                  className={`shrink-0 rounded-md p-1.5 transition-all ${
                    saved ? 'text-amber-500 opacity-100 hover:bg-amber-50'
                          : 'text-stone-300 opacity-0 hover:bg-stone-100 hover:text-stone-500 group-hover:opacity-100'
                  }`}>
                  {saved ? <BookmarkCheck className="h-4 w-4" strokeWidth={1.75} />
                         : <Bookmark className="h-4 w-4" strokeWidth={1.75} />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

> **Inline vs popover.** The default swaps chips ↔ panel in place. If your input is
> docked (e.g. a fixed footer), render the panel as an absolutely-positioned popover
> anchored to the chip row instead — the hook and handlers are identical.

---

## 5. Data

Categories and prompts are plain data. `label` is the short title shown in the list;
`prompt` is the full text previewed/committed.

```ts
import { Target, TrendingUp, GitCompare, FileSignature, type LucideIcon } from 'lucide-react';

export interface PromptCategory { id: string; label: string; icon: LucideIcon; }
export interface PromptSuggestion { id: string; categoryId: string; label: string; prompt: string; }

export const promptCategories: PromptCategory[] = [
  { id: 'pitch', label: 'Pitch', icon: Target },
  { id: 'research', label: 'Research', icon: TrendingUp },
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'generate', label: 'Generate', icon: FileSignature },
];

export const promptSuggestions: PromptSuggestion[] = [
  { id: 'p1', categoryId: 'pitch', label: 'Build a mandate pitch angle',
    prompt: 'Build me a pitch angle backed by recent issuance and investor demand.' },
  // ...5-6 per category so the panel scrolls
];
```

---

## 6. Optional: saved prompts

Saved prompts reuse the **same panel** — add one extra chip (`{ id: 'saved' }`) and
feed it items from storage instead of the static list, with `variant="saved"`. If you
don't want this, skip the whole section; suggestions work without it.

```ts
const KEY = 'prompt-starters-saved';
export interface SavedPrompt { id: string; label: string; prompt: string; savedAt: number; }

export function useSavedPrompts() {
  const [saved, setSaved] = useState<SavedPrompt[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(saved)); }, [saved]);

  const key = (p: string) => p.trim().toLowerCase();
  const isSaved = (p: string) => saved.some((s) => key(s.prompt) === key(p));
  const toggle = (prompt: string, label?: string) =>
    setSaved((prev) => isSaved(prompt)
      ? prev.filter((s) => key(s.prompt) !== key(prompt))
      : [{ id: crypto.randomUUID(), label: label ?? prompt, prompt, savedAt: Date.now() }, ...prev]);
  const remove = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id));

  return { saved, isSaved, toggle, remove };
}
```

Wire it where you resolve the open category: when the open chip is `saved`, map
`saved` → `PromptPanelItem[]` and pass `variant="saved"` + `onDelete`. For canned
categories pass `isSaved` + `onToggleSave` so rows show the bookmark.

---

## Design tokens

| Token            | Value          | Use                                   |
| ---------------- | -------------- | ------------------------------------- |
| Surface          | `#FFFFFF`      | chips + panel                         |
| Hairline border  | `#E5E5E3`      | chip/panel borders                    |
| Row divider      | `#EFEFEC`      | between prompt rows                   |
| Text             | `stone-800`    | committed text                        |
| Preview / muted  | `stone-400`    | hover preview, placeholders, meta     |
| Save accent      | `amber-500`    | active bookmark                       |
| Delete accent    | `red-500`      | saved-row delete                      |
| Corner radius    | `1.5rem`       | composer + panel (match, for morph)       |
| Chip radius      | `rounded-2xl`  | category chips (soft, squarer than pill)  |

Principles: low-commitment chips, the **input doubles as the preview surface**, and
the panel mirrors the chip row's radius/width so opening it reads as an in-place
transition rather than a brand-new component.
