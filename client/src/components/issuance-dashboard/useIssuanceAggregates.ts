import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchIssuanceAggregates, type IssuanceAggregates, type IssuanceQuery } from './issuanceApi';

export interface AggregatesState {
  data: IssuanceAggregates | null;
  /** No data has ever arrived, so the UI must render skeletons. */
  isFirstLoad: boolean;
  /** Data is on screen but a newer request is in flight. */
  isRefreshing: boolean;
}

/**
 * Stale-while-revalidate: the previous aggregates stay mounted while a new query
 * loads, so changing a filter never blanks out a chart the user is reading.
 *
 * `query` is the effect's dependency, so callers must memoise it — a fresh
 * object each render would refetch on every render.
 */
export function useIssuanceAggregates(query: IssuanceQuery): AggregatesState {
  const [data, setData] = useState<IssuanceAggregates | null>(null);
  const [isPending, setIsPending] = useState(true);
  const hasData = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsPending(true);

    fetchIssuanceAggregates(query, controller.signal)
      .then((result) => {
        hasData.current = true;
        setData(result);
        setIsPending(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setIsPending(false);
      });

    return () => controller.abort();
  }, [query]);

  return useMemo(
    () => ({
      data,
      isFirstLoad: isPending && !hasData.current,
      isRefreshing: isPending && hasData.current,
    }),
    [data, isPending],
  );
}

/**
 * Holds a transient flag on for a minimum duration and only shows it after a
 * short delay, which stops fast responses from flashing an indicator.
 */
export function useSettledFlag(active: boolean, delayMs = 220, minVisibleMs = 420) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = active
      ? setTimeout(() => setVisible(true), delayMs)
      : setTimeout(() => setVisible(false), minVisibleMs);
    return () => clearTimeout(timer);
  }, [active, delayMs, minVisibleMs]);

  return visible;
}
