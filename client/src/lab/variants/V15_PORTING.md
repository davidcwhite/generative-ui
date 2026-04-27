# V15 Porting Guide

This guide explains how to re-implement the V15 workflow UX in another React + Vite codebase.

V15 is a compact processing rail for AI/tool workflows:

- A small circular status indicator per step.
- A running spinner while a step is active.
- A drawn completion ring and tick when a step finishes.
- Ambient streamed subtext under the active step.
- A click-to-expand detail drawer for the real input/output payload.
- A final response reveal after processing settles.

The pattern is intentionally generic. Replace the example events, step names, and final content with your application's own data.

## UX Principles

1. Keep the step headline primary.
   The user should first understand what the system is doing, not parse raw logs.

2. Treat streamed data as proof of work.
   The ambient stream reassures the user that data is arriving, but it should stay visually quiet.

3. Use progressive disclosure.
   Raw inputs and outputs are available on click, but hidden by default.

4. Make completion feel deterministic.
   The running arc, completed ring, and tick should feel like one state machine, not separate decorations.

5. Respect reduced motion.
   The UI should still be understandable when animations are disabled.

## Visual Anatomy

V15 is designed as a **quiet, single-column processing rail**. It should feel like a native part of an assistant message, not a separate card or terminal.

```txt
Assistant message
└─ Processing rail
   ├─ Step row
   │  ├─ 14px circular status indicator
   │  ├─ Stage headline, 13px medium
   │  └─ Ambient stream, indented 24px under headline
   │     ├─ Two-line masked viewport
   │     ├─ Older streamed records muted
   │     └─ Current record clearer + blinking cursor
   ├─ Step row
   ├─ Step row
   └─ Final response, revealed after workflow settles
```

When a row is clicked:

```txt
Step row
└─ Detail drawer, indented to align with subtext
   ├─ Header: "Step detail" + status pill
   └─ Scrollable payload block
      ├─ tool
      ├─ input
      └─ output
```

### Layout Rules

- The workflow should be **borderless by default**. The surrounding chat bubble or message area provides the container.
- Step rows are vertically stacked with `14px` (`0.875rem`) between rows.
- The status indicator is `14px` square and sits in a fixed visual lane.
- The headline starts after a `10px` gap from the indicator.
- Subtext and detail drawers are indented `24px`, matching `indicator width 14px + gap 10px`.
- The streamed subtext is **two lines high**, not an expanding log.
- The detail drawer can scroll internally; it should not push the whole message into a giant technical block.

### Typography

Use two typographic voices:

- **Stage headline**: app sans-serif, `13px`, `font-weight: 500`, near-black.
- **Ambient stream and payloads**: monospace, `10.5px`, muted stone gray.

Recommended font stack:

```css
--workflow-font-sans: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
--workflow-font-mono: "SF Mono", Menlo, Monaco, "Courier New", monospace;
```

If your app does not use Inter, keep your app's normal UI font. The important part is the hierarchy: headline is readable; stream is quieter.

### Color Palette

The original V15 uses warm neutrals with semantic state colors:

```css
--workflow-stone-950: #1c1917; /* headline */
--workflow-stone-700: #44403c; /* running headline */
--workflow-stone-600: #57534e; /* primary detail text */
--workflow-stone-500: #78716c; /* current stream text */
--workflow-stone-400: #a8a29e; /* muted stream text */
--workflow-stone-300: #d6d3d1; /* pending / soft borders */
--workflow-stone-200: #e7e5e4; /* drawer border */
--workflow-stone-100: #f5f5f4; /* drawer fill */
--workflow-stone-50:  #fafaf9; /* drawer highlight */

--workflow-amber-600: #d97706; /* running spinner */
--workflow-emerald-600: #059669; /* done */
--workflow-emerald-700: #047857; /* done pill */
--workflow-rose-600: #e11d48; /* error indicator */
--workflow-rose-700: #be123c; /* error pill */
```

Do not overuse accent colors. Only the indicator and status pill need semantic color. The stream should remain neutral.

### Motion Rules

- Running spinner: `900ms linear infinite`.
- Completion ring draw: `320ms cubic-bezier(0.7, 0, 0.2, 1)`.
- Tick/cross draw: `220ms`, delayed `220ms` after ring starts.
- Collapse grid: `450ms cubic-bezier(0.7, 0, 0.2, 1)`.
- Final payload reveal: `360ms`, slight upward settle (`translateY(6px)` to `0`).
- Stream cursor blink: `900ms step-end infinite`.

Use the same easing throughout:

```css
--workflow-ease: cubic-bezier(0.7, 0, 0.2, 1);
```

This gives the UI a deliberate "lands into place" feel without bounce or overshoot.

### Interaction Model

- Clicking a step row toggles its detail drawer.
- The click target is the whole row, not just a chevron.
- While a step is actively running, show the ambient stream under that step.
- Once a stream has appeared for a step, keep it sticky for that message so the row does not visually jump to a different subline when the step completes.
- When the full workflow is ready, the step list may collapse into a summary line. Clicking the summary re-expands it.

### What Not To Do

- Do not render model-provided HTML or JSX.
- Do not show a full terminal panel by default.
- Do not make every streamed token bright or high-contrast.
- Do not place the final answer before the workflow has settled.
- Do not expose raw args/result as nested accordions. Use one clean detail drawer.

## File Layout

A clean port can use this structure:

```txt
src/
  workflow/
    types.ts
    CircleIndicator.tsx
    ProcessingWorkflow.tsx
    AmbientStream.tsx
    StepDetailDrawer.tsx
    ExampleWorkflowMessage.tsx
    workflow.css
```

Import `workflow.css` once from your app entry point:

```tsx
// src/main.tsx
import './workflow/workflow.css';
```

## Data Contracts

Use a generic step shape that is independent of any model SDK.

```ts
// src/workflow/types.ts
import type { ReactNode } from 'react';

export type CircleState = 'pending' | 'running' | 'done' | 'errored';

export type WorkflowStatus = 'submitted' | 'streaming' | 'ready' | 'error';

export interface WorkflowStep {
  id: string;
  toolName: string;
  stage: string;
  state: CircleState;
  args: unknown;
  result?: unknown;
  argsPreview: string;
  resultPreview?: string;
  hasResult: boolean;
}

export interface WorkflowMessageProps {
  messageId: string;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  isLastMessage: boolean;
  hasPayload: boolean;
  children: ReactNode;
}
```

Recommended state semantics:

- `pending`: step is known but has not started.
- `running`: step is actively receiving work/data.
- `done`: step completed successfully.
- `errored`: step failed.
- `submitted` / `streaming`: latest response is still in progress.
- `ready`: final content is complete.
- `error`: response stream failed.

## Circle Indicator

This is the spinner, completion ring, tick, and error cross.

```tsx
// src/workflow/CircleIndicator.tsx
import type { CircleState } from './types';

interface CircleIndicatorProps {
  state: CircleState;
  size?: number;
}

export function CircleIndicator({ state, size = 14 }: CircleIndicatorProps) {
  return (
    <svg
      className={`circle-ind circle-ind--${state}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={`status: ${state}`}
    >
      <circle
        className="circle-ind__bg"
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
      />

      <g className="circle-ind__spin">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="14 43"
          transform="rotate(-90 12 12)"
        />
      </g>

      <circle
        className="circle-ind__arc"
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />

      <path
        className="circle-ind__check"
        d="M7.5 12.4 L10.6 15.5 L16.5 9.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        className="circle-ind__cross"
        d="M9 9 L15 15 M15 9 L9 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

How it works:

- The background ring is always visible.
- The running state shows a rotating partial arc.
- Done/error states draw a full ring using `stroke-dashoffset`.
- The tick/cross draws after the ring lands.

## Processing Workflow

This component renders the step list, owns expand/collapse state, and reveals final content.

```tsx
// src/workflow/ProcessingWorkflow.tsx
import { useEffect, useState, type ReactNode } from 'react';
import { CircleIndicator } from './CircleIndicator';
import type { WorkflowStatus, WorkflowStep } from './types';

interface ProcessingWorkflowProps {
  steps: WorkflowStep[];
  status: WorkflowStatus;
  isLastMessage: boolean;
  messageId: string;
  hasPayload: boolean;
  children: ReactNode;
  renderInspector?: (step: WorkflowStep) => ReactNode;
  renderRowExtra?: (context: {
    step: WorkflowStep;
    index: number;
  }) => ReactNode;
  hideStepMeta?: (context: {
    step: WorkflowStep;
    index: number;
  }) => boolean;
  orchestrating?: boolean;
  contentReady?: boolean;
  collapseDurationMs?: number;
  postCollapseDelayMs?: number;
}

const DEFAULT_COLLAPSE_DUR_MS = 450;
const DEFAULT_POST_COLLAPSE_MS = 120;

function summaryFor(steps: WorkflowStep[]): string {
  const errorCount = steps.filter((step) => step.state === 'errored').length;
  const n = steps.length;

  if (errorCount > 0) {
    return n === 1 ? '1 step' : `${n} steps · ${errorCount} failed`;
  }

  return n === 1 ? '1 step' : `${n} steps`;
}

export function ProcessingWorkflow({
  steps,
  status,
  isLastMessage,
  messageId,
  hasPayload,
  children,
  renderInspector,
  renderRowExtra,
  hideStepMeta,
  orchestrating = false,
  contentReady = true,
  collapseDurationMs = DEFAULT_COLLAPSE_DUR_MS,
  postCollapseDelayMs = DEFAULT_POST_COLLAPSE_MS,
}: ProcessingWorkflowProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [payloadRevealed, setPayloadRevealed] = useState(!isLastMessage);

  const canCollapse =
    !orchestrating &&
    steps.length > 0 &&
    (isLastMessage ? status === 'ready' || status === 'error' : true);

  const showFullSteps = !canCollapse || stepsExpanded;
  const allStepsSettled = isLastMessage ? status === 'ready' : true;

  const showResponseBlock =
    contentReady &&
    allStepsSettled &&
    hasPayload &&
    (!isLastMessage || payloadRevealed);

  useEffect(() => {
    if (isLastMessage && (status === 'ready' || status === 'error')) {
      setStepsExpanded(false);
    }
  }, [isLastMessage, status, messageId]);

  useEffect(() => {
    if (!isLastMessage) {
      setPayloadRevealed(true);
      return;
    }

    if (status !== 'ready' || !hasPayload || !contentReady) {
      setPayloadRevealed(false);
      return;
    }

    if (steps.length === 0) {
      const id = requestAnimationFrame(() => {
        setPayloadRevealed(true);
      });
      return () => cancelAnimationFrame(id);
    }

    setPayloadRevealed(false);
    const timer = window.setTimeout(() => {
      setPayloadRevealed(true);
    }, collapseDurationMs + postCollapseDelayMs);

    return () => clearTimeout(timer);
  }, [
    collapseDurationMs,
    contentReady,
    hasPayload,
    isLastMessage,
    messageId,
    postCollapseDelayMs,
    status,
    steps.length,
  ]);

  const summaryLabel = summaryFor(steps);
  const errorCount = steps.filter((step) => step.state === 'errored').length;

  return (
    <div className="workflow-root">
      {steps.length > 0 && (
        <div className="workflow-rail">
          {canCollapse && (
            <button
              type="button"
              className="workflow-summary"
              onClick={() => setStepsExpanded((value) => !value)}
              aria-expanded={showFullSteps}
              title={showFullSteps ? 'Hide steps' : 'Show steps'}
            >
              <span
                className={`workflow-summary__chevron ${
                  showFullSteps ? 'workflow-summary__chevron--open' : ''
                }`}
                aria-hidden
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>

              {errorCount === 0 ? (
                <span className="workflow-summary__ok" aria-hidden>
                  ✓
                </span>
              ) : (
                <span className="workflow-summary__error" aria-hidden>
                  ×
                </span>
              )}

              <span className="workflow-summary__text">{summaryLabel}</span>
            </button>
          )}

          <div
            className={`workflow-collapse ${
              showFullSteps
                ? 'workflow-collapse--open'
                : 'workflow-collapse--closed'
            }`}
          >
            <div className="workflow-collapse__inner">
              <div className="workflow-shell" aria-live="polite" role="log">
                <div className="workflow-steps">
                  {steps.map((step, index) => {
                    const open = Boolean(openIds[step.id]);
                    const settled =
                      step.state === 'done' || step.state === 'errored';
                    const hideMeta = Boolean(hideStepMeta?.({ step, index }));

                    return (
                      <div key={step.id} className="workflow-step">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenIds((prev) => ({
                              ...prev,
                              [step.id]: !prev[step.id],
                            }))
                          }
                          className="workflow-step__button"
                        >
                          <div className="workflow-step__head">
                            <CircleIndicator
                              key={`${step.id}:${step.state}`}
                              state={step.state}
                              size={14}
                            />
                            <span
                              className={`workflow-step__stage workflow-step__stage--${step.state}`}
                            >
                              {step.stage}
                            </span>
                          </div>

                          {renderRowExtra?.({ step, index })}

                          {settled && !hideMeta && (
                            <div className="workflow-step__meta">
                              <div className="workflow-step__call">
                                <span className="workflow-step__tool">
                                  {step.toolName}
                                </span>
                                <span className="workflow-step__args">
                                  ({step.argsPreview})
                                </span>
                              </div>

                              {step.hasResult && (
                                <div className="workflow-step__result">
                                  <span
                                    className="workflow-step__arrow"
                                    aria-hidden="true"
                                  >
                                    ←
                                  </span>
                                  <span className="workflow-step__resultBody">
                                    {step.resultPreview}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </button>

                        {open && renderInspector?.(step)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResponseBlock && (
        <div key={`workflow-payload-${messageId}`} className="workflow-payload">
          {children}
        </div>
      )}
    </div>
  );
}
```

Key extension points:

- `renderRowExtra`: puts the ambient stream under the step headline.
- `hideStepMeta`: suppresses the normal args/result subline when the streamed subtext is present.
- `renderInspector`: renders the clean detail drawer after a row is clicked.
- `orchestrating`: keeps the full step list visible while the latest step is actively running.

## Ambient Stream

This is the V15 subtext treatment: a two-line masked viewport that scrolls older records upward while the newest record is clearer.

```tsx
// src/workflow/AmbientStream.tsx
import { useLayoutEffect, useRef } from 'react';

interface AmbientStreamProps {
  active: boolean;
  text: string;
}

export function AmbientStream({ active, text }: AmbientStreamProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lines = text.split('\n');
  const lastIndex = lines.length - 1;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [text]);

  return (
    <div className="ambient-stream" aria-label="Streamed processing detail">
      <div ref={ref} className="ambient-stream__viewport">
        <div className="ambient-stream__stack">
          {lines.map((line, index) => (
            <div
              key={`${index}:${line}`}
              className={
                index === lastIndex
                  ? 'ambient-stream__line ambient-stream__line--current'
                  : 'ambient-stream__line'
              }
            >
              {line}
              {active && index === lastIndex && (
                <span className="ambient-stream__cursor" aria-hidden>
                  |
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

The stream accepts plain text with newline-separated records. For SSE-style events, keep each event as one line:

```txt
data: {"event":"open","source":"catalog","scope":"records"}
data: {"event":"candidate","id":"record_001","score":0.98}
data: {"event":"validate","field":"owner","status":"matched"}
data: {"event":"done","elapsedMs":118}
```

## Step Detail Drawer

Use one clean drawer instead of nested `args` and `result` accordions.

```tsx
// src/workflow/StepDetailDrawer.tsx
import type { WorkflowStep } from './types';

function prettyJson(value: unknown) {
  if (value === undefined) return 'No payload returned yet.';

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function stateLabelFor(step: WorkflowStep) {
  if (step.state === 'done') return 'Complete';
  if (step.state === 'errored') return 'Needs attention';
  if (step.state === 'running') return 'In progress';
  return 'Queued';
}

export function StepDetailDrawer({ step }: { step: WorkflowStep }) {
  const payload = [
    `tool: ${step.toolName}`,
    '',
    'input',
    prettyJson(step.args),
    '',
    'output',
    prettyJson(step.result),
  ].join('\n');

  return (
    <div className="step-detail">
      <div className="step-detail__head">
        <span className="step-detail__title">Step detail</span>
        <span className={`step-detail__pill step-detail__pill--${step.state}`}>
          {stateLabelFor(step)}
        </span>
      </div>
      <pre className="step-detail__body">{payload}</pre>
    </div>
  );
}
```

## Example Usage

This example simulates the stream. In production, replace the timer with your real SSE/WebSocket/event source.

```tsx
// src/workflow/ExampleWorkflowMessage.tsx
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AmbientStream } from './AmbientStream';
import { ProcessingWorkflow } from './ProcessingWorkflow';
import { StepDetailDrawer } from './StepDetailDrawer';
import type { WorkflowMessageProps } from './types';

const CHUNK_SIZE = 10;
const CHUNK_MS = 24;

const MOCK_STREAM_BY_TOOL: Record<string, string> = {
  search_records: [
    'data: {"event":"open","source":"catalog","scope":"records"}',
    'data: {"event":"candidate","id":"record_001","score":0.98}',
    'data: {"event":"candidate","id":"record_002","score":0.91}',
    'data: {"event":"validate","field":"owner","status":"matched"}',
    'data: {"event":"lock","id":"record_001","confidence":"high"}',
    'data: {"event":"done","tool":"search_records","elapsedMs":118}',
  ].join('\n'),
  fetch_history: [
    'data: {"event":"cursor","source":"history","page":1}',
    'data: {"event":"row","id":"hist_001","type":"update"}',
    'data: {"event":"row","id":"hist_002","type":"approval"}',
    'data: {"event":"row","id":"hist_003","type":"comment"}',
    'data: {"event":"summary","count":3}',
    'data: {"event":"done","tool":"fetch_history","elapsedMs":204}',
  ].join('\n'),
  compose_answer: [
    'data: {"event":"plan","sections":3,"tone":"concise"}',
    'data: {"event":"draft","section":"summary","tokens":42}',
    'data: {"event":"draft","section":"evidence","tokens":36}',
    'data: {"event":"draft","section":"next_steps","tokens":28}',
    'data: {"event":"format","target":"markdown","status":"queued"}',
    'data: {"event":"done","tool":"compose_answer","elapsedMs":262}',
  ].join('\n'),
};

function streamForTool(toolName: string) {
  return (
    MOCK_STREAM_BY_TOOL[toolName] ??
    `data: {"event":"open","tool":"${toolName}"}`
  );
}

export function ExampleWorkflowMessage({
  messageId,
  steps,
  status,
  isLastMessage,
  hasPayload,
  children,
}: WorkflowMessageProps & { children: ReactNode }) {
  const [streamTextByStepId, setStreamTextByStepId] = useState<
    Record<string, string>
  >({});

  const activeIndex = useMemo(
    () => steps.findIndex((step) => step.state === 'running'),
    [steps],
  );

  const activeStep = activeIndex >= 0 ? steps[activeIndex] : undefined;
  const activeStepId = activeStep?.id ?? '';
  const activeToolName = activeStep?.toolName ?? '';

  const orchestrating =
    isLastMessage &&
    (status === 'submitted' || status === 'streaming') &&
    Boolean(activeStep);

  useEffect(() => {
    setStreamTextByStepId({});
  }, [messageId]);

  useEffect(() => {
    if (!orchestrating || !activeStepId || !activeToolName) return;

    const full = streamForTool(activeToolName);
    let position = 0;

    setStreamTextByStepId((prev) => ({
      ...prev,
      [activeStepId]: '',
    }));

    const timer = window.setInterval(() => {
      position = Math.min(full.length, position + CHUNK_SIZE);

      setStreamTextByStepId((prev) => ({
        ...prev,
        [activeStepId]: full.slice(0, position),
      }));

      if (position >= full.length) {
        window.clearInterval(timer);
      }
    }, CHUNK_MS);

    return () => window.clearInterval(timer);
  }, [orchestrating, activeStepId, activeToolName, messageId]);

  return (
    <ProcessingWorkflow
      steps={steps}
      status={status}
      isLastMessage={isLastMessage}
      messageId={messageId}
      hasPayload={hasPayload}
      renderInspector={(step) => <StepDetailDrawer step={step} />}
      orchestrating={orchestrating}
      hideStepMeta={({ step }) =>
        isLastMessage && Boolean(streamTextByStepId[step.id])
      }
      renderRowExtra={({ step }) => {
        const text = streamTextByStepId[step.id];

        return text ? (
          <AmbientStream active={step.state === 'running'} text={text} />
        ) : null;
      }}
    >
      {children}
    </ProcessingWorkflow>
  );
}
```

Example parent component:

```tsx
// src/App.tsx
import { ExampleWorkflowMessage } from './workflow/ExampleWorkflowMessage';
import type { WorkflowStep, WorkflowStatus } from './workflow/types';

const steps: WorkflowStep[] = [
  {
    id: 'step_1',
    toolName: 'search_records',
    stage: 'Searching records',
    state: 'done',
    args: { query: 'example' },
    result: { id: 'record_001', score: 0.98 },
    argsPreview: '{"query":"example"}',
    resultPreview: '{"id":"record_001","score":0.98}',
    hasResult: true,
  },
  {
    id: 'step_2',
    toolName: 'fetch_history',
    stage: 'Fetching history',
    state: 'running',
    args: { recordId: 'record_001' },
    argsPreview: '{"recordId":"record_001"}',
    hasResult: false,
  },
  {
    id: 'step_3',
    toolName: 'compose_answer',
    stage: 'Composing answer',
    state: 'pending',
    args: {},
    argsPreview: '{}',
    hasResult: false,
  },
];

export function App() {
  const status: WorkflowStatus = 'streaming';

  return (
    <main className="app-shell">
      <ExampleWorkflowMessage
        messageId="message_1"
        steps={steps}
        status={status}
        isLastMessage
        hasPayload={false}
      >
        <p>Your final answer goes here after the workflow is ready.</p>
      </ExampleWorkflowMessage>
    </main>
  );
}
```

## CSS Reference

Copy this into `src/workflow/workflow.css`.

### Styling Responsibilities

The CSS is split by visual responsibility:

- `.workflow-*`: layout, step rows, summary collapse, final payload reveal.
- `.circle-ind*`: spinner, completion ring, tick, and error cross.
- `.ambient-stream*`: the quiet two-line streamed subtext.
- `.step-detail*`: the click-to-expand detail drawer.

The most important alignment rule is this:

```css
/* 14px icon + 10px row gap = 24px indent */
padding-left: 24px;
```

Use that indent for the streamed subtext, fallback metadata, and detail drawer. This keeps all secondary content visually attached to the step headline without competing with it.

### Visual Specs To Preserve

| Area | Spec |
| --- | --- |
| Step gap | `0.875rem` vertical gap between rows |
| Indicator size | `14px`, SVG `viewBox="0 0 24 24"` |
| Headline | `13px`, medium weight, sans-serif |
| Stream | `10.5px`, monospace, two-line masked viewport |
| Stream current line | `#78716c`, `0.92` opacity, subtle text shadow |
| Stream older lines | `#a8a29e`, `0.42` opacity |
| Detail drawer | `10px` radius, soft stone border, subtle vertical gradient |
| Detail body | `13rem` max height, internal scroll |
| Collapse timing | `450ms`, same easing as payload reveal |

If your target app uses a design token system, map these values into tokens first, but preserve the visual relationships: small icon lane, subdued technical detail, and no heavy container chrome.

```css
.workflow-root {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.workflow-rail {
  display: flex;
  flex-direction: column;
}

.workflow-shell {
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
}

.workflow-steps {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.workflow-step {
  display: flex;
  flex-direction: column;
}

.workflow-step__button {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.workflow-step__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.workflow-step__stage {
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #1c1917;
  letter-spacing: -0.005em;
}

.workflow-step__stage--pending {
  color: #a8a29e;
  font-weight: 400;
}

.workflow-step__stage--running {
  color: #44403c;
}

.workflow-step__meta {
  padding-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace;
  font-size: 11px;
  line-height: 1.55;
  animation: workflow-meta-reveal 320ms cubic-bezier(0.7, 0, 0.2, 1) 80ms 1 backwards;
}

.workflow-step__call,
.workflow-step__result {
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.workflow-step__tool {
  color: #57534e;
}

.workflow-step__args {
  color: #a8a29e;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workflow-step__arrow {
  color: #d6d3d1;
}

.workflow-step__resultBody {
  color: #78716c;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes workflow-meta-reveal {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.circle-ind {
  vertical-align: middle;
  flex-shrink: 0;
  color: #a8a29e;
}

.circle-ind--pending {
  color: #d6d3d1;
}

.circle-ind--running {
  color: #d97706;
}

.circle-ind--done {
  color: #059669;
}

.circle-ind--errored {
  color: #e11d48;
}

.circle-ind__spin {
  display: none;
  transform-origin: 12px 12px;
  transform-box: view-box;
}

.circle-ind--running .circle-ind__spin {
  display: block;
  animation: circle-ind-spin 900ms linear infinite;
}

@keyframes circle-ind-spin {
  to {
    transform: rotate(360deg);
  }
}

.circle-ind__arc {
  display: none;
  stroke-dasharray: 56.55;
  stroke-dashoffset: 56.55;
}

.circle-ind--done .circle-ind__arc,
.circle-ind--errored .circle-ind__arc {
  display: block;
  animation: circle-ind-arc 320ms cubic-bezier(0.7, 0, 0.2, 1) 0ms 1 forwards;
}

@keyframes circle-ind-arc {
  to {
    stroke-dashoffset: 0;
  }
}

.circle-ind__check,
.circle-ind__cross {
  display: none;
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
}

.circle-ind--done .circle-ind__check {
  display: block;
  stroke-dashoffset: 0;
  animation: circle-ind-glyph 220ms cubic-bezier(0.7, 0, 0.2, 1) 220ms 1 backwards;
}

.circle-ind--errored .circle-ind__cross {
  display: block;
  stroke-dashoffset: 0;
  animation: circle-ind-glyph 220ms cubic-bezier(0.7, 0, 0.2, 1) 220ms 1 backwards;
}

@keyframes circle-ind-glyph {
  from {
    stroke-dashoffset: 24;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.workflow-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 0 6px;
  margin-bottom: 2px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.3;
  color: #57534e;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
  animation: workflow-summary-land 420ms cubic-bezier(0.7, 0, 0.2, 1) 80ms 1 both;
}

.workflow-summary:hover {
  color: #1c1917;
  background: rgba(0, 0, 0, 0.02);
}

.workflow-summary__chevron {
  display: inline-flex;
  color: #a8a29e;
  transition: transform 320ms cubic-bezier(0.7, 0, 0.2, 1);
  flex-shrink: 0;
}

.workflow-summary__chevron--open {
  transform: rotate(90deg);
}

.workflow-summary__ok {
  color: #059669;
}

.workflow-summary__error {
  color: #e11d48;
}

.workflow-summary__text {
  flex: 1;
}

@keyframes workflow-summary-land {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.workflow-collapse {
  display: grid;
  transition: grid-template-rows 450ms cubic-bezier(0.7, 0, 0.2, 1);
}

.workflow-collapse--open {
  grid-template-rows: 1fr;
}

.workflow-collapse--closed {
  grid-template-rows: 0fr;
  pointer-events: none;
}

.workflow-collapse__inner {
  min-height: 0;
  overflow: hidden;
  transition:
    opacity 360ms cubic-bezier(0.7, 0, 0.2, 1),
    transform 450ms cubic-bezier(0.7, 0, 0.2, 1);
}

.workflow-collapse--open .workflow-collapse__inner {
  opacity: 1;
  transform: translateY(0);
}

.workflow-collapse--closed .workflow-collapse__inner {
  opacity: 0;
  transform: translateY(-6px);
}

.workflow-payload {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: workflow-payload-in 360ms cubic-bezier(0.7, 0, 0.2, 1) 1 both;
}

@keyframes workflow-payload-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ambient-stream {
  position: relative;
  padding-left: 24px;
  margin-top: 4px;
  margin-bottom: 2px;
}

.ambient-stream__viewport {
  position: relative;
  max-height: calc(1.45em * 2);
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    black 0.55em,
    black calc(100% - 0.45em),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    black 0.55em,
    black calc(100% - 0.45em),
    transparent 100%
  );
}

.ambient-stream__stack {
  font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace;
  font-size: 10.5px;
  line-height: 1.45;
  color: #a8a29e;
}

.ambient-stream__line {
  white-space: pre;
  opacity: 0.42;
}

.ambient-stream__line--current {
  color: #78716c;
  opacity: 0.92;
  text-shadow: 0 0 16px rgba(120, 113, 108, 0.12);
}

.ambient-stream__cursor {
  display: inline-block;
  margin-left: 1px;
  color: #57534e;
  animation: ambient-stream-cursor 900ms step-end infinite;
}

@keyframes ambient-stream-cursor {
  50% {
    opacity: 0.2;
  }
}

.step-detail {
  margin: 6px 0 2px 24px;
  border: 1px solid rgba(231, 229, 228, 0.9);
  border-radius: 10px;
  background: linear-gradient(
    180deg,
    rgba(250, 250, 249, 0.92),
    rgba(245, 245, 244, 0.82)
  );
  box-shadow: 0 1px 0 rgba(28, 25, 23, 0.03);
  overflow: hidden;
}

.step-detail__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px 6px;
  border-bottom: 1px solid rgba(231, 229, 228, 0.7);
}

.step-detail__title {
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: #57534e;
}

.step-detail__pill {
  border-radius: 999px;
  padding: 2px 7px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
  color: #78716c;
  background: rgba(231, 229, 228, 0.72);
}

.step-detail__pill--running {
  color: #57534e;
  background: rgba(214, 211, 209, 0.86);
}

.step-detail__pill--done {
  color: #047857;
  background: rgba(209, 250, 229, 0.82);
}

.step-detail__pill--errored {
  color: #be123c;
  background: rgba(255, 228, 230, 0.9);
}

.step-detail__body {
  max-height: 13rem;
  margin: 0;
  overflow: auto;
  padding: 9px 10px 10px;
  font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace;
  font-size: 10.5px;
  line-height: 1.55;
  color: #57534e;
  white-space: pre;
}

@media (prefers-reduced-motion: reduce) {
  .circle-ind__spin,
  .circle-ind__arc,
  .circle-ind__check,
  .circle-ind__cross,
  .workflow-step__meta,
  .workflow-summary,
  .workflow-collapse,
  .workflow-collapse__inner,
  .ambient-stream__cursor,
  .workflow-payload {
    animation: none !important;
    transition: none !important;
  }

  .circle-ind__arc,
  .circle-ind__check,
  .circle-ind__cross {
    stroke-dashoffset: 0 !important;
  }

  .workflow-collapse--open .workflow-collapse__inner,
  .workflow-collapse--closed .workflow-collapse__inner {
    transform: none;
  }

  .workflow-collapse--closed .workflow-collapse__inner {
    opacity: 0;
  }

  .ambient-stream__cursor {
    opacity: 0.45;
  }
}
```

## Mapping Real Application Data

Your app needs to produce `WorkflowStep[]`. The UI does not care whether these came from:

- Vercel AI SDK tool invocations.
- A custom SSE endpoint.
- A WebSocket stream.
- Local task orchestration.
- A test fixture.

Example mapper:

```ts
import type { WorkflowStep } from './workflow/types';

function compactJson(value: unknown, maxLen = 120) {
  if (value === undefined) return '';

  try {
    const text = JSON.stringify(value);
    return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;
  } catch {
    return '';
  }
}

export function toWorkflowStep(input: {
  id: string;
  toolName: string;
  label: string;
  state: 'pending' | 'running' | 'done' | 'errored';
  args: unknown;
  result?: unknown;
}): WorkflowStep {
  return {
    id: input.id,
    toolName: input.toolName,
    stage: input.label,
    state: input.state,
    args: input.args,
    result: input.result,
    argsPreview: compactJson(input.args, 120),
    resultPreview: compactJson(input.result, 160),
    hasResult: input.result !== undefined,
  };
}
```

## Replacing the Mock Stream Pump

The example pump is only for prototyping. In a real app, store streamed event text by `step.id` as events arrive:

```ts
type StreamTextByStepId = Record<string, string>;

function appendStepEvent(
  prev: StreamTextByStepId,
  stepId: string,
  eventLine: string,
): StreamTextByStepId {
  const existing = prev[stepId];
  return {
    ...prev,
    [stepId]: existing ? `${existing}\n${eventLine}` : eventLine,
  };
}
```

If your server sends JSON events, convert each one to a single stable line:

```ts
function formatStreamEvent(event: unknown) {
  return `data: ${JSON.stringify(event)}`;
}
```

Keep the stream sticky per step until the message is no longer visible or a new message starts. This avoids a visual jump where the row switches from streamed subtext to raw args/result meta immediately after completion.

## Accessibility Notes

- Put `aria-live="polite"` on the step shell, not on every token/line.
- Keep the row button as a real `button` for keyboard access.
- Use `aria-expanded` on the collapsed summary button.
- The circle SVG has `role="img"` and a status label.
- Respect `prefers-reduced-motion`.
- Do not rely on color alone for success/error; the tick/cross and text labels also communicate state.

## Manual Verification Checklist

1. A running step shows the spinner arc.
2. A completed step draws the ring and tick.
3. An errored step draws the ring and cross.
4. Streamed subtext appears under the active row.
5. More than two stream records scroll older records upward out of view.
6. Completed streamed rows do not immediately jump to a different subline.
7. Clicking a row opens one clean scrollable detail drawer.
8. The final content appears only after the workflow reaches `ready`.
9. Reduced-motion mode removes spinner/glyph/collapse animations while preserving layout.
10. The UI works with app-specific tool names and payloads.

## Build Check

For a React + Vite app:

```bash
npm run build
```

If you split the code into files as shown above, there are no special runtime dependencies beyond React. Add your markdown renderer or final-response components separately if your app needs them.
