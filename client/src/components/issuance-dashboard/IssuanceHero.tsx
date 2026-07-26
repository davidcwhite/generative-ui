import { Skeleton } from '@/components/ui/skeleton';
import { formatBn, formatMm } from './format';
import type { IssuanceStats } from './issuanceApi';

/** The strip and its skeleton share this box, so the page never shifts. */
const STRIP_BOX = 'mt-2 flex min-h-9 items-end';

/** Headline figure first, supporting figures at caption weight beside it. */
export function StatStrip({ stats }: { stats: IssuanceStats }) {
  return (
    <div className={`${STRIP_BOX} flex-wrap gap-x-7 gap-y-2`}>
      <span className="text-[32px] font-semibold leading-none tracking-[-0.04em] text-stone-950">
        {formatBn(stats.totalVolume)}
      </span>
      <div className="flex items-end gap-6">
        <Stat label="Deals" value={stats.dealCount.toLocaleString()} />
        <Stat label="Average" value={formatMm(stats.averageSize)} />
        <Stat
          label="Largest"
          value={stats.largest ? formatMm(stats.largest.volume) : '—'}
          suffix={stats.largest?.ticker}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="border-l border-stone-200/80 pl-6 first:border-l-0 first:pl-0">
      <p className="text-[10px] uppercase tracking-[0.1em] text-stone-400">{label}</p>
      <p className="mt-1.5 text-sm font-medium leading-none tabular-nums text-stone-800">
        {value}
        {suffix && <span className="ml-1.5 text-[11px] text-stone-400">{suffix}</span>}
      </p>
    </div>
  );
}

export function StatStripSkeleton() {
  return (
    <div className={`${STRIP_BOX} gap-7`}>
      <Skeleton className="h-8 w-40" />
      <div className="flex items-end gap-6">
        {[44, 52, 64].map((width) => (
          <div key={width} className="space-y-2">
            <Skeleton className="h-2 w-10" />
            <Skeleton className="h-3" style={{ width }} />
          </div>
        ))}
      </div>
    </div>
  );
}
