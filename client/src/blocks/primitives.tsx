import type { ReactNode } from 'react';
import { Clock3 } from 'lucide-react';
import type { Benchmark } from './contract';

/**
 * Shared presentation atoms. Both the workspace and the inline chat form build
 * from these, which is what keeps a block recognisable at either size.
 */

/** Lower is better for spread and concession; higher is better for coverage. */
export type Direction = 'lower-better' | 'higher-better';

function toneFor(rank: number, direction: Direction) {
  const good = direction === 'lower-better' ? rank <= 0.4 : rank >= 0.6;
  const bad = direction === 'lower-better' ? rank >= 0.75 : rank <= 0.25;
  if (good) return 'text-emerald-600';
  if (bad) return 'text-amber-600';
  return 'text-stone-500';
}

function rankLabel(rank: number, direction: Direction) {
  const pct = Math.round(rank * 100);
  const from = direction === 'lower-better' ? pct : 100 - pct;
  if (from <= 25) return 'top quartile';
  if (from >= 75) return 'bottom quartile';
  return 'mid-range';
}

/**
 * A number is never shown without the peer set it should be judged against.
 * "88bp" tells a banker nothing they can take to an issuer; "88bp, 6bp inside
 * the 94bp median for 41 comparable deals" is the sentence they'd actually say.
 */
export function Metric({
  label,
  value,
  unit,
  benchmark,
  direction = 'lower-better',
  size = 'full',
  pending = false,
}: {
  label: string;
  value: string;
  unit?: string;
  benchmark?: Benchmark;
  direction?: Direction;
  size?: 'full' | 'compact';
  /** The figure doesn't exist yet. Rendered quietly — an absence, not a value. */
  pending?: boolean;
}) {
  const compact = size === 'compact';
  return (
    <div className="min-w-0">
      <p
        className={`font-semibold uppercase tracking-[0.13em] text-stone-400 ${
          compact ? 'text-[9px]' : 'text-[10px]'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 tabular-nums ${
          pending
            ? `font-normal text-stone-300 ${compact ? 'pt-0.5 text-sm' : 'pt-1.5 text-base'}`
            : `font-semibold tracking-[-0.03em] text-stone-950 ${compact ? 'text-lg' : 'text-2xl'}`
        }`}
      >
        {value}
        {unit && (
          <span className={`ml-0.5 font-medium text-stone-400 ${compact ? 'text-xs' : 'text-sm'}`}>
            {unit}
          </span>
        )}
      </p>
      {benchmark && benchmark.peerCount > 0 && (
        <p className={`mt-1 leading-4 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {benchmark.reliable ? (
            <>
              <span className={toneFor(benchmark.rank, direction)}>
                {rankLabel(benchmark.rank, direction)}
              </span>
              <span className="text-stone-400">
                {' '}
                · {benchmark.peerMedian}
                {unit} median across {benchmark.basis} ({benchmark.peerCount})
              </span>
            </>
          ) : (
            <span className="text-stone-400">
              {benchmark.peerMedian}
              {unit} median, {benchmark.basis} · too few at this tenor to rank
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/** Section label over a chart or table. Deliberately not a card header. */
export function BlockSection({
  label,
  hint,
  action,
  children,
}: {
  label: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            {label}
          </p>
          {hint && <p className="mt-1 text-[11px] text-stone-500">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Provenance on the face. Source and as-of are always visible, because nobody
 * puts a number in front of an issuer they can't source.
 */
export function AsOfStamp({
  asOf,
  source,
  frozen,
  className = '',
}: {
  asOf: string;
  source: string;
  frozen?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] text-stone-400 ${className}`}
      title={`${source} · as of ${asOf}`}
    >
      <Clock3 className="h-3 w-3" aria-hidden />
      <span className="tabular-nums">as of {asOf}</span>
      <span aria-hidden>·</span>
      <span>{source}</span>
      {frozen && (
        <>
          <span aria-hidden>·</span>
          <span className="font-medium text-stone-500">snapshot</span>
        </>
      )}
    </span>
  );
}

/** The scope the numbers describe. Sits with the block, never in a tooltip. */
export function ScopeChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-md bg-stone-100 px-2 py-1 text-[10px] font-medium text-stone-600">
      {children}
    </span>
  );
}

const RATING_TINT: Record<string, string> = {
  AA: '#1e40af',
  A: '#3b82f6',
  BBB: '#93c5fd',
};

export function ratingColour(band: string) {
  return RATING_TINT[band] ?? '#d6d3d1';
}

export function RatingDot({ band }: { band: string }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: ratingColour(band) }}
      aria-hidden
    />
  );
}
