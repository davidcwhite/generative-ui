import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { CompsPoint } from '../contract';
import { RatingDot } from '../primitives';

type SortKey = 'pricingDate' | 'issuer' | 'tenorYears' | 'sizeEurMm' | 'spread' | 'nip' | 'coverage';

interface Column {
  key: SortKey | 'sector' | 'currency' | 'rating';
  label: string;
  numeric?: boolean;
  sortable?: boolean;
  width?: string;
}

const COLUMNS: Column[] = [
  { key: 'issuer', label: 'Issuer', sortable: true },
  { key: 'rating', label: 'Rating', width: '104px' },
  { key: 'sector', label: 'Sector', width: '112px' },
  { key: 'pricingDate', label: 'Priced', sortable: true, width: '86px' },
  { key: 'currency', label: 'Ccy', width: '48px' },
  { key: 'sizeEurMm', label: 'Size', numeric: true, sortable: true, width: '84px' },
  { key: 'tenorYears', label: 'Tenor', numeric: true, sortable: true, width: '64px' },
  { key: 'spread', label: 'Spread', numeric: true, sortable: true, width: '78px' },
  { key: 'nip', label: 'NIP', numeric: true, sortable: true, width: '62px' },
  { key: 'coverage', label: 'Cover', numeric: true, sortable: true, width: '68px' },
];

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/**
 * Selection is shared with the scatter in both directions: clicking a dot
 * scrolls the row into view, clicking a row rings the dot. Keeping the two
 * synced is what turns a chart and a table into one instrument.
 */
export function CompsTable({
  points,
  selectedId,
  subjectId,
  onSelect,
  medianSpread,
}: {
  points: CompsPoint[];
  selectedId?: string | null;
  subjectId?: string;
  onSelect: (id: string) => void;
  medianSpread: number;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'pricingDate',
    dir: 'desc',
  });
  const bodyRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...points].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (typeof left === 'string' && typeof right === 'string') {
        return left.localeCompare(right) * factor;
      }
      return ((left as number) - (right as number)) * factor;
    });
  }, [points, sort]);

  // A dot clicked in the scatter brings its row into view.
  useEffect(() => {
    if (!selectedId || !bodyRef.current) return;
    const row = bodyRef.current.querySelector(`[data-row-id="${selectedId}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'issuer' ? 'asc' : 'desc' },
    );

  return (
    <div ref={bodyRef} className="max-h-[380px] overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-stone-200">
            {COLUMNS.map((column) => {
              const active = column.sortable && sort.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width }}
                  className={`py-2 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                    column.numeric ? 'text-right' : 'text-left'
                  } ${active ? 'text-stone-600' : 'text-stone-400'}`}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key as SortKey)}
                      className={`inline-flex items-center gap-1 transition-colors hover:text-stone-700 ${
                        column.numeric ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {column.label}
                      {active &&
                        (sort.dir === 'asc' ? (
                          <ArrowUp className="h-2.5 w-2.5" aria-hidden />
                        ) : (
                          <ArrowDown className="h-2.5 w-2.5" aria-hidden />
                        ))}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((point) => {
            const selected = point.id === selectedId;
            const subject = point.id === subjectId;
            return (
              <tr
                key={point.id}
                data-row-id={point.id}
                onClick={() => onSelect(point.id)}
                className={`cursor-pointer border-b border-stone-100 transition-colors ${
                  selected ? 'bg-amber-50/80' : subject ? 'bg-stone-100/70' : 'hover:bg-stone-50'
                }`}
              >
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium text-stone-900">{point.issuer}</span>
                    {subject && (
                      <span className="shrink-0 rounded bg-stone-900 px-1 py-px text-[9px] font-medium text-white">
                        subject
                      </span>
                    )}
                    {point.multiTranche && (
                      <span className="shrink-0 text-[9px] text-stone-400">multi</span>
                    )}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <RatingDot band={point.ratingBand} />
                    {point.rating}
                  </span>
                </td>
                <td className="py-2 pr-3 text-stone-500">{point.sector}</td>
                <td className="py-2 pr-3 tabular-nums text-stone-500">
                  {shortDate(point.pricingDate)}
                </td>
                <td className="py-2 pr-3 text-stone-500">{point.currency}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-stone-600">
                  {point.sizeMm.toLocaleString()}m
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-stone-600">
                  {point.tenorLabel}
                </td>
                <td
                  className={`py-2 pr-3 text-right font-medium tabular-nums ${
                    point.spread < medianSpread ? 'text-emerald-700' : 'text-stone-900'
                  }`}
                >
                  {point.spread}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-stone-600">{point.nip}</td>
                <td className="py-2 text-right tabular-nums text-stone-600">{point.coverage}x</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
