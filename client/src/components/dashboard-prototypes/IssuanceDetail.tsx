import { Badge } from '@/components/ui/badge';
import type { IssuanceRecord } from './shadcnIssuanceData';

/**
 * The one contained surface in the layout: everything else groups by whitespace,
 * so the selected record reads as a distinct object rather than another panel.
 */
const SURFACE = 'rounded-xl border border-stone-200/70 bg-white';

export function IssuanceDetail({ record }: { record: IssuanceRecord | null }) {
  if (!record) {
    return (
      <div className={`${SURFACE} flex min-h-64 flex-col items-center justify-center p-6 text-center`}>
        <p className="text-sm font-medium text-stone-700">No issuance selected</p>
        <p className="mt-1 text-xs text-stone-500">Select a row to inspect its execution.</p>
      </div>
    );
  }

  const statusClass =
    record.status === 'Live'
      ? 'bg-emerald-50 text-emerald-700'
      : record.status === 'Monitoring'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-stone-100 text-stone-600';

  return (
    <div className={`${SURFACE} px-5 py-5 xl:sticky xl:top-[76px] xl:self-start`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-[-0.01em] text-stone-950">
            {record.issuer}
          </h3>
          <p className="mt-0.5 text-xs text-stone-500">
            {record.sector} · {record.rating}
          </p>
        </div>
        <Badge className={`shrink-0 border-transparent ${statusClass}`}>{record.status}</Badge>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 text-xs">
        <Detail label="Structure" value={`${record.currency} ${record.tenor}`} />
        <Detail label="Size" value={`${record.currency} ${record.size.toLocaleString()}m`} />
        <Detail label="Coupon" value={`${record.coupon}%`} />
        <Detail label="Pricing" value={formatDate(record.pricingDate)} />
      </dl>

      <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-stone-50 px-3 py-4 text-center">
        <Metric value={record.spread} label="Spread bp" />
        <Metric value={record.nip} label="NIP bp" />
        <Metric value={`${record.cover}x`} label="Book cover" />
      </div>

      <div className="mt-6 space-y-4">
        <Note label="Leads" value={record.leads} />
        <Note
          label="Execution read"
          value={
            record.nip <= 4
              ? 'Strong demand supports pricing at or through the tight end of guidance.'
              : record.nip <= 7
                ? 'Balanced execution with a modest concession to preserve book quality.'
                : 'Price sensitivity remains elevated; retain flexibility on size and final terms.'
          }
        />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.09em] text-stone-400">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums text-stone-800">{value}</dd>
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="text-xl font-semibold tracking-[-0.04em] text-stone-950">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-stone-400">{label}</p>
    </div>
  );
}

function Note({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
        {label}
      </p>
      <p className="mt-1 text-xs leading-5 text-stone-600">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
