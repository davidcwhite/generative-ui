# V12 Porting Guide

This guide explains how to re-implement the V12 workflow UX in another React + Vite codebase.

V12 is the “response bloop” version of the processing rail:

- A compact vertical list of processing steps.
- A circular indicator for pending, running, done, and errored states.
- A running spinner while a step is active.
- A drawn completion ring and tick when a step finishes.
- A compact JSON-ish subline under completed steps.
- Click-to-expand raw step details.
- A completed-step summary that collapses the full rail.
- A final response that waits until the rail has collapsed, then fades/lifts into place.

The implementation is split into two layers:

- **Adapter**: translate your app/model/tool events into a normalized `ProcessingWorkflowStep[]`.
- **Portable UI core**: render the workflow rail, status indicators, collapse/expand behavior, and delayed final-response reveal.

## UX Intent

V12 should feel like a quiet assistant message, not a dashboard widget. The user gets enough transparency to trust that work happened, but the raw tool details are secondary.

Core rules:

- The **stage headline** is primary: “Searching records”, “Reading files”, “Composing answer”.
- Tool names and previews are secondary, shown in a dim monospace subline.
- Raw args/results are hidden behind a click target.
- When work finishes, the full step rail collapses into a one-line summary.
- The final answer appears after a tiny pause so the transition feels intentional.

## Visual Anatomy

```txt
Assistant message
└─ V12 workflow rail
   ├─ Step row
   │  ├─ 14px circular status indicator
   │  ├─ Stage headline
   │  └─ Completed subline
   │     ├─ toolName(argsPreview)
   │     └─ ← resultPreview
   ├─ Step row
   ├─ Step row
   └─ Final response, mounted after collapse + pause
```

After the response is ready:

```txt
Collapsed summary
├─ chevron
├─ ✓ or ×
└─ "3 steps" / "3 steps · 1 failed"

Final answer
└─ fades in + lifts 6px into place
```

When a row is clicked:

```txt
Step row
└─ Inspector
   ├─ args disclosure
   └─ result disclosure
```

## Visual Specs

| Area | Spec |
| --- | --- |
| Step gap | `0.875rem` / `14px` |
| Indicator size | `14px`, SVG `viewBox="0 0 24 24"` |
| Indicator/headline gap | `10px` |
| Secondary content indent | `24px` (`14px indicator + 10px gap`) |
| Headline font | Sans-serif, `13px`, `500`, near-black |
| Pending headline | Stone gray, regular weight |
| Running headline | Dark warm gray |
| Subline font | Monospace, `11px`, `1.55` line-height |
| Summary row font | Sans-serif, `12px`, muted |
| Collapse timing | `450ms cubic-bezier(0.7, 0, 0.2, 1)` |
| Post-collapse pause | `120ms` |
| Final answer reveal | `360ms`, opacity + `translateY(6px)` |

Recommended palette:

```css
--stone-950: #1c1917;
--stone-700: #44403c;
--stone-600: #57534e;
--stone-500: #78716c;
--stone-400: #a8a29e;
--stone-300: #d6d3d1;
--stone-200: #e7e5e4;
--stone-100: #f5f5f4;

--amber-600: #d97706;
--emerald-600: #059669;
--rose-600: #e11d48;

--workflow-ease: cubic-bezier(0.7, 0, 0.2, 1);
```

## File Layout

A clean port can use:

```txt
src/
  workflow/
    types.ts
    CircleIndicator.tsx
    JsonInspector.tsx
    ProcessingWorkflow.tsx
    WorkflowMessage.tsx
    workflow.css
```

Import the CSS once:

```tsx
// src/main.tsx
import './workflow/workflow.css';
```

## Data Contracts

```ts
// src/workflow/types.ts
import type { ReactNode } from 'react';

export type CircleState = 'pending' | 'running' | 'done' | 'errored';

export type WorkflowStatus = 'submitted' | 'streaming' | 'ready' | 'error';

export interface ProcessingWorkflowStep {
  id: string;
  toolName: string;
  stage: string;
  state: CircleState;
  argsPreview: string;
  resultPreview?: string;
  hasResult: boolean;
  args: unknown;
  result?: unknown;
}

export interface WorkflowMessageProps {
  messageId: string;
  steps: ProcessingWorkflowStep[];
  status: WorkflowStatus;
  isLastMessage: boolean;
  hasPayload: boolean;
  children: ReactNode;
}
```

State semantics:

- `pending`: step is known but has not started.
- `running`: step is actively processing.
- `done`: step completed successfully.
- `errored`: step failed.
- `submitted` / `streaming`: the assistant response is in progress.
- `ready`: all response content is available.
- `error`: the response stream failed.

## Circle Indicator

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

Behavior:

- Pending: faint background ring only.
- Running: partial arc spins continuously.
- Done: full ring draws, then the check draws.
- Errored: full ring draws, then the cross draws.

## Json Inspector

V12 uses a small disclosure for raw args/results. Keep it compact and visually subordinate.

```tsx
// src/workflow/JsonInspector.tsx
import { useState } from 'react';

interface JsonInspectorProps {
  label?: string;
  value: unknown;
  defaultOpen?: boolean;
}

export function JsonInspector({
  label = 'Raw JSON',
  value,
  defaultOpen = false,
}: JsonInspectorProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="json-inspector__button"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 20 20"
          fill="none"
          className={`json-inspector__chevron ${
            open ? 'json-inspector__chevron--open' : ''
          }`}
          aria-hidden="true"
        >
          <path
            d="M7 5l6 5-6 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </button>

      {open && (
        <pre className="json-inspector__body">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

## Processing Workflow

This component owns the UI state: row expansion, completed summary, collapse animation, and delayed final response reveal.

```tsx
// src/workflow/ProcessingWorkflow.tsx
import { useEffect, useState, type ReactNode } from 'react';
import { CircleIndicator } from './CircleIndicator';
import type { ProcessingWorkflowStep, WorkflowStatus } from './types';

interface ProcessingWorkflowProps {
  steps: ProcessingWorkflowStep[];
  status: WorkflowStatus;
  isLastMessage: boolean;
  messageId: string;
  hasPayload: boolean;
  children: ReactNode;
  renderInspector?: (step: ProcessingWorkflowStep) => ReactNode;
  collapseDurationMs?: number;
  postCollapseDelayMs?: number;
}

const DEFAULT_COLLAPSE_DUR_MS = 450;
const DEFAULT_POST_COLLAPSE_MS = 120;

function summaryFor(steps: ProcessingWorkflowStep[]): string {
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
  collapseDurationMs = DEFAULT_COLLAPSE_DUR_MS,
  postCollapseDelayMs = DEFAULT_POST_COLLAPSE_MS,
}: ProcessingWorkflowProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [payloadRevealed, setPayloadRevealed] = useState(!isLastMessage);

  const canCollapse =
    steps.length > 0 &&
    (isLastMessage ? status === 'ready' || status === 'error' : true);

  const showFullSteps = !canCollapse || stepsExpanded;
  const allStepsSettled = isLastMessage ? status === 'ready' : true;

  const showResponseBlock =
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

    if (status !== 'ready' || !hasPayload) {
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
    <div className="v12-root">
      {steps.length > 0 && (
        <div className="term-v11">
          {canCollapse && (
            <button
              type="button"
              className="term-v11-summary"
              onClick={() => setStepsExpanded((value) => !value)}
              aria-expanded={showFullSteps}
              title={showFullSteps ? 'Hide steps' : 'Show steps'}
            >
              <span
                className={`term-v11-chevron ${
                  showFullSteps ? 'term-v11-chevron--open' : ''
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
                <span className="term-v11-ok" aria-hidden>
                  ✓
                </span>
              ) : (
                <span className="term-v11-error" aria-hidden>
                  ×
                </span>
              )}

              <span className="term-v11-summary-text">{summaryLabel}</span>
            </button>
          )}

          <div
            className={`term-v11-g ${
              showFullSteps ? 'term-v11-g--open' : 'term-v11-g--closed'
            }`}
          >
            <div className="term-v11-g__inner">
              <div className="term-shell" aria-live="polite" role="log">
                <div className="term-v10-steps">
                  {steps.map((step) => {
                    const open = Boolean(openIds[step.id]);
                    const settled =
                      step.state === 'done' || step.state === 'errored';

                    return (
                      <div key={step.id} className="term-v10-step">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenIds((prev) => ({
                              ...prev,
                              [step.id]: !prev[step.id],
                            }))
                          }
                          className="term-v10-line"
                        >
                          <div className="term-v10-head">
                            <CircleIndicator
                              key={`${step.id}:${step.state}`}
                              state={step.state}
                              size={14}
                            />
                            <span
                              className={`term-v10-stage term-v10-stage--${step.state}`}
                            >
                              {step.stage}
                            </span>
                          </div>

                          {settled && (
                            <div className="term-v10-meta">
                              <div className="term-v10-call">
                                <span className="term-v10-tool">
                                  {step.toolName}
                                </span>
                                <span className="term-v10-args">
                                  ({step.argsPreview})
                                </span>
                              </div>

                              {step.hasResult && (
                                <div className="term-v10-result">
                                  <span
                                    className="term-v10-arrow"
                                    aria-hidden="true"
                                  >
                                    ←
                                  </span>
                                  <span className="term-v10-result-body">
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
        <div key={`v12-payload-${messageId}`} className="v12-payload--in">
          {children}
        </div>
      )}
    </div>
  );
}
```

## Generic Adapter

The adapter is deliberately thin: normalize your app-specific events into `ProcessingWorkflowStep[]`, then pass final content as `children`.

```tsx
// src/workflow/WorkflowMessage.tsx
import { ProcessingWorkflow } from './ProcessingWorkflow';
import { JsonInspector } from './JsonInspector';
import type { ProcessingWorkflowStep, WorkflowMessageProps } from './types';

const COLLAPSE_DUR_MS = 450;
const POST_COLLAPSE_MS = 120;

function renderStepInspector(step: ProcessingWorkflowStep) {
  return (
    <div className="v12-inspector">
      <JsonInspector label="args" value={step.args} defaultOpen />
      {step.state !== 'pending' && step.state !== 'running' && (
        <JsonInspector label="result" value={step.result} defaultOpen />
      )}
    </div>
  );
}

export function WorkflowMessage({
  messageId,
  steps,
  status,
  isLastMessage,
  hasPayload,
  children,
}: WorkflowMessageProps) {
  return (
    <ProcessingWorkflow
      steps={steps}
      status={status}
      isLastMessage={isLastMessage}
      messageId={messageId}
      hasPayload={hasPayload}
      renderInspector={renderStepInspector}
      collapseDurationMs={COLLAPSE_DUR_MS}
      postCollapseDelayMs={POST_COLLAPSE_MS}
    >
      {children}
    </ProcessingWorkflow>
  );
}
```

## Mapping App Events Into Steps

```ts
import type { ProcessingWorkflowStep } from './types';

function compactJson(value: unknown, maxLen = 140) {
  if (value === undefined) return '';

  try {
    const text = JSON.stringify(value);
    return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;
  } catch {
    return '';
  }
}

function isErrored(result: unknown) {
  return (
    typeof result === 'object' &&
    result !== null &&
    'error' in (result as Record<string, unknown>)
  );
}

export function toWorkflowStep(input: {
  id: string;
  toolName: string;
  stage: string;
  args: unknown;
  result?: unknown;
  running: boolean;
}): ProcessingWorkflowStep {
  const state: ProcessingWorkflowStep['state'] = input.running
    ? 'running'
    : input.result === undefined
      ? 'pending'
      : isErrored(input.result)
        ? 'errored'
        : 'done';

  return {
    id: input.id,
    toolName: input.toolName,
    stage: input.stage,
    state,
    args: input.args,
    result: input.result,
    argsPreview: compactJson(input.args, 120),
    resultPreview: compactJson(input.result, 160),
    hasResult: input.result !== undefined,
  };
}
```

## Example Usage

```tsx
import { WorkflowMessage } from './workflow/WorkflowMessage';
import type { ProcessingWorkflowStep, WorkflowStatus } from './workflow/types';

const steps: ProcessingWorkflowStep[] = [
  {
    id: 'step_1',
    toolName: 'search_records',
    stage: 'Searching records',
    state: 'done',
    args: { query: 'example' },
    result: { count: 3 },
    argsPreview: '{"query":"example"}',
    resultPreview: '{"count":3}',
    hasResult: true,
  },
  {
    id: 'step_2',
    toolName: 'read_record',
    stage: 'Reading selected record',
    state: 'running',
    args: { id: 'record_001' },
    argsPreview: '{"id":"record_001"}',
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

export function Example() {
  const status: WorkflowStatus = 'streaming';

  return (
    <WorkflowMessage
      messageId="message_1"
      steps={steps}
      status={status}
      isLastMessage
      hasPayload={false}
    >
      <p>The final response appears here once status becomes ready.</p>
    </WorkflowMessage>
  );
}
```

## CSS Reference

Copy this into `src/workflow/workflow.css`.

```css
.v12-root {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.term-v11,
.term-v10-step {
  display: flex;
  flex-direction: column;
}

.term-shell {
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
}

.term-v10-steps {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
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
  animation: circle-ind-arc 320ms cubic-bezier(0.7, 0, 0.2, 1) forwards;
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
  animation: circle-ind-glyph 220ms cubic-bezier(0.7, 0, 0.2, 1) 220ms backwards;
}

.circle-ind--errored .circle-ind__cross {
  display: block;
  stroke-dashoffset: 0;
  animation: circle-ind-glyph 220ms cubic-bezier(0.7, 0, 0.2, 1) 220ms backwards;
}

@keyframes circle-ind-glyph {
  from {
    stroke-dashoffset: 24;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.term-v10-line {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.term-v10-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.term-v10-stage {
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #1c1917;
  letter-spacing: -0.005em;
}

.term-v10-stage--pending {
  color: #a8a29e;
  font-weight: 400;
}

.term-v10-stage--running {
  color: #44403c;
}

.term-v10-meta {
  padding-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace;
  font-size: 11px;
  line-height: 1.55;
  animation: term-meta-reveal 320ms cubic-bezier(0.7, 0, 0.2, 1) 80ms backwards;
}

@keyframes term-meta-reveal {
  from {
    opacity: 0;
    transform: translateY(-3px);
    clip-path: inset(0 0 100% 0);
  }
  to {
    opacity: 0.85;
    transform: translateY(0);
    clip-path: inset(0 0 0 0);
  }
}

.term-v10-call,
.term-v10-result {
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.term-v10-tool {
  color: #57534e;
}

.term-v10-args {
  color: #a8a29e;
  overflow: hidden;
  text-overflow: ellipsis;
}

.term-v10-arrow {
  color: #d6d3d1;
}

.term-v10-result-body {
  color: #78716c;
  overflow: hidden;
  text-overflow: ellipsis;
}

.term-v11-summary {
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
  animation: term-v11-summary-land 420ms cubic-bezier(0.7, 0, 0.2, 1) 80ms both;
}

.term-v11-summary:hover {
  color: #1c1917;
  background: rgba(0, 0, 0, 0.02);
}

.term-v11-chevron {
  display: inline-flex;
  color: #a8a29e;
  transition: transform 320ms cubic-bezier(0.7, 0, 0.2, 1);
  flex-shrink: 0;
}

.term-v11-chevron--open {
  transform: rotate(90deg);
}

.term-v11-ok {
  color: #059669;
}

.term-v11-error {
  color: #e11d48;
}

.term-v11-summary-text {
  flex: 1;
}

@keyframes term-v11-summary-land {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.term-v11-g {
  display: grid;
  transition: grid-template-rows 450ms cubic-bezier(0.7, 0, 0.2, 1);
}

.term-v11-g--open {
  grid-template-rows: 1fr;
}

.term-v11-g--closed {
  grid-template-rows: 0fr;
  pointer-events: none;
}

.term-v11-g__inner {
  min-height: 0;
  overflow: hidden;
  transition:
    opacity 360ms cubic-bezier(0.7, 0, 0.2, 1),
    transform 450ms cubic-bezier(0.7, 0, 0.2, 1);
}

.term-v11-g--open .term-v11-g__inner {
  opacity: 1;
  transform: translateY(0);
}

.term-v11-g--closed .term-v11-g__inner {
  opacity: 0;
  transform: translateY(-6px);
}

.v12-payload--in {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: v12-payload-in 360ms cubic-bezier(0.7, 0, 0.2, 1) both;
}

@keyframes v12-payload-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.v12-inspector {
  margin: 4px 0 4px 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 11px;
  color: #57534e;
}

.json-inspector__button {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 0;
  padding: 0;
  background: transparent;
  color: #78716c;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.json-inspector__button:hover {
  color: #44403c;
}

.json-inspector__chevron {
  transition: transform 180ms ease;
}

.json-inspector__chevron--open {
  transform: rotate(90deg);
}

.json-inspector__body {
  margin: 4px 0 0;
  max-height: 16rem;
  overflow: auto;
  border: 1px solid #e7e5e4;
  border-radius: 6px;
  background: rgba(28, 25, 23, 0.96);
  padding: 8px;
  font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace;
  font-size: 10px;
  line-height: 1.55;
  color: #fafaf9;
}

@media (prefers-reduced-motion: reduce) {
  .circle-ind__spin,
  .circle-ind__arc,
  .circle-ind__check,
  .circle-ind__cross,
  .term-v10-meta,
  .term-v11-summary,
  .v12-payload--in {
    animation: none !important;
  }

  .term-v11-g,
  .term-v11-g__inner,
  .term-v11-chevron,
  .json-inspector__chevron {
    transition: none !important;
  }

  .circle-ind__arc,
  .circle-ind__check,
  .circle-ind__cross {
    stroke-dashoffset: 0 !important;
  }

  .term-v11-g--open .term-v11-g__inner,
  .term-v11-g--closed .term-v11-g__inner {
    transform: none;
  }

  .term-v11-g--closed .term-v11-g__inner {
    opacity: 0;
  }
}
```

## Timing Contract

The handoff from “processing” to “answer” is the heart of V12:

1. `status` becomes `ready`.
2. `ProcessingWorkflow` sets `stepsExpanded` to `false`.
3. `.term-v11-g` collapses for `450ms`.
4. The UI waits another `120ms`.
5. `.v12-payload--in` mounts and animates for `360ms`.

Keep `collapseDurationMs` synchronized with `.term-v11-g`:

```tsx
<ProcessingWorkflow
  collapseDurationMs={450}
  postCollapseDelayMs={120}
  // ...
/>
```

## Accessibility Checklist

- Use real `button` elements for row toggles and summary toggles.
- Put `aria-live="polite"` and `role="log"` on the workflow shell.
- Use `aria-expanded` on the collapsed summary control.
- The circle indicator includes `role="img"` and an `aria-label`.
- Do not rely only on color for success/error; the tick/cross communicates state too.
- Respect `prefers-reduced-motion`.

## Verification Checklist

1. Pending steps show a faint ring and muted headline.
2. Running steps show the amber spinner arc.
3. Completed steps draw the ring and tick.
4. Errored steps draw the ring and cross.
5. Completed rows show `toolName(argsPreview)` and `← resultPreview`.
6. Clicking a row reveals args/result JSON.
7. When `status` becomes `ready`, the step rail collapses into summary.
8. The final answer appears only after collapse + pause.
9. Historical messages show their payload immediately.
10. Reduced-motion mode removes animation without hiding state.
