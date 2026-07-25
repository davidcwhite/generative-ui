import {
  INLINE_ROW_CAP,
  type Benchmark,
  type BlockPayload,
  type BlockSpec,
  type CompsPayload,
  type CompsPoint,
  type CompsSpec,
  type DealFlashPayload,
  type DealFlashSpec,
  type DealFlashTranche,
  type PricingStage,
} from './contract';
import {
  AS_OF,
  MARKET_SERIES,
  ROW_BY_ID,
  TRANCHE_ROWS,
  dateMinusMonths,
  median,
  percentile,
  percentileRank,
  tenorBucket,
} from './data/queries';
import type { DealStatus, TrancheRow } from './data/model';

/**
 * One execution path.
 *
 * The workspace calls this directly and the agent tool would wrap the same
 * function server-side. Two aggregation paths drift within a month, and the
 * desk finds the discrepancy before you do — so there is deliberately no second
 * way to compute a peer median in this codebase.
 */

const LATENCY_MS = 420;

function toPoint(row: TrancheRow): CompsPoint {
  return {
    id: row.id,
    issuer: row.issuer.name,
    ticker: row.issuer.ticker,
    sector: row.issuer.sector,
    rating: row.issuer.rating,
    ratingBand: row.issuer.ratingBand,
    currency: row.deal.currency,
    tenorYears: row.tenorYears,
    tenorLabel: row.tenorLabel,
    sizeMm: row.sizeMm,
    sizeEurMm: row.sizeEurMm,
    spread: row.reofferSpread,
    nip: row.nipBp,
    coverage: row.coverage,
    pricingDate: row.deal.pricingDate,
    multiTranche: row.multiTranche,
  };
}

/** The peer set. Kept separate so the subject can be scored against it. */
function selectPeers(spec: CompsSpec): TrancheRow[] {
  const from = dateMinusMonths(spec.asOf, spec.windowMonths);
  const { ratingBands, sectors, currencies, tenorBuckets } = spec.filters;

  return TRANCHE_ROWS.filter((row) => {
    if (row.deal.pricingDate < from || row.deal.pricingDate > spec.asOf) return false;
    if (ratingBands?.length && !ratingBands.includes(row.issuer.ratingBand)) return false;
    if (sectors?.length && !sectors.includes(row.issuer.sector)) return false;
    if (currencies?.length && !currencies.includes(row.deal.currency)) return false;
    if (tenorBuckets?.length && !tenorBuckets.includes(tenorBucket(row.tenorYears))) return false;
    return true;
  });
}

function benchmark(
  values: number[],
  value: number,
  { basis, reliable }: { basis: string; reliable: boolean },
): Benchmark {
  return {
    value,
    peerMedian: Number(median(values).toFixed(2)),
    rank: percentileRank(values, value),
    peerCount: values.length,
    basis,
    reliable,
  };
}

/** Below this, the neighbourhood is too thin to judge against. */
const SUBJECT_MIN_PEERS = 6;

/**
 * How far either side of a tenor still counts as comparable — proportional,
 * not fixed. A desk will read 15s against 20s without blinking but would never
 * put a 3Y next to an 8Y, and the long end is too thinly supplied for a narrow
 * fixed window to find peers at all.
 */
function tenorWindow(tenorYears: number) {
  return Math.max(2, tenorYears * 0.25);
}

/**
 * The peer set a subject is actually scored against. Tenor-matched where the
 * data supports it, falling back to the full set with the basis relabelled so
 * a thin neighbourhood is visible rather than silently papered over.
 */
function scoringSet(peers: TrancheRow[], subject: TrancheRow) {
  const window = tenorWindow(subject.tenorYears);
  const near = peers.filter((row) => Math.abs(row.tenorYears - subject.tenorYears) <= window);

  if (near.length >= SUBJECT_MIN_PEERS) {
    const low = Math.max(1, Math.round(subject.tenorYears - window));
    const high = Math.round(subject.tenorYears + window);
    return { rows: near, basis: `${low}\u2013${high}Y peers`, reliable: true };
  }
  return { rows: peers, basis: 'all tenors', reliable: false };
}

/**
 * Median spread by tenor, which is the curve a banker draws by eye through the
 * cloud. Buckets with too few observations are dropped rather than plotted,
 * because a "median" of two deals invites a conclusion the data can't support.
 */
/** Tenors within this many years count as neighbours when fitting the curve. */
const CURVE_WINDOW_YEARS = 2;
const CURVE_MIN_OBSERVATIONS = 4;

function fitCurve(points: CompsPoint[]): CompsPayload['curve'] {
  const tenors = [...new Set(points.map((point) => point.tenorYears))].sort((a, b) => a - b);

  return tenors
    .map((tenorYears) => {
      const near = points
        .filter((point) => Math.abs(point.tenorYears - tenorYears) <= CURVE_WINDOW_YEARS)
        .map((point) => point.spread);

      // Sparse parts of the curve are left undrawn rather than guessed at. A
      // median of two deals is a number the chart shouldn't imply confidence in.
      if (near.length < CURVE_MIN_OBSERVATIONS) return null;

      return {
        tenorYears,
        spread: Number(median(near).toFixed(1)),
        band: [
          Number(percentile(near, 0.25).toFixed(1)),
          Number(percentile(near, 0.75).toFixed(1)),
        ] as [number, number],
      };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null);
}

/**
 * Thin a peer set down to a chat-sized sample.
 *
 * An even stride rather than the first N: the rows are date-sorted, so taking
 * the head would hand the inline chart the last three weeks of issuance and
 * call it the shape of the year. The subject is always kept.
 */
function sample(points: CompsPoint[], cap: number, subjectId?: string): CompsPoint[] {
  if (points.length <= cap) return points;

  const subject = subjectId ? points.find((point) => point.id === subjectId) : undefined;
  const rest = points.filter((point) => point.id !== subjectId);
  const slots = subject ? cap - 1 : cap;
  const stride = rest.length / slots;

  const taken = Array.from({ length: slots }, (_, index) => rest[Math.floor(index * stride)]);
  return subject ? [subject, ...taken] : taken;
}

function buildSubject(subjectRow: TrancheRow, others: TrancheRow[]) {
  const { rows, ...against } = scoringSet(others, subjectRow);
  return {
    point: toPoint(subjectRow),
    spread: benchmark(rows.map((r) => r.reofferSpread), subjectRow.reofferSpread, against),
    coverage: benchmark(rows.map((r) => r.coverage), subjectRow.coverage, against),
    nip: benchmark(rows.map((r) => r.nipBp), subjectRow.nipBp, against),
  };
}

function executeComps(spec: CompsSpec, cap?: number): CompsPayload {
  const peers = selectPeers(spec);
  const subjectRow = spec.subject ? ROW_BY_ID.get(spec.subject.trancheId) : undefined;

  // A deal is not its own comp.
  const others = peers.filter((row) => row.id !== subjectRow?.id);
  const spreads = others.map((row) => row.reofferSpread);
  const covers = others.map((row) => row.coverage);
  const nips = others.map((row) => row.nipBp);

  const allPoints = peers.map(toPoint);
  const points = cap ? sample(allPoints, cap, subjectRow?.id) : allPoints;

  const stats = {
    count: peers.length,
    medianSpread: Number(median(spreads).toFixed(1)),
    q1Spread: Number(percentile(spreads, 0.25).toFixed(1)),
    q3Spread: Number(percentile(spreads, 0.75).toFixed(1)),
    medianCoverage: Number(median(covers).toFixed(2)),
    medianNip: Number(median(nips).toFixed(1)),
    totalEurBn: Number((peers.reduce((sum, row) => sum + row.sizeEurMm, 0) / 1000).toFixed(1)),
  };

  return {
    points,
    stats,
    curve: fitCurve(allPoints),
    subject: subjectRow ? buildSubject(subjectRow, others) : undefined,
    truncated: cap !== undefined && allPoints.length > cap,
  };
}

/**
 * How far down the pricing ladder a deal has got.
 *
 * A deal in guidance has no reoffer and no final book, and showing one because
 * the row happens to hold a number would be the worst class of error this
 * product can make: a confident figure for something that hasn't happened.
 */
const STAGES_REACHED: Record<DealStatus, number> = {
  announced: 0,
  guidance: 1,
  launched: 2,
  priced: 3,
};

function toFlashTranche(row: TrancheRow, reached: number): DealFlashTranche {
  const rungs: PricingStage[] = [
    { label: 'IPT', spread: row.iptSpread, reached: reached >= 1 },
    { label: 'Guidance', spread: row.guidanceSpread, reached: reached >= 2 },
    { label: 'Reoffer', spread: row.reofferSpread, reached: reached >= 3 },
  ];
  const stages = rungs.map((stage) => ({
    ...stage,
    spread: stage.reached ? stage.spread : null,
  }));

  const priced = reached >= 3;
  return {
    id: row.id,
    key: row.key,
    tenorLabel: row.tenorLabel,
    tenorYears: row.tenorYears,
    // Size is only firm once the deal launches; before that it's "benchmark".
    sizeMm: reached >= 2 ? row.sizeMm : null,
    coupon: priced ? row.coupon : null,
    maturity: row.maturity,
    format: row.format,
    reofferSpread: priced ? row.reofferSpread : null,
    compressionBp: priced ? row.compressionBp : null,
    nipBp: priced ? row.nipBp : null,
    bookMm: reached >= 2 ? row.bookMm : null,
    coverage: reached >= 2 ? row.coverage : null,
    stages,
  };
}

/** Six weeks of credit index either side of the print, plus the weekly move. */
function marketAround(pricingDate: string): DealFlashPayload['market'] {
  const index = MARKET_SERIES.findIndex((point) => point.date >= pricingDate);
  const at = index === -1 ? MARKET_SERIES.length - 1 : index;
  const window = MARKET_SERIES.slice(Math.max(0, at - 29), at + 1);
  const weekAgo = MARKET_SERIES[Math.max(0, at - 5)];

  return {
    level: MARKET_SERIES[at].iboxxCorp,
    changeWeekBp: Number((MARKET_SERIES[at].iboxxCorp - weekAgo.iboxxCorp).toFixed(1)),
    series: window.map((point) => ({ date: point.date, level: point.iboxxCorp })),
  };
}

function executeDealFlash(spec: DealFlashSpec): DealFlashPayload {
  const rows = TRANCHE_ROWS.filter((row) => row.dealId === spec.dealId).sort(
    (a, b) => a.tenorYears - b.tenorYears,
  );
  if (rows.length === 0) throw new Error(`Unknown deal ${spec.dealId}`);

  const { deal, issuer } = rows[0];
  const reached = STAGES_REACHED[deal.status];

  // Default focus is the biggest tranche: the one the deal is remembered by.
  const focusRow =
    rows.find((row) => row.id === spec.trancheId) ??
    rows.reduce((best, row) => (row.sizeMm > best.sizeMm ? row : best));

  const tranches = rows.map((row) => toFlashTranche(row, reached));
  const focus = tranches.find((tranche) => tranche.id === focusRow.id)!;

  // The peer set for this deal, expressed as a spec so it can be opened.
  const compsSpec: CompsSpec = {
    blockType: 'comps',
    subject: { trancheId: focusRow.id },
    filters: { ratingBands: [issuer.ratingBand], currencies: [deal.currency] },
    windowMonths: 12,
    asOf: spec.asOf,
  };

  const market = marketAround(deal.pricingDate);

  // Benchmarks only once priced; there is nothing final to judge before that.
  const peers =
    reached >= 3
      ? selectPeers(compsSpec).filter((row) => row.id !== focusRow.id)
      : [];
  const scored = peers.length ? buildSubject(focusRow, peers) : undefined;

  return {
    deal: {
      id: deal.id,
      issuer: issuer.name,
      ticker: issuer.ticker,
      rating: issuer.rating,
      ratingBand: issuer.ratingBand,
      sector: issuer.sector,
      status: deal.status,
      pricingDate: deal.pricingDate,
      currency: deal.currency,
      leads: deal.leads,
    },
    tranches,
    focus,
    totalSizeMm: reached >= 2 ? rows.reduce((sum, row) => sum + row.sizeMm, 0) : null,
    market,
    spread: scored?.spread,
    coverage: scored?.coverage,
    nip: scored?.nip,
    compsSpec,
  };
}

export function executeSync(spec: CompsSpec, cap?: number): CompsPayload;
export function executeSync(spec: DealFlashSpec): DealFlashPayload;
export function executeSync(spec: BlockSpec, cap?: number): BlockPayload;
export function executeSync(spec: BlockSpec, cap?: number): BlockPayload {
  return spec.blockType === 'comps' ? executeComps(spec, cap) : executeDealFlash(spec);
}

/** Async wrapper so the workspace exercises real loading states. */
export function execute(spec: CompsSpec, signal?: AbortSignal): Promise<CompsPayload>;
export function execute(spec: DealFlashSpec, signal?: AbortSignal): Promise<DealFlashPayload>;
export function execute(spec: BlockSpec, signal?: AbortSignal): Promise<BlockPayload>;
export function execute(spec: BlockSpec, signal?: AbortSignal): Promise<BlockPayload> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(executeSync(spec)), LATENCY_MS);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/** What the agent would attach to a message: capped rows, frozen at compute time. */
export function executeForChat(spec: BlockSpec): BlockPayload {
  return executeSync(spec, INLINE_ROW_CAP);
}

export const DEFAULT_COMPS_SPEC: CompsSpec = {
  blockType: 'comps',
  filters: { ratingBands: ['A'], currencies: ['EUR'] },
  windowMonths: 12,
  asOf: AS_OF,
};
