import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { JsonInspector } from '../components/JsonInspector';
import { MatrixTile, type MatrixState } from '../components/MatrixTile';
import {
  MandateBriefView,
  type MandateBrief,
} from '../components/MandateBriefView';
import type { VariantRenderProps } from '../types';

const TOOL_TITLES: Record<string, string> = {
  resolve_entity: 'Resolve issuer entity',
  get_issuer_deals: 'Pull recent issuance',
  generate_mandate_brief: 'Compose mandate brief',
};

const RUNNING_CAPTIONS: Record<string, string> = {
  resolve_entity: 'sweeping registry…',
  get_issuer_deals: 'streaming deal book…',
  generate_mandate_brief: 'rendering brief…',
};

interface MatrixRow {
  id: string;
  toolName: string;
  title: string;
  state: MatrixState;
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

function summarize(toolName: string, result: unknown): string {
  if (!result || typeof result !== 'object') return 'done';
  const r = result as Record<string, unknown>;
  if (toolName === 'resolve_entity') {
    const matches = Array.isArray(r.matches) ? r.matches : [];
    const first = matches[0] as Record<string, unknown> | undefined;
    return first?.shortName
      ? `matched · ${first.shortName as string}`
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
    return `brief · ${sections.length} sections`;
  }
  return 'done';
}

function captionFor(row: MatrixRow): string {
  if (row.state === 'pending') return 'queued';
  if (row.state === 'running') return RUNNING_CAPTIONS[row.toolName] ?? 'working…';
  if (row.state === 'errored') {
    const err = (row.result as { error?: string } | undefined)?.error;
    return err ? `error · ${err}` : 'error';
  }
  return summarize(row.toolName, row.result);
}

// V6 · Matrix Grid — a tiny 5x5 dot tile per task. While running, dots
// pulse with a diagonal sweep (Anthropic-mark vibe); on completion the
// non-pattern dots are clipped to opacity:0 and the remaining dots
// hold a check (or cross on error). Hard cubic-bezier(.7, 0, .2, 1)
// snap on the ending so motion stops with a thud, not a fade.
export function V6MatrixGrid({ message }: VariantRenderProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const rows: MatrixRow[] = [];
  let mandateBrief:
    | { brief: MandateBrief; exportFormats?: string[] }
    | undefined;
  const trailingTexts: string[] = [];

  for (const part of message.parts ?? []) {
    if (part.type === 'tool-invocation') {
      const inv = part.toolInvocation;
      const args = (inv.args ?? {}) as Record<string, unknown>;
      const result = inv.state === 'result' ? inv.result : undefined;
      const state: MatrixState =
        inv.state === 'result'
          ? isErrored(result)
            ? 'errored'
            : 'done'
          : 'running';
      rows.push({
        id: inv.toolCallId,
        toolName: inv.toolName,
        title: TOOL_TITLES[inv.toolName] ?? inv.toolName,
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

  return (
    <div className="flex flex-col gap-4">
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => {
            const open = Boolean(openIds[row.id]);
            const caption = captionFor(row);
            return (
              <li key={row.id} className="flex items-start gap-3">
                <MatrixTile state={row.state} size={36} />
                <button
                  type="button"
                  onClick={() =>
                    setOpenIds((prev) => ({
                      ...prev,
                      [row.id]: !prev[row.id],
                    }))
                  }
                  className="group flex flex-1 flex-col items-start gap-0.5 pt-1 text-left"
                >
                  <span className="text-sm font-medium text-stone-800">
                    {row.title}
                  </span>
                  <span
                    key={`${row.state}:${caption}`}
                    className="text-[11px] uppercase tracking-wider text-stone-400 transition-colors group-hover:text-stone-600"
                    aria-live="polite"
                  >
                    {caption}
                  </span>
                  {open && (
                    <div className="mt-1.5 flex w-full flex-col gap-2 text-[11px] text-stone-600">
                      <JsonInspector
                        label="args"
                        value={row.args}
                        defaultOpen
                      />
                      {row.state !== 'pending' && row.state !== 'running' && (
                        <JsonInspector label="result" value={row.result} />
                      )}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
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
