import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { JsonInspector } from '../components/JsonInspector';
import {
  MandateBriefView,
  type MandateBrief,
} from '../components/MandateBriefView';
import type { VariantRenderProps } from '../types';

const TOOL_LABELS: Record<string, string> = {
  resolve_entity: 'Resolve issuer entity',
  get_issuer_deals: 'Pull recent issuance',
  generate_mandate_brief: 'Compose mandate brief',
};

type TaskState = 'pending' | 'running' | 'done' | 'error';

interface TaskRow {
  id: string;
  toolName: string;
  label: string;
  state: TaskState;
  args: Record<string, unknown>;
  result?: unknown;
}

function StateIcon({ state }: { state: TaskState }) {
  if (state === 'done') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700">
        <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 10.5l3 3 7-7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === 'running') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-amber-50">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-rose-300 bg-rose-50 text-rose-600">
        <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 5l10 10M15 5L5 15"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 bg-white">
      <span className="h-2 w-2 rounded-full bg-stone-300" />
    </span>
  );
}

function TaskItem({
  task,
  isLast,
  onToggle,
  open,
}: {
  task: TaskRow;
  isLast: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="relative pl-8">
      <span
        className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center ${
          isLast ? '' : ''
        }`}
      >
        <StateIcon state={task.state} />
      </span>
      {!isLast && (
        <span
          className="absolute left-[18px] top-7 h-[calc(100%-1rem)] w-px bg-stone-200"
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md py-1.5 text-left hover:bg-stone-50"
      >
        <span className="flex-1 text-sm text-stone-800">{task.label}</span>
        <span className="text-[10px] uppercase tracking-wide text-stone-400">
          {task.state}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 20 20"
          fill="none"
          className={`text-stone-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="ml-1 mt-1 flex flex-col gap-2 rounded-md border border-stone-200 bg-white p-2 text-[11px] text-stone-700">
          <JsonInspector label="Arguments" value={task.args} defaultOpen />
          {task.state === 'done' && (
            <JsonInspector label="Result" value={task.result} />
          )}
        </div>
      )}
    </li>
  );
}

// V4 Task List — vertical chain-of-thought ticked list. One TaskItem per
// tool, click to expand args/result JSON. Modeled on AI Elements `Task`.
export function V4TaskList({ message }: VariantRenderProps) {
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
      const state: TaskState = inv.state === 'result' ? 'done' : 'running';
      tasks.push({
        id: inv.toolCallId,
        toolName: inv.toolName,
        label: TOOL_LABELS[inv.toolName] ?? inv.toolName,
        state,
        args,
        result: inv.state === 'result' ? inv.result : undefined,
      });
      if (
        inv.toolName === 'generate_mandate_brief' &&
        inv.state === 'result'
      ) {
        mandateBrief = inv.result as {
          brief: MandateBrief;
          exportFormats?: string[];
        };
      }
    } else if (part.type === 'text' && part.text.trim()) {
      trailingTexts.push(part.text);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.length > 0 && (
        <div className="rounded-lg border border-stone-200 bg-white p-2">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            Plan
          </div>
          <ol className="flex flex-col">
            {tasks.map((task, i) => (
              <TaskItem
                key={task.id}
                task={task}
                isLast={i === tasks.length - 1}
                open={Boolean(openIds[task.id])}
                onToggle={() =>
                  setOpenIds((prev) => ({ ...prev, [task.id]: !prev[task.id] }))
                }
              />
            ))}
          </ol>
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
