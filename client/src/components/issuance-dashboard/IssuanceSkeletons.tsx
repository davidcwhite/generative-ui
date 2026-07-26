import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeletons mirror the geometry of the component they replace, so the swap to
 * real data never moves anything on screen.
 */

/** Deterministic heights read as a plausible bar series rather than noise. */
const BAR_HEIGHTS = [46, 62, 54, 71, 58, 83, 38, 66, 49, 74, 57, 68];

export function BarChartSkeleton() {
  return (
    <div className="flex h-full w-full gap-3" aria-hidden>
      <div className="flex w-11 shrink-0 flex-col justify-between py-1">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-2 w-8" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sk-stagger flex flex-1 items-end gap-[3%]">
          {BAR_HEIGHTS.map((height, index) => (
            <Skeleton
              key={index}
              className="min-w-0 flex-1 rounded-b-none"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-[3%]">
          {BAR_HEIGHTS.map((_, index) => (
            <div key={index} className="flex min-w-0 flex-1 justify-center">
              <Skeleton className="h-2 w-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Row heights mirror the live legend exactly so the swap causes no shift. */
export function DonutChartSkeleton() {
  return (
    <div className="grid h-full content-center gap-4" aria-hidden>
      <div className="mx-auto flex h-[184px] w-full max-w-[230px] items-center justify-center">
        <div className="sk-shimmer h-[164px] w-[164px] rounded-full [mask-image:radial-gradient(circle,transparent_62px,black_63px)]" />
      </div>
      <div className="sk-stagger grid gap-0.5">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex h-4 items-center gap-2.5 px-2 py-1.5 box-content">
            <Skeleton className="h-2 w-2 rounded-[2px]" />
            <Skeleton className="h-2 flex-1" style={{ maxWidth: `${68 - index * 6}%` }} />
            <Skeleton className="h-2 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200/70 bg-white px-5 py-5" aria-hidden>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="sk-stagger mt-6 grid grid-cols-2 gap-x-5 gap-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-2 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-stone-50 px-3 py-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2">
        <Skeleton className="h-2 w-12" />
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="h-2.5 w-32" />
      </div>
    </div>
  );
}

/** Shown next to a card title while already-visible data is being replaced. */
export function RefreshIndicator({ label = 'Updating' }: { label?: string }) {
  return (
    <span
      role="status"
      className="dash-fade-soft inline-flex items-center gap-1.5 text-[10px] font-medium text-stone-400"
    >
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      {label}
    </span>
  );
}
