# Thinking Timeline — Porting Guide

A portable spec for a **stepwise reasoning trace**: a quiet vertical rail with
checkpoint markers that shows an agent "thinking" through a task. A leading
**search** node (magnifying glass + source chips), one **step** node per stage
(its narration types in while running), and a settled **"Thought for Ns"** node
with a tick.

This guide covers **only the reasoning steps**. Any final answer you render
afterwards is out of scope.

Assumed stack: **React 18 + TypeScript**, plain CSS (Tailwind optional). No
other dependencies.

---

## 1. What it looks like

```
Thinking…                          ← header label (animated dots while live)

(Q)  Searching issuer and market sources
 │   [● bloomberg.com] [● ft.com] [● bmwgroup.com] [+11 more]
 │
 ●   Resolving the issuer entity
 │   Confirming which issuer "BMW" refers to. The strongest match is…   ▍
 │
 ●   Pulling recent issuance
 │   Gathering recent benchmark supply — the last few senior deals…
 │
 ●   Composing the brief
 │   Drafting from the resolved entity and deal history…
 │
(✓)  Thought for 13s              ← appears only once settled
     Done
```

Key visual traits:

- **One continuous vertical line** links the markers. It runs **into the final
  tick but not out the other side**.
- **Markers**: a magnifying glass (search), solid dots (steps), a circled tick
  (settled). The running step's dot gently pulses.
- **Typography**: bold-ish 14px titles, muted 14px body, 13px header/labels.
- **Motion**: each node fades/slides in; the active body types in with a
  blinking caret; everything is disabled under `prefers-reduced-motion`.

Design intent: borderless and quiet. The surrounding chat bubble/message is the
container. Restraint over decoration — a near-monochrome stone palette with a
single near-black accent (the dots).

---

## 2. Data model

The component is driven by a list of steps plus a run status. Map your own
backend/stream onto these shapes.

```ts
type RunStatus = 'streaming' | 'ready' | 'error';

type StepState = 'running' | 'done' | 'errored';

interface ReasoningStep {
  id: string;          // stable key
  title: string;       // headline, e.g. "Resolving the issuer entity"
  body: string;        // full narration text for this step
  state: StepState;    // running while in progress, done/errored when finished
}

interface SourceChip {
  label: string;       // e.g. "bloomberg.com"
  mono: string;        // 1–2 char monogram, e.g. "B"
  tint: string;        // monogram background colour
}
```

Notes:

- `steps` should **grow over time**: append a step (in `running` state) when a
  stage starts, and flip it to `done` when it finishes. Each rendered step in
  the list is one that has already started.
- The **search node** and **source chips** are presentational. Feed them real
  sources if you have them, otherwise use static monograms (no external favicon
  requests).

---

## 3. The streaming "type-in" effect

While a step is `running`, its body text is revealed a few characters at a time.
This is a simple client-side timer ("character pump"). If your backend already
streams partial text, skip this and feed the partial text straight in.

```tsx
const CHUNK_SIZE = 8;   // characters revealed per tick
const CHUNK_MS = 22;    // ms between ticks

// streamText[stepId] holds the currently-revealed prefix of the active step.
const [streamText, setStreamText] = useState<Record<string, string>>({});

useEffect(() => {
  if (status !== 'streaming') return;
  const active = steps.find((s) => s.state === 'running');
  if (!active) return;

  const full = active.body;
  let pos = 0;
  setStreamText((prev) => ({ ...prev, [active.id]: '' }));

  const id = window.setInterval(() => {
    pos = Math.min(full.length, pos + CHUNK_SIZE);
    setStreamText((prev) => ({ ...prev, [active.id]: full.slice(0, pos) }));
    if (pos >= full.length) window.clearInterval(id);
  }, CHUNK_MS);

  return () => window.clearInterval(id);
  // Re-run when the active step changes.
}, [status, steps.find((s) => s.state === 'running')?.id]);
```

When rendering a step:

- `running` → show `streamText[step.id]` + a blinking caret.
- `done`/`errored` → show the **full** `step.body` (don't depend on the pump
  having finished).

---

## 4. Elapsed "Thought for Ns"

Start a clock when the run begins; freeze it when the run settles.

```tsx
const [elapsed, setElapsed] = useState<number | null>(null);
const startRef = useRef<number | null>(null);
const settled = status === 'ready' || status === 'error';

useEffect(() => {
  if (status === 'streaming' && startRef.current === null) {
    startRef.current = performance.now();
  }
  if (settled && startRef.current !== null && elapsed === null) {
    setElapsed(Math.max(1, Math.round((performance.now() - startRef.current) / 1000)));
  }
}, [status, settled, elapsed]);
```

Reset `elapsed`, `startRef`, and `streamText` whenever you switch to a new
message/run.

---

## 5. Full component

Self-contained and project-agnostic. Drop in, pass `steps` + `status`.

```tsx
import { useEffect, useRef, useState } from 'react';

type RunStatus = 'streaming' | 'ready' | 'error';
type StepState = 'running' | 'done' | 'errored';

interface ReasoningStep {
  id: string;
  title: string;
  body: string;
  state: StepState;
}
interface SourceChip {
  label: string;
  mono: string;
  tint: string;
}

const CHUNK_SIZE = 8;
const CHUNK_MS = 22;

function MagnifyingGlass() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path strokeLinecap="round" d="M15.4 15.4L20 20" />
    </svg>
  );
}
function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.2l2.4 2.4 4.6-4.8" />
    </svg>
  );
}

export function ThinkingTimeline({
  steps,
  status,
  searchTitle = 'Searching sources',
  sources = [],
  moreCount = 0,
}: {
  steps: ReasoningStep[];
  status: RunStatus;
  searchTitle?: string;
  sources?: SourceChip[];
  moreCount?: number;
}) {
  const [streamText, setStreamText] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);

  const settled = status === 'ready' || status === 'error';
  const activeId = steps.find((s) => s.state === 'running')?.id ?? '';

  // Character pump for the active step.
  useEffect(() => {
    if (status !== 'streaming' || !activeId) return;
    const full = steps.find((s) => s.id === activeId)?.body ?? '';
    let pos = 0;
    setStreamText((prev) => ({ ...prev, [activeId]: '' }));
    const id = window.setInterval(() => {
      pos = Math.min(full.length, pos + CHUNK_SIZE);
      setStreamText((prev) => ({ ...prev, [activeId]: full.slice(0, pos) }));
      if (pos >= full.length) window.clearInterval(id);
    }, CHUNK_MS);
    return () => window.clearInterval(id);
  }, [status, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Elapsed clock.
  useEffect(() => {
    if (status === 'streaming' && startRef.current === null) {
      startRef.current = performance.now();
    }
    if (settled && startRef.current !== null && elapsed === null) {
      setElapsed(Math.max(1, Math.round((performance.now() - startRef.current) / 1000)));
    }
  }, [status, settled, elapsed]);

  const started = steps.length > 0 || status === 'streaming';
  if (!started) {
    return (
      <div className="tt" aria-label="Thinking">
        <p className="tt__label tt__label--live">Thinking</p>
      </div>
    );
  }

  const showDone = settled && steps.length > 0;

  return (
    <div className="tt">
      <p className={`tt__label ${!showDone ? 'tt__label--live' : ''}`}>
        {showDone ? 'Reasoned' : 'Thinking'}
      </p>

      <ol className="tt__list" role="list">
        {/* Search checkpoint */}
        <li className="tt__node">
          <span className="tt__marker tt__marker--icon" aria-hidden>
            <MagnifyingGlass />
          </span>
          <div className="tt__content">
            <p className="tt__title">{searchTitle}</p>
            {(sources.length > 0 || moreCount > 0) && (
              <div className="tt__sources">
                {sources.map((s) => (
                  <span key={s.label} className="tt__chip">
                    <span className="tt__chip-mono" style={{ backgroundColor: s.tint }} aria-hidden>
                      {s.mono}
                    </span>
                    {s.label}
                  </span>
                ))}
                {moreCount > 0 && (
                  <span className="tt__chip tt__chip--more">+{moreCount} more</span>
                )}
              </div>
            )}
          </div>
        </li>

        {/* One node per step */}
        {steps.map((step) => {
          const running = step.state === 'running';
          const body = running ? (streamText[step.id] ?? '') : step.body;
          return (
            <li key={step.id} className="tt__node">
              <span
                className={`tt__marker tt__marker--dot ${running ? 'tt__marker--running' : ''}`}
                aria-hidden
              />
              <div className="tt__content">
                <p className="tt__title">{step.title}</p>
                {body && (
                  <p className="tt__body">
                    {body}
                    {running && <span className="tt__cursor" aria-hidden>|</span>}
                  </p>
                )}
              </div>
            </li>
          );
        })}

        {/* Settled checkpoint */}
        {showDone && (
          <li className="tt__node">
            <span className="tt__marker tt__marker--icon tt__marker--check" aria-hidden>
              <Check />
            </span>
            <div className="tt__content">
              <p className="tt__title">
                {elapsed !== null ? `Thought for ${elapsed}s` : 'Thought it through'}
              </p>
              <p className="tt__done">Done</p>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
```

---

## 6. Full CSS

Plain CSS, BEM-ish names. Two CSS variables let you re-theme quickly:

- `--tt-rail` — the connector line / borders colour.
- `--tt-bg` — must match the surface the timeline sits on, so the marker
  "rings" can punch a clean gap in the line.

```css
.tt {
  --tt-rail: #e7e5e4;   /* line + chip borders (stone-200) */
  --tt-bg: #fafaf8;     /* MUST match the surrounding surface */
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Header label */
.tt__label {
  font-size: 13px;
  font-weight: 500;
  color: #a8a29e;            /* stone-400 */
  letter-spacing: 0.01em;
}
.tt__label--live { position: relative; }
.tt__label--live::after {
  content: '…';
  animation: tt-ellipsis 1.4s steps(4, end) infinite;
}
@keyframes tt-ellipsis {
  0%   { content: ''; }
  25%  { content: '·'; }
  50%  { content: '··'; }
  75%, 100% { content: '···'; }
}

/* List + nodes */
.tt__list { position: relative; margin: 0; padding: 0; list-style: none; }

.tt__node {
  position: relative;
  display: grid;
  grid-template-columns: 22px 1fr;   /* fixed marker lane + content */
  column-gap: 12px;
  padding-bottom: 22px;
  animation: tt-node-in 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.tt__node:last-child { padding-bottom: 0; }

/* Connector: each node EXCEPT the last draws a segment from its own marker
 * centre (top: 12px) down into the next marker centre (bottom: -12px). The
 * last node draws nothing, so the line ends exactly at the final tick. */
.tt__node:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 10px;            /* ≈ centre of the 22px marker lane */
  top: 12px;             /* marker vertical centre = margin-top 1px + 11px */
  bottom: -12px;         /* reach into the next marker centre */
  width: 1.5px;
  background: var(--tt-rail);
}
@keyframes tt-node-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Markers — z-index:1 so they sit above the connector segments */
.tt__marker {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-top: 1px;
}
.tt__marker--icon {
  color: #78716c;                /* stone-500 */
  background: var(--tt-bg);      /* opaque ring masks the line behind it */
  border-radius: 999px;
}
.tt__marker--icon svg { width: 17px; height: 17px; }
.tt__marker--check { color: #57534e; } /* stone-600 */

/* Step dot. The box-shadow ring (in --tt-bg) punches the line cleanly. */
.tt__marker--dot::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #1c1917;           /* stone-900 */
  box-shadow: 0 0 0 4px var(--tt-bg);
}
.tt__marker--dot.tt__marker--running::before {
  background: #78716c;
  animation: tt-pulse 1.4s ease-in-out infinite;
}
@keyframes tt-pulse {
  0%, 100% { transform: scale(1);   opacity: 1; }
  50%      { transform: scale(0.7); opacity: 0.55; }
}

/* Text */
.tt__content { min-width: 0; padding-top: 1px; }
.tt__title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: #292524;                /* stone-800 */
}
.tt__body {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.65;
  color: #78716c;                /* stone-500 */
  text-wrap: pretty;
}
.tt__done { margin-top: 2px; font-size: 13px; color: #a8a29e; }

/* Typing caret */
.tt__cursor {
  display: inline-block;
  margin-left: 1px;
  color: #a8a29e;
  animation: tt-cursor 900ms step-end infinite;
}
@keyframes tt-cursor { 50% { opacity: 0.15; } }

/* Source chips */
.tt__sources { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.tt__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px 0 6px;
  border: 1px solid var(--tt-rail);
  border-radius: 999px;
  background: #ffffff;
  font-size: 12px;
  color: #57534e;
  white-space: nowrap;
}
.tt__chip--more { padding: 0 10px; color: #a8a29e; }
.tt__chip-mono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .tt__node { animation: none; }
  .tt__marker--dot.tt__marker--running::before { animation: none; }
  .tt__cursor,
  .tt__label--live::after { animation: none; }
}
```

---

## 7. How the connector line works (the important detail)

This is the part people get wrong, so it's worth understanding:

1. The line is **not** one element spanning the whole list. Instead, **every
   node except the last** draws its own short segment via `::before`.
2. Each segment starts at that node's marker centre (`top: 12px`) and extends
   `bottom: -12px` — i.e. 12px past the node, landing on the **next** marker's
   centre. Because nodes are stacked with no gaps, the segments join into one
   continuous line.
3. The **last node draws no segment**, so the line terminates exactly at the
   final tick — it goes *into* the tick, not *out the other side*.
4. Markers have an **opaque circular ring** (`background`/`box-shadow` in
   `--tt-bg`) and `z-index: 1`, so they sit on top of the line and mask it
   cleanly where they overlap.

The magic numbers come from the marker lane: `22px` wide, marker `margin-top:
1px`, so the marker centre is `1 + 11 = 12px` from the node top, and `~11px`
from the left (we use `10px` for the 1.5px line to look centred). If you change
the lane width or marker size, recompute `top` and `left`.

---

## 8. State machine (per run)

| Condition                                   | UI                                              |
|---------------------------------------------|-------------------------------------------------|
| No steps yet, `status === 'streaming'`      | Header only: "Thinking…"                        |
| Steps exist, `status === 'streaming'`       | Search node + step nodes; active body types in  |
| `status === 'ready' \| 'error'`             | Header → "Reasoned"; append "Thought for Ns" tick |

A step renders only once it has started, so nodes appear progressively as the
run emits stages. The active step shows streamed text + caret; finished steps
show full text.

---

## 9. Accessibility

- The timeline is an `<ol role="list">`; each step is an `<li>`.
- Decorative markers and the caret use `aria-hidden`.
- Consider wrapping the block in a container with `aria-live="polite"` and
  `aria-busy={status === 'streaming'}` so screen readers announce progress.
- All animation is gated behind `prefers-reduced-motion: reduce`.

---

## 10. Tuning knobs

| Want to…                         | Change                                             |
|----------------------------------|----------------------------------------------------|
| Type faster / slower             | `CHUNK_SIZE` (chars/tick), `CHUNK_MS` (interval)   |
| Re-theme line/borders            | `--tt-rail`                                        |
| Sit on a different surface       | `--tt-bg` (must match the background exactly)      |
| Tighter / looser steps           | `.tt__node` `padding-bottom`                       |
| Different marker lane / dot size | `.tt__node` `grid-template-columns`, `.tt__marker*` (recompute connector `top`/`left`) |
| Swap the "agent working" glyph   | Replace `<MagnifyingGlass />`                      |
| Different completion label       | The `Reasoned` / `Thought for Ns` strings          |
```
