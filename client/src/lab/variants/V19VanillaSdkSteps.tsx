import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Spinner } from '../components/Spinner';
import type { VariantRenderProps } from '../types';

// V19 · Vanilla AI Elements Task baseline.
// Mirrors the AI SDK Elements Task example:
// <Task><TaskTrigger title="..." /><TaskContent><TaskItem /></TaskContent></Task>.
// Keep this intentionally plain; later variants can layer richer UX on top.

type SdkPart = NonNullable<VariantRenderProps['message']['parts']>[number];

interface TaskRow {
  key: string;
  value: ReactNode;
}

function Task({
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
}: {
  children: (state: { open: boolean; contentId: string; toggle: () => void }) => ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const contentId = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <div className="w-full">
      {children({
        open,
        contentId,
        toggle: () => setOpen(!open),
      })}
    </div>
  );
}

function TaskTrigger({
  title,
  open,
  contentId,
  onClick,
  trailing,
}: {
  title: string;
  open: boolean;
  contentId: string;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
    >
      {trailing}
      <span
        className={`ml-auto text-stone-400 transition-transform duration-150 ease-out ${open ? 'rotate-180' : ''}`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="order-first text-sm font-medium text-stone-700">
        {title}
      </span>
    </button>
  );
}

function TaskContent({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div id={id} className="px-3 pb-2">
      <div className="ml-2 border-l-2 border-stone-200 pl-4">
        <div className="flex flex-col gap-3 text-sm text-stone-500">
          {children}
        </div>
      </div>
    </div>
  );
}

function TaskItem({ children }: { children: ReactNode }) {
  return <div className="leading-6">{children}</div>;
}

function TaskItemFile({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs text-stone-700 shadow-sm">
      {children}
    </span>
  );
}

function isTypedToolPart(part: SdkPart) {
  const type = (part as { type: string }).type;
  return type === 'dynamic-tool' || type.startsWith('tool-');
}

function toolNameForTypedPart(part: SdkPart) {
  if ('toolName' in part && typeof part.toolName === 'string') {
    return part.toolName;
  }
  return (part as { type: string }).type.replace(/^tool-/, '');
}

function statusLabelForToolInvocation(part: SdkPart): string | undefined {
  if (part.type === 'tool-invocation') {
    const inv = part.toolInvocation;
    if (inv.state === 'partial-call') return `Preparing ${inv.toolName}`;
    if (inv.state === 'call') return `Running ${inv.toolName}`;
    return `Finished ${inv.toolName}`;
  }

  if (isTypedToolPart(part) && 'state' in part && typeof part.state === 'string') {
    const toolName = toolNameForTypedPart(part);
    if (part.state === 'input-streaming') return `Preparing ${toolName}`;
    if (part.state === 'input-available') return `Running ${toolName}`;
    if (part.state === 'output-error') return `Failed ${toolName}`;
    return `Finished ${toolName}`;
  }

  return undefined;
}

function ToolChip({ name }: { name: string }) {
  return (
    <TaskItemFile>
      <span className="flex size-4 items-center justify-center rounded bg-stone-100 font-mono text-[9px] font-semibold text-stone-500">
        fx
      </span>
      <span>{name}</span>
    </TaskItemFile>
  );
}

function rowsFromParts(parts: SdkPart[]): TaskRow[] {
  const rows: TaskRow[] = [];
  let step = 1;

  for (const [index, part] of parts.entries()) {
    if (part.type === 'step-start') {
      if (index > 0) {
        step += 1;
        rows.push({
          key: `step-${step}`,
          value: `Step ${step}`,
        });
      }
      continue;
    }

    if (part.type === 'text' && part.text.trim()) {
      rows.push({
        key: `text-${index}`,
        value: part.text.trim(),
      });
      continue;
    }

    const label = statusLabelForToolInvocation(part);
    if (label) {
      const toolName =
        part.type === 'tool-invocation'
          ? part.toolInvocation.toolName
          : toolNameForTypedPart(part);
      rows.push({
        key: `tool-${index}`,
        value: (
          <span className="inline-flex items-center gap-1">
            {label}
            <ToolChip name={toolName} />
          </span>
        ),
      });
    }
  }

  return rows;
}

export function V19VanillaSdkSteps({
  message,
  status,
  isLastMessage,
}: VariantRenderProps) {
  const parts = message.parts ?? [];
  const sourceTasks = useMemo(() => rowsFromParts(parts), [parts]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [taskOpen, setTaskOpen] = useState(true);
  const isStreaming =
    isLastMessage && (status === 'submitted' || status === 'streaming');
  const revealing = visibleCount < sourceTasks.length;
  const active = isStreaming || revealing;
  const tasks = sourceTasks.slice(0, visibleCount);
  const title = active ? 'Streaming events' : 'Completed steps';

  useEffect(() => {
    setVisibleCount(0);
    setTaskOpen(true);
  }, [message.id]);

  useEffect(() => {
    if (visibleCount >= sourceTasks.length) return;
    const timeout = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(count + 1, sourceTasks.length));
    }, 260);
    return () => window.clearTimeout(timeout);
  }, [sourceTasks.length, visibleCount]);

  useEffect(() => {
    if (active || sourceTasks.length === 0) return;
    const timeout = window.setTimeout(() => {
      setTaskOpen(false);
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [active, sourceTasks.length]);

  return (
    <Task open={taskOpen} onOpenChange={setTaskOpen}>
      {({ open, contentId, toggle }) => (
        <>
          <TaskTrigger
            title={title}
            open={open}
            contentId={contentId}
            onClick={toggle}
            trailing={active ? <Spinner size={14} /> : undefined}
          />
          <TaskContent id={contentId} open={open}>
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskItem key={task.key}>{task.value}</TaskItem>
              ))
            ) : (
              <TaskItem>Waiting for first event...</TaskItem>
            )}
          </TaskContent>
        </>
      )}
    </Task>
  );
}
