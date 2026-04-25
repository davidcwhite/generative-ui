import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CircleIndicator, type CircleState } from '../components/CircleIndicator';
import { JsonInspector } from '../components/JsonInspector';
import {
  MandateBriefView,
  type MandateBrief,
} from '../components/MandateBriefView';
import type { VariantRenderProps } from '../types';

/** Kept in sync with `.term-v11-g` transition in `index.css` */
const COLLAPSE_DUR_MS = 450;
/** Tiny breath after the grid has closed, before the answer bloops in */
const POST_COLLAPSE_MS = 120;

const WORKFLOW_STAGE: Record<string, string> = {
  resolve_entity: 'Resolving issuer entity',
  get_issuer_deals: 'Pulling recent issuance',
  generate_mandate_brief: 'Composing mandate brief',
};

interface WorkflowLine {
  id: string;
  toolName: string;
  state: CircleState;
  args: Record<string, unknown>;
  result?: unknown;
}

function isErrored(result: unknown): boolean {
  return (
    typeof result === 'object' &&
    result !== null &&
    'error' in (result as Record<string, unknown>)
  );
}

function compactJson(value: unknown, maxLen = 140): string {
  if (value === undefined) return '';
  let str: string;
  try {
    str = JSON.stringify(value);
  } catch {
    return '';
  }
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// V12 (fork of V11). Same workflow + step collapse; the answer mounts
// only after the grid has finished + a short pause (see constants).
// Message entrance is intentionally light (see `.v12-payload--in` in CSS).
export function V12ResponseBloop({
  message,
  status,
  isLastMessage,
}: VariantRenderProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [stepsExpanded, setStepsExpanded] = useState(false);
  // Last message: stay hidden until after collapse+pause. Historical:
  // show immediately.
  const [payloadRevealed, setPayloadRevealed] = useState(
    !isLastMessage,
  );

  const lines: WorkflowLine[] = [];
  let mandateBrief:
    | { brief: MandateBrief; exportFormats?: string[] }
    | undefined;
  const trailingTexts: string[] = [];

  for (const part of message.parts ?? []) {
    if (part.type === 'tool-invocation') {
      const inv = part.toolInvocation;
      const args = (inv.args ?? {}) as Record<string, unknown>;
      const result = inv.state === 'result' ? inv.result : undefined;
      const state: CircleState =
        inv.state === 'result'
          ? isErrored(result)
            ? 'errored'
            : 'done'
          : 'running';
      lines.push({
        id: inv.toolCallId,
        toolName: inv.toolName,
        state,
        args,
        result,
      });
      if (
        inv.toolName === 'generate_mandate_brief' &&
        inv.state === 'result' &&
        !isErrored(result)
      ) {
        mandateBrief = result as {
          brief: MandateBrief;
          exportFormats?: string[];
        };
      }
    } else if (part.type === 'text' && part.text.trim()) {
      trailingTexts.push(part.text);
    }
  }

  const canCollapse =
    lines.length > 0 &&
    (isLastMessage ? status === 'ready' || status === 'error' : true);
  const showFullSteps = !canCollapse || stepsExpanded;

  const hasPayload =
    trailingTexts.length > 0 || Boolean(mandateBrief?.brief);
  const allStepsSettled = isLastMessage ? status === 'ready' : true;

  const showResponseBlock =
    allStepsSettled &&
    hasPayload &&
    (!isLastMessage || payloadRevealed);

  useEffect(() => {
    if (isLastMessage && (status === 'ready' || status === 'error')) {
      setStepsExpanded(false);
    }
  }, [isLastMessage, status, message.id]);

  useEffect(() => {
    if (!isLastMessage) {
      setPayloadRevealed(true);
      return;
    }
    if (status !== 'ready' || !hasPayload) {
      setPayloadRevealed(false);
      return;
    }
    if (lines.length === 0) {
      const id = requestAnimationFrame(() => {
        setPayloadRevealed(true);
      });
      return () => cancelAnimationFrame(id);
    }
    setPayloadRevealed(false);
    const t = window.setTimeout(() => {
      setPayloadRevealed(true);
    }, COLLAPSE_DUR_MS + POST_COLLAPSE_MS);
    return () => clearTimeout(t);
  }, [isLastMessage, status, hasPayload, message.id, lines.length]);

  const errCount = lines.filter((l) => l.state === 'errored').length;
  const n = lines.length;
  const summaryLabel =
    errCount > 0
      ? n === 1
        ? '1 step'
        : `${n} steps · ${errCount} failed`
      : n === 1
        ? '1 step'
        : `${n} steps`;

  return (
    <div className="v12-root flex flex-col gap-3.5">
      {lines.length > 0 && (
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
              <div
                className="term-shell"
                aria-live="polite"
                role="log"
              >
                <div className="flex flex-col gap-3.5">
                  {lines.map((line) => {
                    const open = Boolean(openIds[line.id]);
                    const stage =
                      WORKFLOW_STAGE[line.toolName] ?? line.toolName;
                    const settled =
                      line.state === 'done' || line.state === 'errored';
                    return (
                      <div key={line.id} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenIds((prev) => ({
                              ...prev,
                              [line.id]: !prev[line.id],
                            }))
                          }
                          className="term-v10-line text-left"
                        >
                          <div className="term-v10-head">
                            <CircleIndicator
                              key={`${line.id}:${line.state}`}
                              state={line.state}
                              size={14}
                            />
                            <span
                              className={`term-v10-stage term-v10-stage--${line.state}`}
                            >
                              {stage}
                            </span>
                          </div>

                          {settled && (
                            <div
                              key={`${line.id}:meta:${line.state}`}
                              className="term-v10-meta"
                            >
                              <div className="term-v10-call">
                                <span className="term-v10-tool">
                                  {line.toolName}
                                </span>
                                <span className="term-v10-args">
                                  ({compactJson(line.args, 120)})
                                </span>
                              </div>
                              {line.result !== undefined && (
                                <div className="term-v10-result">
                                  <span
                                    className="term-v10-arrow"
                                    aria-hidden="true"
                                  >
                                    ←
                                  </span>
                                  <span className="term-v10-result-body">
                                    {compactJson(line.result, 160)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </button>

                        {open && (
                          <div className="ml-6 mt-1 mb-1 flex flex-col gap-1.5 font-sans text-[11px] text-stone-600">
                            <JsonInspector
                              label="args"
                              value={line.args}
                              defaultOpen
                            />
                            {line.state !== 'pending' &&
                              line.state !== 'running' && (
                                <JsonInspector
                                  label="result"
                                  value={line.result}
                                  defaultOpen
                                />
                              )}
                          </div>
                        )}
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
          key={`v12-payload-${message.id}`}
          className="v12-payload--in flex flex-col gap-4"
        >
          {trailingTexts.length > 0 && (
            <div className="markdown-content">
              <ReactMarkdown>{trailingTexts.join('')}</ReactMarkdown>
            </div>
          )}

          {mandateBrief?.brief && (
            <MandateBriefView
              brief={mandateBrief.brief}
              exportFormats={mandateBrief.exportFormats}
            />
          )}
        </div>
      )}
    </div>
  );
}
