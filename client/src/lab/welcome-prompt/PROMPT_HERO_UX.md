# Prompt Hero — Welcome screen with prompt starters

A clean, Claude-style welcome hero: one composer textbox, a row of category chips
beneath it, and a tap-to-open scrollable prompt panel. Hovering a prompt previews
its full text inside the composer; clicking commits it. Optional "Saved" prompts
live in the same pattern.

This doc is framework-generic. It assumes **React 18 + Vite + Tailwind CSS**, and
uses [`lucide-react`](https://lucide.dev) for icons (swap for any icon set).

```
npm i lucide-react
```

---

## The UX in four moves

1. **Compose** — a single rounded textbox is the hero. Nothing else competes with it.
2. **Browse** — category chips sit directly beneath the box (low commitment).
3. **Swap** — clicking a chip replaces the chip row with a panel listing that
   category's prompts (header + close button + scrollable list).
4. **Preview → commit** — hovering a row shows the full prompt in the box (muted);
   clicking fills the box for real and focuses it so the user can edit before sending.

The magic is that the composer doubles as the preview surface, so there is no
separate tooltip or detail pane to manage.

---

## State model (the whole thing)

Three pieces of state drive everything. Keep them in the parent that renders the hero.

```tsx
const [committed, setCommitted] = useState('');        // real text in the box
const [hovered, setHovered] = useState<string | null>(null);   // hover preview
const [openCategoryId, setOpenCategoryId] = useState<string | null>(null); // null = chips

// Derived: what the textbox shows, and whether it is a preview.
const displayValue = hovered ?? committed;
const isPreview = hovered !== null;
```

Rules:

| Event                    | State change                                                        |
| ------------------------ | ------------------------------------------------------------------- |
| Click a category chip    | `setOpenCategoryId(id)` (chips → panel)                             |
| Close the panel (X / Esc)| `setOpenCategoryId(null)` + `setHovered(null)`                      |
| Hover a prompt row       | `setHovered(prompt)`                                                |
| Mouse leaves the list    | `setHovered(null)`                                                  |
| Click a prompt row       | `setCommitted(prompt)`, `setHovered(null)`, close panel, focus box  |
| Type in the box          | `setCommitted(value)` (only possible when not previewing)           |

Because `displayValue = hovered ?? committed`, the preview is automatic: when
`hovered` clears, the box snaps back to whatever was committed.

---

## 1. Data

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

## 2. The composer (preview-aware)

A `forwardRef` textarea so the parent can focus it after a commit. It renders muted
text while previewing and disables submit during a preview.

```tsx
import { forwardRef } from 'react';
import { ArrowUp, Plus } from 'lucide-react';

interface WelcomeHeroProps {
  displayValue: string;
  isPreview: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export const WelcomeHero = forwardRef<HTMLTextAreaElement, WelcomeHeroProps>(
  function WelcomeHero({ displayValue, isPreview, onChange, onSubmit }, ref) {
    const canSubmit = !isPreview && displayValue.trim().length > 0;
    return (
      <div className="rounded-[1.5rem] border border-[#E5E5E3] bg-white shadow-sm transition-all focus-within:border-[#D5D5D3] focus-within:shadow-md">
        <textarea
          ref={ref}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSubmit) onSubmit(); }
          }}
          rows={3}
          readOnly={isPreview}                 // preview text is not editable
          placeholder="Ask anything, or pick a prompt below"
          className={`block w-full resize-none bg-transparent px-5 pt-5 text-[15px] leading-relaxed outline-none placeholder:text-stone-400 ${
            isPreview ? 'text-stone-400' : 'text-stone-800'  // muted while previewing
          }`}
        />
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100">
            <Plus className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] text-white hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400"
            aria-label="Send"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  },
);
```

---

## 3. The chip bar (collapsed state)

```tsx
import type { LucideIcon } from 'lucide-react';

export interface PromptCategoryChip { id: string; label: string; icon: LucideIcon; }

export function PromptCategoryBar({
  chips, onSelect,
}: { chips: PromptCategoryChip[]; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {chips.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className="flex items-center gap-2 rounded-full border border-[#E5E5E3] bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm hover:border-stone-300 hover:bg-stone-50"
        >
          <Icon className="h-4 w-4 text-stone-500" strokeWidth={1.75} />
          {label}
        </button>
      ))}
    </div>
  );
}
```

---

## 4. The panel (expanded state) — the transition target

Same outer shape as the chip bar's container so the swap feels like an in-place
morph. Row hover fires `onHover`; row click fires `onCommit`. `Esc` closes.

```tsx
import { useEffect } from 'react';
import { X, type LucideIcon } from 'lucide-react';

export interface PromptPanelItem { id: string; label: string; prompt: string; }

export function PromptCategoryPanel({
  title, icon: Icon, items, onClose, onHover, onCommit,
}: {
  title: string; icon: LucideIcon; items: PromptPanelItem[];
  onClose: () => void;
  onHover: (prompt: string | null) => void;
  onCommit: (item: PromptPanelItem) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#E5E5E3] bg-white shadow-sm">
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

      {/* clearing hover on list-leave makes the composer snap back */}
      <div className="max-h-[320px] overflow-y-auto" onMouseLeave={() => onHover(null)}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onMouseEnter={() => onHover(item.prompt)}
            onClick={() => onCommit(item)}
            className="block w-full border-t border-[#EFEFEC] px-5 py-3.5 text-left text-[15px] text-stone-800 hover:bg-stone-50"
          >
            <span className="block truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

> To add a save/delete affordance per row, render a trailing icon button that is
> `opacity-0 group-hover:opacity-100` and call `e.stopPropagation()` in its
> `onClick` so it does not also trigger the row's commit.

---

## 5. The orchestrator (swap + preview + commit)

This is where the three state values meet. Render the composer, then **either** the
chip bar **or** the panel.

```tsx
import { useMemo, useRef, useState } from 'react';

export function PromptHero({ onSend }: { onSend?: (text: string) => void }) {
  const [committed, setCommitted] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openCategory = useMemo(
    () => promptCategories.find((c) => c.id === openCategoryId) ?? null,
    [openCategoryId],
  );
  const items = useMemo(
    () => promptSuggestions.filter((s) => s.categoryId === openCategoryId),
    [openCategoryId],
  );

  const commit = (item: PromptPanelItem) => {
    setCommitted(item.prompt);
    setHovered(null);
    setOpenCategoryId(null);
    requestAnimationFrame(() => textareaRef.current?.focus()); // focus after re-render
  };

  const submit = () => {
    const text = committed.trim();
    if (!text) return;
    onSend?.(text);          // wire to your chat send / router here
    setCommitted('');
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16">
      <WelcomeHero
        ref={textareaRef}
        displayValue={hovered ?? committed}
        isPreview={hovered !== null}
        onChange={setCommitted}
        onSubmit={submit}
      />
      <div className="mt-4 w-full">
        {openCategory ? (
          <PromptCategoryPanel
            title={openCategory.label}
            icon={openCategory.icon}
            items={items}
            onClose={() => { setOpenCategoryId(null); setHovered(null); }}
            onHover={setHovered}
            onCommit={commit}
          />
        ) : (
          <PromptCategoryBar chips={promptCategories} onSelect={setOpenCategoryId} />
        )}
      </div>
    </div>
  );
}
```

---

## 6. Optional: saved prompts

Saved prompts reuse the exact same panel — just add one more chip (`{ id: 'saved' }`)
and feed it items from storage instead of the static list. A minimal persistence hook:

```ts
const KEY = 'prompt-hero-saved';
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

In the orchestrator, when `openCategoryId === 'saved'` map `saved` to
`PromptPanelItem[]` and render the panel in a "saved" variant (delete instead of save).

---

## 7. Wiring into a real app

- **Send**: replace `onSend?.(text)` with your real action — e.g. `sendMessage({ text })`
  (Vercel AI SDK `useChat`), `setInput(text)`, or a route navigation.
- **Shared input**: if your app already has a footer composer, you can skip the hero's
  own send and instead lift `committed`/`setCommitted` up so the prompt fills the
  existing input. Keep `displayValue = hovered ?? committed` wherever the input lives.
- **Empty state**: render the hero only when there are no messages yet.

---

## Design tokens

| Token            | Value          | Use                                  |
| ---------------- | -------------- | ------------------------------------ |
| Page background  | `#FAFAF8`      | warm off-white canvas                |
| Surface          | `#FFFFFF`      | composer + panel                     |
| Hairline border  | `#E5E5E3`      | composer/panel/chip borders          |
| Row divider      | `#EFEFEC`      | between prompt rows                  |
| Primary / accent | `#1A1A1A`      | send button, headings                |
| Text             | `stone-800`    | committed text                       |
| Preview / muted  | `stone-400`    | hover preview, placeholders, meta    |
| Corner radius    | `1.5rem`       | composer + panel (matched, for morph)|

Principles: one strong element (the box), low-commitment chips, the composer doubles
as the preview surface, and the panel mirrors the chip container's radius/width so the
swap reads as an in-place transition rather than a new component.
