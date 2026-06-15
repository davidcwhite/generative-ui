import type { ReactNode } from 'react';

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

/**
 * Inline affordance that makes a single figure traceable: a faint dotted
 * underline on hover and a small superscript source citation. Clicking opens
 * (or repoints) the Provenance Canvas. Keeps all chrome off the card itself.
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

  return (
    <button
      type="button"
      onClick={() => onTrace(componentId)}
      aria-label="Trace this figure to its source"
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
  );
}
