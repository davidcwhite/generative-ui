import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { JsonInspector } from '../components/JsonInspector';
import {
  MandateBriefView,
  type MandateBrief,
} from '../components/MandateBriefView';
import type { VariantRenderProps } from '../types';

const SPINNER_FRAMES = [
  '⠋',
  '⠙',
  '⠹',
  '⠸',
  '⠼',
  '⠴',
  '⠦',
  '⠧',
  '⠇',
  '⠏',
] as const;

const TOOL_TITLES: Record<string, string> = {
  resolve_entity: 'resolve_entity',
  get_issuer_deals: 'get_issuer_deals',
  generate_mandate_brief: 'generate_mandate_brief',
};

type LineState = 'pending' | 'running' | 'done' | 'errored';

interface StackedLine {
  id: string;
  toolName: string;
  state: LineState;
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

function formatArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (!entries.length) return '';
  return entries
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}="${v}"`;
      if (Array.isArray(v)) return `${k}=[${v.length}]`;
      if (typeof v === 'object' && v !== null) return `${k}={…}`;
      return `${k}=${String(v)}`;
    })
    .join(' ');
}

// Headline-style summary (no leading "→") since the tool name now
// lives on a separate line underneath.
function headline(toolName: string, result: unknown): string {
  if (!result || typeof result !== 'object') return 'ok';
  const r = result as Record<string, unknown>;
  if (toolName === 'resolve_entity') {
    const matches = Array.isArray(r.matches) ? r.matches : [];
    const first = matches[0] as Record<string, unknown> | undefined;
    return first?.shortName
      ? `Resolved · ${first.shortName as string}`
      : `${matches.length} matches`;
  }
  if (toolName === 'get_issuer_deals') {
    const deals = Array.isArray(r.deals) ? r.deals : [];
    const summary = (r.summary ?? {}) as Record<string, unknown>;
    const total = summary.totalRaised as number | undefined;
    return total
      ? `${deals.length} deals · €${total.toLocaleString()}M`
      : `${deals.length} deals`;
  }
  if (toolName === 'generate_mandate_brief') {
    const brief = (r.brief ?? {}) as Record<string, unknown>;
    const sections = Array.isArray(brief.sections) ? brief.sections : [];
    return `Brief ready · ${sections.length} sections`;
  }
  return 'ok';
}

function runningLabel(toolName: string): string {
  if (toolName === 'resolve_entity') return 'querying registry…';
  if (toolName === 'get_issuer_deals') return 'streaming deals…';
  if (toolName === 'generate_mandate_brief') return 'composing brief…';
  return 'working…';
}

// V9 · Terminal Stacked — same DNA as V7 (transparent slab, braille
// spinner, clip-path typewriter) but the tool name + args have moved
// to a subtle second line, tabbed in to align with the headline. The
// headline text reads first, the meta whispers underneath.
export function V9TerminalStacked({
  message,
  status,
  isLastMessage,
}: VariantRenderProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  const lines: StackedLine[] = [];
  let mandateBrief:
    | { brief: MandateBrief; exportFormats?: string[] }
    | undefined;
  const trailingTexts: string[] = [];

  for (const part of message.parts ?? []) {
    if (part.type === 'tool-invocation') {
      const inv = part.toolInvocation;
      const args = (inv.args ?? {}) as Record<string, unknown>;
      const result = inv.state === 'result' ? inv.result : undefined;
      const state: LineState =
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

  const hasRunning = lines.some((l) => l.state === 'running');
  // Gate the main payload on the WHOLE stream being finished, not just
  // the currently-collected tool lines. In a multi-step flow every line
  // briefly reads as "done" between steps, so a per-line gate would
  // flicker the payload in and out. Historical messages are always
  // settled; the live message waits for `status === 'ready'`.
  const allStepsSettled = isLastMessage ? status === 'ready' : true;

  useEffect(() => {
    if (!hasRunning) return;
    const id = window.setInterval(() => {
      setSpinnerFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => window.clearInterval(id);
  }, [hasRunning]);

  return (
    <div className="flex flex-col gap-4">
      {lines.length > 0 && (
        <div className="term-shell" aria-live="polite" role="log">
          <div className="flex flex-col gap-3">
            {lines.map((line) => {
              const open = Boolean(openIds[line.id]);
              const argsStr = formatArgs(line.args);
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
                    className="term-stacked-line text-left"
                  >
                    {/* Headline: glyph + primary status text. */}
                    <div className="term-stacked-head">
                      {line.state === 'running' && (
                        <span className="term-glyph term-glyph--spin">
                          {SPINNER_FRAMES[spinnerFrame]}
                        </span>
                      )}
                      {line.state === 'done' && (
                        <span className="term-glyph term-glyph--done">✓</span>
                      )}
                      {line.state === 'errored' && (
                        <span className="term-glyph term-glyph--err">✗</span>
                      )}
                      {line.state === 'pending' && (
                        <span className="term-glyph term-glyph--idle">○</span>
                      )}

                      {line.state === 'running' && (
                        <span className="term-stacked-result term-stacked-result--running">
                          {runningLabel(line.toolName)}
                          <span className="term-caret" aria-hidden="true" />
                        </span>
                      )}
                      {line.state === 'done' && (
                        <span
                          key={`${line.id}:done`}
                          className="term-stacked-result term-stacked-result--done"
                        >
                          {headline(line.toolName, line.result)}
                        </span>
                      )}
                      {line.state === 'errored' && (
                        <span
                          key={`${line.id}:err`}
                          className="term-stacked-result term-stacked-result--err"
                        >
                          {(line.result as { error?: string } | undefined)
                            ?.error ?? 'error'}
                        </span>
                      )}
                      {line.state === 'pending' && (
                        <span className="term-stacked-result term-stacked-result--idle">
                          queued
                        </span>
                      )}
                    </div>

                    {/* Meta: only revealed once the headline has settled
                        (done or errored). Slides in beneath with a clipped
                        ease so it never competes with the live headline. */}
                    {(line.state === 'done' || line.state === 'errored') && (
                      <div
                        key={`${line.id}:meta:${line.state}`}
                        className="term-stacked-meta"
                      >
                        <span className="term-stacked-tool">
                          {TOOL_TITLES[line.toolName] ?? line.toolName}
                        </span>
                        {argsStr && (
                          <>
                            <span
                              className="term-stacked-sep"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            <span className="term-stacked-args">
                              {argsStr}
                            </span>
                          </>
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
                          <JsonInspector label="result" value={line.result} />
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main payload — markdown text + the rendered brief — is gated
          behind "all processing steps complete" so the reader is never
          shown the result before the work that produced it. */}
      {allStepsSettled && (trailingTexts.length > 0 || mandateBrief?.brief) && (
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
