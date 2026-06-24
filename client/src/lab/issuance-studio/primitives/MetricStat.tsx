import type { ReactNode } from 'react';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';

/**
 * Label + tabular value (+ optional delta chip). Hydration-aware: the label
 * resolves at `labelReady`, the number at `valueReady`, keeping layout stable.
 * All values use tabular-nums so digits don't jitter as they land.
 */

type DeltaTone = 'good' | 'bad' | 'watch' | 'neutral';

const DELTA: Record<DeltaTone, string> = {
  good: 'text-emerald-600',
  bad: 'text-rose-600',
  watch: 'text-amber-600',
  neutral: 'text-stone-500',
};

export interface MetricStatProps {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  deltaTone?: DeltaTone;
  size?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'end';
  labelReady: boolean;
  valueReady: boolean;
}

const VALUE_SIZE = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
} as const;

const VALUE_SKELETON = {
  sm: 'h-3.5 w-12',
  md: 'h-4 w-16',
  lg: 'h-7 w-24',
} as const;

export function MetricStat({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  size = 'md',
  align = 'start',
  labelReady,
  valueReady,
}: MetricStatProps) {
  return (
    <div className={`min-w-0 ${align === 'end' ? 'text-right' : ''}`}>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
        <Hydrate ready={labelReady} skeleton={<SkeletonText className="h-2.5 w-14" />}>
          <span className="truncate">{label}</span>
        </Hydrate>
      </dt>
      <dd
        className={`mt-0.5 flex items-baseline gap-1.5 font-semibold tabular-nums text-stone-900 ${
          align === 'end' ? 'justify-end' : ''
        } ${VALUE_SIZE[size]}`}
      >
        <Hydrate ready={valueReady} skeleton={<SkeletonText className={VALUE_SKELETON[size]} />}>
          <span className="truncate">{value}</span>
        </Hydrate>
        {delta != null && valueReady && (
          <span className={`text-xs font-medium tabular-nums ${DELTA[deltaTone]}`}>{delta}</span>
        )}
      </dd>
    </div>
  );
}
