import { useRef, useState, type ReactNode } from 'react';
import { TIER_LABEL, primarySource } from '../data-lineage-v2/lineageData';
import { getChatLineage as getLineage } from './chatData';

/** Wiring passed from the lab view to every traceable component. */
export interface TraceWiring {
  active: boolean;
  revealAll: boolean;
  onTrace: (id: string) => void;
}

interface TraceableProps {
  /** Lineage component this figure traces to. */
  componentId: string;
  /** Source citation shown in the chip, e.g. "S1". */
  citation?: string;
  /** This component is the one currently open in the canvas. */
  active?: boolean;
  /** Reveal every citation chip at once (global Inspect toggle). */
  revealAll?: boolean;
  onTrace: (componentId: string) => void;
  children: ReactNode;
}

const TIER_DOT: Record<1 | 2 | 3, string> = {
  1: 'bg-emerald-500',
  2: 'bg-amber-500',
  3: 'bg-stone-400',
};

/**
 * Inline affordance that makes a single figure traceable: a faint dotted
 * underline on hover and a small superscript source citation. Hovering reveals
 * a lightweight source preview (progressive disclosure); clicking opens (or
 * repoints) the Provenance Canvas. Keeps all chrome off the card itself.
 */
export function Traceable({
  componentId,
  citation,
  active = false,
  revealAll = false,
  onTrace,
  children,
}: TraceableProps) {
  const chipVisible = revealAll || active;
  const [preview, setPreview] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const open = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPreview(true), 220);
  };
  const close = () => {
    window.clearTimeout(timer.current);
    setPreview(false);
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      <button
        type="button"
        onClick={() => {
          close();
          onTrace(componentId);
        }}
        title="Trace this figure to its source"
        className={`group/trace inline-flex items-start gap-0.5 rounded-md text-left transition-colors ${
          active ? 'bg-stone-900/[0.04]' : ''
        }`}
      >
        <span
          className={`-mb-px border-b border-dashed transition-colors ${
            active
              ? 'border-stone-400'
              : 'border-transparent group-hover/trace:border-stone-300'
          }`}
        >
          {children}
        </span>
        {citation && (
          <span
            className={`mt-0.5 inline-flex h-3.5 items-center rounded px-1 align-super text-[9px] font-semibold leading-none ring-1 ring-inset transition-all ${
              active
                ? 'bg-stone-900 text-white ring-stone-900'
                : `bg-stone-100 text-stone-500 ring-stone-200 ${
                    chipVisible ? 'opacity-100' : 'opacity-0 group-hover/trace:opacity-100'
                  }`
            }`}
          >
            {citation}
          </span>
        )}
      </button>

      {preview && !active && <SourcePreview componentId={componentId} />}
    </span>
  );
}

/** Small hover card: where this figure comes from, before the full panel. */
function SourcePreview({ componentId }: { componentId: string }) {
  const lineage = getLineage(componentId);
  if (!lineage) return null;
  const source = primarySource(lineage);
  const headline = lineage.results.find((r) => r.emphasis) ?? lineage.results[0];

  return (
    <div className="lab-fade-in absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-lg">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-xs font-semibold text-stone-900">{lineage.title}</p>
        {headline && (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-900">
            {headline.value}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
        <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[source.tier]}`} aria-hidden />
        {TIER_LABEL[source.tier]}
      </div>
      <p className="mt-1 truncate font-mono text-[11px] text-stone-500">{source.system}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-stone-400">
        <span>{source.rowCount.toLocaleString()} rows</span>
        <span className="text-stone-300">·</span>
        <span>as of {source.asOf}</span>
      </div>
      <p className="mt-2 border-t border-stone-100 pt-2 text-[10px] text-stone-400">
        Click to open the full trace
      </p>
    </div>
  );
}
