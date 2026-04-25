import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CircleIndicator, type CircleState } from '../components/CircleIndicator';
import { JsonInspector } from '../components/JsonInspector';
import {
  MandateBriefView,
  type MandateBrief,
} from '../components/MandateBriefView';
import type { VariantRenderProps } from '../types';

// Headline now reads as the abstract workflow stage only. Same string
// during running and after completion — only the leading indicator
// glyph swaps.
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

// Truncated JSON.stringify so the sub line reads like raw agent output
// without overflowing. Tries to be honest about the JSON shape rather
// than re-formatting it into pretty prose.
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

// V10 · Terminal Workflow — same flat-on-page slab as V9, but:
//  • headline is just the workflow stage (no result text mixed in),
//  • the tool call + result move into the sub line as a compact
//    JSON-ish blob (closer to what an agent really emits),
//  • the completion glyph is a CircleIndicator that draws an emerald
//    ring around in ~320ms then pops a check inside.
export function V10TerminalWorkflow({
  message,
  status,
  isLastMessage,
}: VariantRenderProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

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

  const allStepsSettled = isLastMessage ? status === 'ready' : true;

  return (
    <div className="flex flex-col gap-4">
      {lines.length > 0 && (
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
                    {/* Workflow stage — the only thing on the headline. */}
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

                    {/* Sub: raw call + result, JSON-flavoured. Only
                        revealed once this line has settled, regardless
                        of the global gate, so the sub feels tied to
                        the line above it. */}
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
      )}

      {allStepsSettled &&
        (trailingTexts.length > 0 || mandateBrief?.brief) && (
          <div
            key={`payload:${lines.length}`}
            className="term-stacked-payload flex flex-col gap-4"
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
