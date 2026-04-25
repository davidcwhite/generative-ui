import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { JsonInspector } from '../components/JsonInspector';
import {
  GloopIndicator,
  GooFilterDefs,
  type GloopState,
} from '../components/GloopIndicator';
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
  resolve_entity: 'Resolving issuer…',
  get_issuer_deals: 'Pulling recent issuance…',
  generate_mandate_brief: 'Drafting mandate brief…',
};

interface TaskRow {
  id: string;
  toolName: string;
  title: string;
  state: GloopState;
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
  if (!result || typeof result !== 'object') return 'Done';
  const r = result as Record<string, unknown>;

  if (toolName === 'resolve_entity') {
    const matches = Array.isArray(r.matches) ? r.matches : [];
    const first = matches[0] as Record<string, unknown> | undefined;
    const name =
      (first?.shortName as string | undefined) ??
      (first?.name as string | undefined);
    return name ? `Resolved · ${name}` : 'No matches';
  }

  if (toolName === 'get_issuer_deals') {
    const deals = Array.isArray(r.deals) ? r.deals : [];
    const summary = (r.summary ?? {}) as Record<string, unknown>;
    const total = summary.totalRaised as number | undefined;
    if (typeof total === 'number') {
      return `${deals.length} deals · €${total.toLocaleString()}M`;
    }
    return `${deals.length} deals`;
  }

  if (toolName === 'generate_mandate_brief') {
    const brief = (r.brief ?? {}) as Record<string, unknown>;
    const sections = Array.isArray(brief.sections) ? brief.sections : [];
    return `${sections.length} sections drafted`;
  }

  return 'Done';
}

function captionFor(task: TaskRow): string {
  if (task.state === 'pending') return 'Pending';
  if (task.state === 'running') {
    return RUNNING_CAPTIONS[task.toolName] ?? 'Working…';
  }
  if (task.state === 'errored') {
    const err =
      (task.result as { error?: string } | undefined)?.error ?? 'Hit a snag';
    return `Hit a snag · ${err}`;
  }
  return summarize(task.toolName, task.result);
}

// V5 · Immersive Task List — same data model as V4, but stripped of the
// surrounding card chrome and with the static state pill replaced by an
// animated GloopIndicator. Each row reads like a sentence: indicator,
// title, live caption.
export function V5Immersive({ message }: VariantRenderProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const tasks: TaskRow[] = [];
  let mandateBrief:
    | { brief: MandateBrief; exportFormats?: string[] }
    | undefined;
  const trailingTexts: string[] = [];

  for (const part of message.parts ?? []) {
    if (part.type === 'tool-invocation') {
      const inv = part.toolInvocation;
      const args = (inv.args ?? {}) as Record<string, unknown>;
      const result = inv.state === 'result' ? inv.result : undefined;
      const state: GloopState =
        inv.state === 'result'
          ? isErrored(result)
            ? 'errored'
            : 'done'
          : 'running';
      tasks.push({
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
      <GooFilterDefs />

      {tasks.length > 0 && (
        <ol className="relative flex flex-col">
          {tasks.map((task, i) => {
            const isLast = i === tasks.length - 1;
            const open = Boolean(openIds[task.id]);
            const stateClass =
              task.state === 'running'
                ? 'is-active'
                : task.state === 'done'
                  ? 'is-done'
                  : task.state === 'errored'
                    ? 'is-errored'
                    : 'is-pending';
            const caption = captionFor(task);
            return (
              <li
                key={task.id}
                className={`lab-gloop-row relative pl-8 ${stateClass} ${
                  isLast ? 'pb-0' : 'pb-3'
                }`}
              >
                {/* Indicator (absolute so the connector sits behind it) */}
                <span className="absolute left-0 top-[2px]">
                  <GloopIndicator state={task.state} size={22} />
                </span>

                {/* Connector to next row */}
                {!isLast && (
                  <span
                    className="lab-gloop-row__connector absolute left-[10px] top-[26px] w-px bg-stone-200"
                    style={{ height: 'calc(100% - 22px)' }}
                    aria-hidden="true"
                  />
                )}

                <button
                  type="button"
                  onClick={() =>
                    setOpenIds((prev) => ({
                      ...prev,
                      [task.id]: !prev[task.id],
                    }))
                  }
                  className="group flex w-full items-baseline gap-2 py-0.5 text-left"
                >
                  <span className="lab-gloop-row__title text-sm font-medium text-stone-800">
                    {task.title}
                  </span>
                  <span
                    key={`${task.state}:${caption}`}
                    className="lab-gloop-row__caption text-xs text-stone-500"
                    aria-live="polite"
                  >
                    {caption}
                  </span>
                  <span className="ml-auto text-[10px] text-stone-300 transition-colors group-hover:text-stone-500">
                    {open ? 'hide' : 'inspect'}
                  </span>
                </button>

                {open && (
                  <div className="ml-1 mt-1.5 flex flex-col gap-2 text-[11px] text-stone-600">
                    <JsonInspector
                      label="Arguments"
                      value={task.args}
                      defaultOpen
                    />
                    {task.state !== 'pending' && task.state !== 'running' && (
                      <JsonInspector label="Result" value={task.result} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
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
