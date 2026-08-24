import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IssuanceDetail } from './IssuanceDetail';
import { IssuanceFilterBar } from './IssuanceFilterBar';
import { IssuanceGrid } from './IssuanceGrid';
import { DetailSkeleton, RefreshIndicator } from './IssuanceSkeletons';
import { useSettledFlag } from './useIssuanceAggregates';
import { fetchDealTranches, type FilterClause, type IssuanceQuery } from './issuanceApi';
import type { IssuanceRecord } from './issuanceData';

/**
 * Filters, table and detail panel. Row selection, paging and the row count all
 * live here rather than on the page, so scrolling the table never re-renders
 * the charts above it.
 */
export function IssuanceTable({
  query,
  filters,
  onFiltersChange,
  onSearchChange,
  onClearAll,
  /** Bumped by a clear-all, which remounts the bar and empties its search box. */
  searchKey,
  /** Distinct deals in scope, from the stats the dashboard already fetches. */
  dealCount,
  density,
  showDetailPanel,
  wide,
}: {
  query: IssuanceQuery;
  filters: FilterClause[];
  onFiltersChange: (filters: FilterClause[]) => void;
  onSearchChange: (value: string) => void;
  onClearAll: () => void;
  searchKey: number;
  dealCount: number | null;
  density: 'comfortable' | 'compact';
  showDetailPanel: boolean;
  wide: boolean;
}) {
  const [pickedRow, setPickedRow] = useState<IssuanceRecord | null>(null);
  const [defaultRow, setDefaultRow] = useState<IssuanceRecord | null>(null);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [isGridLoading, setIsGridLoading] = useState(true);
  const [dealTranches, setDealTranches] = useState<IssuanceRecord[] | null>(null);
  const showRefreshing = useSettledFlag(isGridLoading && totalRows !== null);

  // A new result set invalidates the user's row choice; block refetches don't.
  useEffect(() => setPickedRow(null), [query]);

  const record = pickedRow ?? defaultRow;
  const dealId = record?.dealId ?? null;

  // The card needs every tranche of the deal, not just the clicked row.
  useEffect(() => {
    setDealTranches(null);
    if (!dealId) return;
    const controller = new AbortController();
    fetchDealTranches(dealId, controller.signal)
      .then(setDealTranches)
      .catch(() => {});
    return () => controller.abort();
  }, [dealId]);

  return (
    <section className="mt-10 border-t border-stone-200/70 pt-5">
      <IssuanceFilterBar
        key={searchKey}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSearchChange={onSearchChange}
        onClearAll={onClearAll}
      >
        {showRefreshing && <RefreshIndicator label="Loading" />}
        {totalRows === null ? (
          <Skeleton className="h-2.5 w-14" />
        ) : (
          <span className="tabular-nums">
            {totalRows.toLocaleString()} tranches
            {dealCount !== null && ` · ${dealCount.toLocaleString()} deals`}
          </span>
        )}
      </IssuanceFilterBar>

      <div
        className={`mt-4 grid gap-7 ${
          !showDetailPanel
            ? ''
            : wide
              ? 'xl:grid-cols-[minmax(0,1fr)_300px]'
              : 'xl:grid-cols-[minmax(0,1fr)_282px]'
        }`}
      >
        <div className="min-w-0">
          <IssuanceGrid
            query={query}
            density={density}
            onSelect={setPickedRow}
            onDefaultRow={setDefaultRow}
            onTotalRowsChange={setTotalRows}
            onLoadingChange={setIsGridLoading}
          />
        </div>
        {showDetailPanel && (
          <div>
            {record ? (
              <IssuanceDetail record={record} tranches={dealTranches} />
            ) : isGridLoading ? (
              <DetailSkeleton />
            ) : (
              <IssuanceDetail record={null} tranches={null} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
