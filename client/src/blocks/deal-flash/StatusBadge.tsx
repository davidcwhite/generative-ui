import type { DealStatus } from '../data/model';

/**
 * Lifecycle stage. Only a live deal gets colour — a priced deal is the normal
 * case and doesn't need to shout, so the palette stays semantic rather than
 * decorative and the one deal still in the market is the one that stands out.
 */
const STATUS: Record<DealStatus, { label: string; className: string; live: boolean }> = {
  announced: { label: 'Announced', className: 'bg-blue-50 text-blue-700', live: true },
  guidance: { label: 'Guidance', className: 'bg-amber-50 text-amber-700', live: true },
  launched: { label: 'Launched', className: 'bg-emerald-50 text-emerald-700', live: true },
  priced: { label: 'Priced', className: 'bg-stone-100 text-stone-600', live: false },
};

export function StatusBadge({ status }: { status: DealStatus }) {
  const { label, className, live } = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}
    >
      {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
      {label}
    </span>
  );
}
