import { Badge } from '@/components/ui/badge';
import { formatMm } from './format';
import type { IssuanceRecord } from './issuanceData';

/**
 * The one contained surface in the layout: everything else groups by whitespace,
 * so the selected deal reads as a distinct object rather than another panel.
 *
 * Clicking any tranche selects its whole deal: the header carries the shared
 * identity, the ladder lists every tranche (fetched separately, since the grid
 * row only holds the one that was clicked), and the metric well totals the deal.
 */
const SURFACE = 'rounded-xl border border-stone-200/70 bg-white';

export function IssuanceDetail({
  record,
  tranches,
}: {
  /** The clicked tranche; carries the deal-scoped fields immediately. */
  record: IssuanceRecord | null;
  /** All tranches of the deal, ladder order; null while the fetch is in flight. */
  tranches: IssuanceRecord[] | null;
}) {
  if (!record) {
    return (
      <div className={`${SURFACE} flex min-h-64 flex-col items-center justify-center p-6 text-center`}>
        <p className="text-sm font-medium text-stone-700">No deal selected</p>
        <p className="mt-1 text-xs text-stone-500">Select a row to inspect the deal.</p>
      </div>
    );
  }

  const statusClass =
    record.status === 'Live'
      ? 'bg-emerald-50 text-emerald-700'
      : record.status === 'Monitoring'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-stone-100 text-stone-600';

  const totalSize = tranches?.reduce((sum, tranche) => sum + tranche.size, 0) ?? 0;
  const totalBook = tranches?.reduce((sum, tranche) => sum + tranche.book, 0) ?? 0;
  // Book = size × cover per tranche, so the size-weighted cover is book over size.
  const weightedCover = totalSize > 0 ? (totalBook / totalSize).toFixed(1) : null;

  return (
    <div className={`${SURFACE} px-5 py-5 xl:sticky xl:top-[76px] xl:self-start`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-[-0.01em] text-stone-950">
            {record.issuer}
          </h3>
          <p className="mt-0.5 truncate text-xs text-stone-500">
            {record.ticker} · {record.rating}
          </p>
          <p className="mt-0.5 truncate text-xs text-stone-500">
            {record.sector} · {record.region}
          </p>
        </div>
        <Badge className={`shrink-0 border-transparent ${statusClass}`}>{record.status}</Badge>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-xs">
        <Detail label="Pricing" value={formatDate(record.pricingDate)} />
        <Detail
          label="Deal total"
          value={formatMm(record.dealEurEquivalent)}
          suffix={`${record.trancheCount} tranche${record.trancheCount > 1 ? 's' : ''}`}
        />
        <div className="col-span-2">
          <Detail label="Leads" value={record.leads} />
        </div>
      </dl>

      <div className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
          Tranche ladder · {record.currency}
        </p>
        <table className="mt-2 w-full border-collapse tabular-nums">
          <thead>
            <tr className="text-[9px] uppercase tracking-[0.08em] text-stone-400">
              <th className="pb-1.5 text-left font-medium">Tenor</th>
              <th className="pb-1.5 text-right font-medium">Size</th>
              <th className="pb-1.5 text-right font-medium">Spread</th>
              <th className="pb-1.5 text-right font-medium">NIP</th>
              <th className="pb-1.5 text-right font-medium">Book</th>
              <th className="pb-1.5 text-right font-medium">Cover</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {tranches
              ? tranches.map((tranche) => (
                  <tr key={tranche.id} className="border-t border-stone-100">
                    <td className="py-1.5 font-medium text-stone-800">{tranche.tenor}</td>
                    <td className="py-1.5 text-right text-stone-600">
                      {tranche.size.toLocaleString()}m
                    </td>
                    <td className="py-1.5 text-right text-stone-600">{tranche.spread}bp</td>
                    <td className="py-1.5 text-right text-stone-600">{tranche.nip}</td>
                    <td className="py-1.5 text-right text-stone-600">
                      {(tranche.book / 1000).toFixed(1)}bn
                    </td>
                    <td className="py-1.5 text-right text-stone-600">{tranche.cover}x</td>
                  </tr>
                ))
              : /* One shimmer line per expected tranche, so the swap never shifts. */
                Array.from({ length: record.trancheCount }, (_, index) => (
                  <tr key={index} className="border-t border-stone-100">
                    <td colSpan={6} className="py-1.5">
                      <span className="flex h-4 items-center" aria-hidden>
                        <span
                          className="sk-shimmer block h-2 rounded-full"
                          style={{ width: `${88 - (index % 3) * 9}%` }}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-stone-50 px-3 py-4 text-center">
        <Metric
          value={tranches ? `${(totalBook / 1000).toFixed(1)}bn` : '—'}
          label="Total book"
        />
        <Metric
          value={
            tranches
              ? totalSize >= 1000
                ? `${(totalSize / 1000).toFixed(1)}bn`
                : `${totalSize}m`
              : '—'
          }
          label="Total size"
        />
        <Metric value={weightedCover ? `${weightedCover}x` : '—'} label="Wtd cover" />
      </div>
    </div>
  );
}

function Detail({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.09em] text-stone-400">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums text-stone-800">
        {value}
        {suffix && <span className="ml-1.5 font-normal text-stone-400">{suffix}</span>}
      </dd>
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

const PRICING_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatDate(value: string) {
  return PRICING_DATE.format(new Date(value));
}
