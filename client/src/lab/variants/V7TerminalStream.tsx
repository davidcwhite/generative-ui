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

interface TerminalLine {
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

// Compact CLI-flavoured args, e.g. `query="BMW" type="issuer"`.
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

function summarize(toolName: string, result: unknown): string {
  if (!result || typeof result !== 'object') return 'ok';
  const r = result as Record<string, unknown>;
  if (toolName === 'resolve_entity') {
    const matches = Array.isArray(r.matches) ? r.matches : [];
    const first = matches[0] as Record<string, unknown> | undefined;
    return first?.shortName
      ? `→ ${matches.length} match · ${first.shortName as string}`
      : `→ ${matches.length} matches`;
  }
  if (toolName === 'get_issuer_deals') {
    const deals = Array.isArray(r.deals) ? r.deals : [];
    const summary = (r.summary ?? {}) as Record<string, unknown>;
    const total = summary.totalRaised as number | undefined;
    return total
      ? `→ ${deals.length} deals · €${total.toLocaleString()}M`
      : `→ ${deals.length} deals`;
  }
  if (toolName === 'generate_mandate_brief') {
    const brief = (r.brief ?? {}) as Record<string, unknown>;
    const sections = Array.isArray(brief.sections) ? brief.sections : [];
    return `→ brief.md · ${sections.length} sections`;
  }
  return '→ ok';
}

function runningLabel(toolName: string): string {
  if (toolName === 'resolve_entity') return 'querying registry…';
  if (toolName === 'get_issuer_deals') return 'streaming deals…';
  if (toolName === 'generate_mandate_brief') return 'composing brief…';
  return 'working…';
}

// V7 · Terminal Stream — dark monospaced slab, braille spinner cycled
// in JS at 80ms (paused when nothing is running so we don't spin
// forever), result text reveals via clip-path with `steps()` for a
// chunky typed feel that ends on a hard frame.
export function V7TerminalStream({ message }: VariantRenderProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  const lines: TerminalLine[] = [];
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
        <div
          className="term-shell"
          aria-live="polite"
          role="log"
        >
          {lines.map((line) => {
            const open = Boolean(openIds[line.id]);
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
                  className="term-line text-left"
                >
                  {/* Glyph: spinner / ✓ / ✗ / ○. Hard-snaps because
                      it's a React re-render, not a CSS transition. */}
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

                  <span
                    className={`term-tool ${
                      line.state === 'running' ? 'term-tool--active' : ''
                    }`}
                  >
                    {TOOL_TITLES[line.toolName] ?? line.toolName}
                  </span>

                  <span className="term-args">{formatArgs(line.args)}</span>

                  {line.state === 'running' && (
                    <span className="term-result">
                      {runningLabel(line.toolName)}
                      <span className="term-caret" aria-hidden="true" />
                    </span>
                  )}
                  {line.state === 'done' && (
                    <span
                      key={`${line.id}:done`}
                      className="term-result term-result--done"
                    >
                      {summarize(line.toolName, line.result)}
                    </span>
                  )}
                  {line.state === 'errored' && (
                    <span
                      key={`${line.id}:err`}
                      className="term-result term-result--err"
                    >
                      ←{' '}
                      {(line.result as { error?: string } | undefined)
                        ?.error ?? 'error'}
                    </span>
                  )}
                </button>

                {open && (
                  <div className="ml-6 mt-1 mb-2 flex flex-col gap-1.5 font-sans text-[11px] text-stone-600">
                    <JsonInspector
                      label="args"
                      value={line.args}
                      defaultOpen
                    />
                    {line.state !== 'pending' && line.state !== 'running' && (
                      <JsonInspector label="result" value={line.result} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
  );
}
