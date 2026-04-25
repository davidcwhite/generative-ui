import ReactMarkdown from 'react-markdown';
import {
  MandateBriefView,
  type MandateBrief,
} from '../components/MandateBriefView';
import type { VariantRenderProps } from '../types';

const TOOL_TITLES: Record<string, string> = {
  resolve_entity: 'Resolving issuer',
  get_issuer_deals: 'Pulling issuance',
  generate_mandate_brief: 'Composing brief',
};

const SHORT_TITLES: Record<string, string> = {
  resolve_entity: 'resolve',
  get_issuer_deals: 'deals',
  generate_mandate_brief: 'brief',
};

type RowState = 'pending' | 'running' | 'done' | 'errored';

interface TickerRow {
  id: string;
  toolName: string;
  state: RowState;
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
  if (!result || typeof result !== 'object') return 'Done';
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
    return `${deals.length} deals pulled`;
  }
  if (toolName === 'generate_mandate_brief') {
    const brief = (r.brief ?? {}) as Record<string, unknown>;
    const sections = Array.isArray(brief.sections) ? brief.sections : [];
    return `Brief ready · ${sections.length} sections`;
  }
  return 'Done';
}

// V8 · Ribbon Ticker — single centralized pill (Dynamic Island vibes)
// that elastically morphs as the active tool changes. The pill is
// keyed by the active row id so React unmounts/remounts on transition,
// triggering the `ribbon-morph` keyframe (squish + recover with a
// hard `cubic-bezier(.7, 0, .2, 1)` curve). The progress beam below
// snaps to its final width with the same curve.
export function V8RibbonTicker({ message, status }: VariantRenderProps) {
  const rows: TickerRow[] = [];
  let mandateBrief:
    | { brief: MandateBrief; exportFormats?: string[] }
    | undefined;
  const trailingTexts: string[] = [];

  for (const part of message.parts ?? []) {
    if (part.type === 'tool-invocation') {
      const inv = part.toolInvocation;
      const result = inv.state === 'result' ? inv.result : undefined;
      const state: RowState =
        inv.state === 'result'
          ? isErrored(result)
            ? 'errored'
            : 'done'
          : 'running';
      rows.push({
        id: inv.toolCallId,
        toolName: inv.toolName,
        state,
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

  const total = rows.length;
  const done = rows.filter((r) => r.state === 'done').length;
  const errored = rows.filter((r) => r.state === 'errored').length;
  const completed = done + errored;
  const runningRow = rows.find((r) => r.state === 'running');
  const lastRow = rows[rows.length - 1];

  const pillRow = runningRow ?? lastRow;

  // Final pill state once stream is settled and we have at least
  // one row. Picks the most informative summary.
  const allSettled =
    rows.length > 0 && completed === total && status !== 'streaming';

  let pillState: RowState = 'pending';
  let pillLabel = 'Waiting…';
  let pillKey = 'idle';

  if (rows.length === 0) {
    pillKey = 'idle';
    pillLabel = status === 'submitted' ? 'Connecting…' : 'Waiting…';
  } else if (allSettled) {
    pillKey = `final:${rows.length}`;
    if (errored > 0) {
      pillState = 'errored';
      pillLabel = `Stopped · ${done}/${total} steps`;
    } else if (mandateBrief?.brief) {
      pillState = 'done';
      pillLabel = `Brief ready · ${mandateBrief.brief.issuerName}`;
    } else {
      pillState = 'done';
      pillLabel = `Done · ${total} steps`;
    }
  } else if (pillRow) {
    pillKey = pillRow.id;
    pillState = pillRow.state;
    if (pillRow.state === 'running') {
      pillLabel = TOOL_TITLES[pillRow.toolName] ?? pillRow.toolName;
    } else if (pillRow.state === 'errored') {
      pillLabel = `${TOOL_TITLES[pillRow.toolName] ?? pillRow.toolName} · failed`;
    } else {
      pillLabel = summarize(pillRow.toolName, pillRow.result);
    }
  }

  const beamPct = total > 0 ? (completed / total) * 100 : 0;
  const beamState: 'errored' | undefined = errored > 0 ? 'errored' : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="ribbon-shell">
        <div className="ribbon-stage">
          <div
            key={pillKey}
            className="ribbon-pill"
            data-state={pillState}
            aria-live="polite"
          >
            <span className="ribbon-dot" aria-hidden="true" />
            <span>{pillLabel}</span>
            {total > 0 && (
              <span className="ribbon-counter">
                {completed}/{total}
              </span>
            )}
          </div>
        </div>

        <div className="ribbon-beam" aria-hidden="true">
          <div
            className="ribbon-beam-fill"
            data-state={beamState}
            style={{ width: `${beamPct}%` }}
          />
        </div>

        {rows.length > 0 && (
          <div className="ribbon-history">
            {rows.map((row) => {
              const label = SHORT_TITLES[row.toolName] ?? row.toolName;
              if (row.state === 'pending' || row.state === 'running') {
                return (
                  <span
                    key={row.id}
                    className="ribbon-chip"
                    data-state={row.state}
                  >
                    <span className="opacity-60">·</span>
                    {label}
                  </span>
                );
              }
              return (
                <span
                  key={row.id}
                  className="ribbon-chip"
                  data-state={row.state}
                >
                  <span aria-hidden="true">
                    {row.state === 'done' ? '✓' : '✗'}
                  </span>
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

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
