import {
  ISSUANCE_END,
  ISSUANCE_START,
  daysBetween,
  shiftDays,
  shiftMonths,
  type Granularity,
} from './shadcnIssuanceData';

export type RangePreset = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

export interface DateWindow {
  from: string;
  to: string;
}

export const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: '1M', label: '1M' },
  { id: '3M', label: '3M' },
  { id: '6M', label: '6M' },
  { id: 'YTD', label: 'YTD' },
  { id: '1Y', label: '1Y' },
  { id: 'ALL', label: 'All' },
];

/** The dataset's last pricing date stands in for "today". */
export const TODAY = ISSUANCE_END;

export function resolvePreset(preset: RangePreset): DateWindow {
  if (preset === 'ALL') return { from: ISSUANCE_START, to: TODAY };
  if (preset === 'YTD') return { from: `${TODAY.slice(0, 4)}-01-01`, to: TODAY };
  const months = preset === '1M' ? 1 : preset === '3M' ? 3 : preset === '6M' ? 6 : 12;
  return { from: shiftDays(shiftMonths(TODAY, -months), 1), to: TODAY };
}

export const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
];

/**
 * Bucket sizes are gated by the range so the axis never collapses into a
 * thicket of hairlines or a lone pair of bars.
 */
const LIMITS: Record<Granularity, { minDays: number; maxDays: number }> = {
  daily: { minDays: 1, maxDays: 95 },
  weekly: { minDays: 14, maxDays: 560 },
  monthly: { minDays: 45, maxDays: 2200 },
  quarterly: { minDays: 180, maxDays: Number.POSITIVE_INFINITY },
};

export function allowedGranularities(range: DateWindow): Granularity[] {
  const days = daysBetween(range.from, range.to);
  return GRANULARITIES.filter(
    ({ id }) => days >= LIMITS[id].minDays && days <= LIMITS[id].maxDays,
  ).map(({ id }) => id);
}

export function granularityHint(id: Granularity, range: DateWindow) {
  const days = daysBetween(range.from, range.to);
  if (days < LIMITS[id].minDays) return `${GRANULARITIES.find((g) => g.id === id)!.label} needs a longer range`;
  if (days > LIMITS[id].maxDays) return `${GRANULARITIES.find((g) => g.id === id)!.label} needs a shorter range`;
  return undefined;
}

/** Keeps the current bucket size if the new range still supports it. */
export function snapGranularity(current: Granularity, range: DateWindow): Granularity {
  const allowed = allowedGranularities(range);
  if (allowed.includes(current)) return current;
  if (allowed.length === 0) return 'monthly';
  const order = GRANULARITIES.map(({ id }) => id);
  const index = order.indexOf(current);
  return allowed.reduce((best, candidate) => {
    const bestDistance = Math.abs(order.indexOf(best) - index);
    const distance = Math.abs(order.indexOf(candidate) - index);
    // Ties break coarser, which is the safer default for a wider range.
    return distance < bestDistance ? candidate : best;
  }, allowed[allowed.length - 1]);
}
