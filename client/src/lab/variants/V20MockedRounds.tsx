import { useEffect, useId, useState, type ReactNode } from 'react';
import { Spinner } from '../components/Spinner';
import type { VariantRenderProps } from '../types';

// V20 · Mocked SSE rounds.
// Forks V19 but ignores message.parts. A self-contained mock SSE timeline
// drives the reveal: each event is tagged with a round number; consecutive
// same-round events share a subblock and round changes drop a marker.
// The spinner at the top stays active until the simulated query completes.

type MockEvent = { round: number; text: string };

const MOCK_TIMELINE: MockEvent[] = [
  { round: 1, text: 'Resolving entity "BMW"' },
  { round: 1, text: 'Matched issuer · DE000A1ML7J1' },
  { round: 1, text: 'Confidence 0.94' },
  { round: 2, text: 'Querying mandate history' },
  { round: 2, text: 'Fetched 3 deals · 12 prior trades' },
  { round: 3, text: 'Drafting mandate brief' },
  { round: 3, text: 'Summarised exposure · 4 sections' },
  { round: 3, text: 'Risk class · investment grade' },
];

const REVEAL_DELAY_MS = 260;
const AUTO_COLLAPSE_DELAY_MS = 500;

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

function RoundMarker({
  round,
  completed,
}: {
  round: number;
  completed: boolean;
}) {
  // Dot/tick sit absolutely-positioned over the vertical line rendered by
  // TaskContent (`ml-2 border-l-2 pl-4`): the line center is 17px to the
  // left of the inner content's left edge. Sizes are deliberately small so
  // the marker reads as a subtle node on the line rather than a chip.
  return (
    <div className="relative pt-1">
      <span
        aria-hidden
        className={`absolute left-[-21px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-stone-300 transition-opacity duration-300 ${completed ? 'opacity-0' : 'opacity-100'}`}
      />
      <span
        aria-hidden
        className={`absolute left-[-24px] top-1/2 inline-flex h-3.5 w-3.5 -translate-y-1/2 items-center justify-center text-stone-400 transition-opacity duration-300 ${completed ? 'opacity-100' : 'opacity-0'}`}
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
          <path
            d="M5 12.5l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
        Round {round}
      </span>
    </div>
  );
}

function renderTimeline(visibleCount: number, active: boolean): ReactNode {
  if (visibleCount === 0) {
    return <TaskItem>Waiting for first event...</TaskItem>;
  }

  const visible = MOCK_TIMELINE.slice(0, visibleCount);
  const activeRound = visible[visible.length - 1].round;

  const out: ReactNode[] = [];
  let prevRound = 0;
  visible.forEach((evt, i) => {
    if (evt.round !== prevRound) {
      // A round is "completed" once a later round has started (its first
      // event has been revealed) or the entire timeline is done.
      const completed = !active || evt.round < activeRound;
      out.push(
        <RoundMarker
          key={`round-${evt.round}`}
          round={evt.round}
          completed={completed}
        />,
      );
      prevRound = evt.round;
    }
    out.push(<TaskItem key={`evt-${i}`}>{evt.text}</TaskItem>);
  });
  return out;
}

export function V20MockedRounds({ message, isLastMessage }: VariantRenderProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [taskOpen, setTaskOpen] = useState(true);
  const active = visibleCount < MOCK_TIMELINE.length;
  const title = active ? 'Streaming events' : 'Completed steps';

  useEffect(() => {
    setVisibleCount(0);
    setTaskOpen(true);
  }, [message.id]);

  // Once a newer assistant message arrives, fast-forward this V20 to its
  // completed state so an earlier in-flight timeline doesn't keep animating
  // in the background.
  useEffect(() => {
    if (!isLastMessage && visibleCount < MOCK_TIMELINE.length) {
      setVisibleCount(MOCK_TIMELINE.length);
    }
  }, [isLastMessage, visibleCount]);

  useEffect(() => {
    if (visibleCount >= MOCK_TIMELINE.length || !isLastMessage) return;
    const timeout = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(count + 1, MOCK_TIMELINE.length));
    }, REVEAL_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [visibleCount, isLastMessage]);

  useEffect(() => {
    if (active) return;
    const timeout = window.setTimeout(() => {
      setTaskOpen(false);
    }, AUTO_COLLAPSE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [active]);

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
            {renderTimeline(visibleCount, active)}
          </TaskContent>
        </>
      )}
    </Task>
  );
}
