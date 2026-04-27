import { useEffect, useState, type ReactNode } from 'react';
import { CircleIndicator, type CircleState } from './CircleIndicator';

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

interface ProcessingWorkflowProps {
  steps: ProcessingWorkflowStep[];
  status: WorkflowStatus;
  isLastMessage: boolean;
  messageId: string;
  hasPayload: boolean;
  children: ReactNode;
  renderInspector?: (step: ProcessingWorkflowStep) => ReactNode;
  /** Extra row content under the stage headline, before the JSON-ish meta. */
  renderRowExtra?: (context: {
    step: ProcessingWorkflowStep;
    index: number;
  }) => ReactNode;
  /** Optionally suppress the settled args/result meta for a row. */
  hideStepMeta?: (context: {
    step: ProcessingWorkflowStep;
    index: number;
  }) => boolean;
  /**
   * When true, the step list stays expanded and the one-line summary is
   * hidden even if the stream has ended—used e.g. while a per-step
   * simulation is still running.
   */
  orchestrating?: boolean;
  /**
   * When false, the final response `children` stay hidden. Defaults to
   * true. Flip to true after client-side gating (e.g. step simulation).
   */
  contentReady?: boolean;
  collapseDurationMs?: number;
  postCollapseDelayMs?: number;
}

const DEFAULT_COLLAPSE_DUR_MS = 450;
const DEFAULT_POST_COLLAPSE_MS = 120;

function summaryFor(steps: ProcessingWorkflowStep[]): string {
  const errCount = steps.filter((step) => step.state === 'errored').length;
  const n = steps.length;

  if (errCount > 0) {
    return n === 1 ? '1 step' : `${n} steps · ${errCount} failed`;
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
    const t = window.setTimeout(() => {
      setPayloadRevealed(true);
    }, collapseDurationMs + postCollapseDelayMs);
    return () => clearTimeout(t);
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
  const errCount = steps.filter((step) => step.state === 'errored').length;

  return (
    <div className="v12-root flex flex-col gap-3.5">
      {steps.length > 0 && (
        <div className="term-v11 flex flex-col">
          {canCollapse && (
            <button
              type="button"
              className="term-v11-summary"
              onClick={() => setStepsExpanded((v) => !v)}
              aria-expanded={showFullSteps}
              title={showFullSteps ? 'Hide steps' : 'Show steps'}
            >
              <span
                className={`term-v11-chevron ${showFullSteps ? 'term-v11-chevron--open' : ''}`}
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
              {errCount === 0 ? (
                <span className="text-emerald-600" aria-hidden>
                  ✓
                </span>
              ) : (
                <span className="text-rose-600" aria-hidden>
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
                <div className="flex flex-col gap-3.5">
                  {steps.map((step, index) => {
                    const open = Boolean(openIds[step.id]);
                    const settled =
                      step.state === 'done' || step.state === 'errored';
                    const hideMeta = Boolean(hideStepMeta?.({ step, index }));

                    return (
                      <div key={step.id} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenIds((prev) => ({
                              ...prev,
                              [step.id]: !prev[step.id],
                            }))
                          }
                          className="term-v10-line text-left"
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

                          {renderRowExtra?.({ step, index })}

                          {settled && !hideMeta && (
                            <div
                              key={`${step.id}:meta:${step.state}`}
                              className="term-v10-meta"
                            >
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
        <div
          key={`v12-payload-${messageId}`}
          className="v12-payload--in flex flex-col gap-4"
        >
          {children}
        </div>
      )}
    </div>
  );
}
