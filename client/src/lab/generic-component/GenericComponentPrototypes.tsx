/**
 * Variations on the user's preferred `GenericComponent` direction: an outlined-
 * free KPI strip over a *bordered* ag-grid table (a chart body sits flush).
 * Every variant keeps the same structure and the same payload contract — only
 * the KPI treatment changes, so they're easy to compare side by side.
 *
 * The treatments are grounded in current dashboard/stat-card best practice
 * (Stripe / Linear / Vercel metric strips, shadcn stats blocks):
 *  - group KPIs with whitespace or a soft tint, not hard borders;
 *  - lead with a large value, then a delta with an explicit directional arrow
 *    AND semantic colour (never colour alone);
 *  - keep contextual text small and consistently left-aligned.
 *
 *  'tiles'   → soft-tinted tiles, no outline (the favourite, de-bordered).
 *  'minimal' → no chrome at all; bigger value, grouped by whitespace only.
 *  'bar'     → one connected stat bar split by hairline rules, delta as a pill.
 */

import { useEffect, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AgGridTable } from './AgGridTable';
import {
  isGenericComponentPayload,
  type ChartBody,
  type GenericComponentPayload,
  type Kpi,
  type Tone,
} from './contract';
import { formatValue, type FormatOptions } from './formatValue';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export type GenericComponentVariant = 'tiles' | 'minimal' | 'bar';

const TONE_TEXT: Record<Tone, string> = {
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  warning: 'text-amber-600',
  neutral: 'text-stone-500',
};

const TONE_CHIP: Record<Tone, string> = {
  positive: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  negative: 'bg-rose-50 text-rose-700 ring-rose-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  neutral: 'bg-stone-100 text-stone-600 ring-stone-200',
};

const BAR_REST = '#d6d3d1';
const BAR_EMPHASIS = '#1c1917';

/** ↑ / ↓ / → from the delta's sign — a non-colour cue for direction (a11y). */
function arrowFor(value: number): string {
  if (value > 0) return '↑';
  if (value < 0) return '↓';
  return '→';
}

/**
 * Split a delta into a directional arrow + display text. Numeric deltas get a
 * sign arrow and are shown as an absolute value (the arrow carries direction);
 * string deltas (e.g. "+21% YoY") are passed through verbatim with no arrow.
 */
function deltaParts(
  delta: { value: string | number },
  format: Kpi['format'],
  fmt: FormatOptions,
): { arrow: string; text: string } {
  if (typeof delta.value === 'number') {
    return { arrow: arrowFor(delta.value), text: formatValue(Math.abs(delta.value), format, fmt) };
  }
  return { arrow: '', text: delta.value };
}

interface GenericComponentPrototypeProps {
  payload: GenericComponentPayload;
  variant: GenericComponentVariant;
  reveal?: { labels: boolean; data: boolean };
  reducedMotion?: boolean;
  locale?: string;
  className?: string;
}

export function GenericComponentPrototype({
  payload,
  variant,
  reveal,
  reducedMotion,
  locale,
  className = '',
}: GenericComponentPrototypeProps) {
  const prefersReduced = usePrefersReducedMotion();
  const reduced = reducedMotion ?? prefersReduced;
  const labelsReady = reveal ? reveal.labels : true;
  const dataReady = reveal ? reveal.data : true;

  if (!isGenericComponentPayload(payload)) {
    return <p className={`text-sm text-stone-500 ${className}`}>No data to display.</p>;
  }

  const fmt: FormatOptions = { locale, currency: payload.currency };
  const kpis = Array.isArray(payload.kpis) ? payload.kpis : [];
  const hasKpis = kpis.length > 0;
  const body = payload.body;

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      <Header payload={payload} labelsReady={labelsReady} />

      {hasKpis && (
        <KpiStrip
          kpis={kpis}
          treatment={variant}
          fmt={fmt}
          labelsReady={labelsReady}
          dataReady={dataReady}
        />
      )}

      {/* Table → bordered frame. Chart → flush, no border. */}
      {body.type === 'table' ? (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {dataReady ? (
            <Fade reduced={reduced}>
              <AgGridTable body={body} fmt={fmt} reduced={reduced} />
            </Fade>
          ) : (
            <TableSkeleton rows={body.rows.length || 5} cols={body.columns.length || 4} />
          )}
        </div>
      ) : (
        <ChartBodyView body={body} fmt={fmt} ready={dataReady} reduced={reduced} />
      )}
    </div>
  );
}

/* ── Header ───────────────────────────────────────────────────────────────── */

function Header({ payload, labelsReady }: { payload: GenericComponentPayload; labelsReady: boolean }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {payload.eyebrow && (
          <Reveal ready={labelsReady} skeleton={<Skeleton className="h-2.5 w-20" />}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              {payload.eyebrow}
            </p>
          </Reveal>
        )}
        <Reveal ready={labelsReady} skeleton={<Skeleton className="mt-1 h-5 w-44" />}>
          <h3 className="text-base font-semibold tracking-tight text-stone-900 text-pretty">
            {payload.title}
          </h3>
        </Reveal>
        {payload.subtitle && (
          <Reveal ready={labelsReady} skeleton={<Skeleton className="mt-1 h-3 w-28" />}>
            <p className="mt-0.5 truncate text-xs text-stone-500">{payload.subtitle}</p>
          </Reveal>
        )}
      </div>

      {payload.status && (
        <Reveal ready={labelsReady} skeleton={<Skeleton className="h-6 w-16 rounded-full" />}>
          <span
            className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              TONE_CHIP[payload.status.tone ?? 'neutral']
            }`}
          >
            {payload.status.label}
          </span>
        </Reveal>
      )}
    </header>
  );
}

/* ── KPI strip — three treatments, no outline ─────────────────────────────── */

function KpiStrip({
  kpis,
  treatment,
  fmt,
  labelsReady,
  dataReady,
}: {
  kpis: Kpi[];
  treatment: GenericComponentVariant;
  fmt: FormatOptions;
  labelsReady: boolean;
  dataReady: boolean;
}) {
  // 'bar' → one connected container split by hairline rules.
  if (treatment === 'bar') {
    return (
      <dl className="flex divide-x divide-stone-200/80 overflow-hidden rounded-2xl bg-stone-100/80">
        {kpis.map((kpi, i) => (
          <div key={`${kpi.label}-${i}`} className="min-w-0 flex-1 px-4 py-3.5">
            <dt className="truncate text-xs font-medium text-stone-500">
              <Reveal ready={labelsReady} skeleton={<Skeleton className="h-3 w-16" />}>
                <span>{kpi.label}</span>
              </Reveal>
            </dt>
            <dd className="mt-1.5 flex items-baseline gap-2">
              <Reveal ready={dataReady} skeleton={<Skeleton className="h-6 w-20" />}>
                <span className="truncate text-xl font-semibold tracking-tight text-stone-900 tabular-nums">
                  {formatValue(kpi.value, kpi.format, fmt)}
                </span>
              </Reveal>
              {kpi.delta && dataReady && <DeltaPill kpi={kpi} fmt={fmt} />}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  // 'tiles' (soft tint, no border) and 'minimal' (no chrome) share a grid.
  const tile =
    treatment === 'tiles'
      ? 'rounded-2xl bg-stone-100/80 px-4 py-3.5'
      : 'px-0.5';

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {kpis.map((kpi, i) => (
        <div key={`${kpi.label}-${i}`} className={`min-w-0 ${tile}`}>
          <dt
            className={
              treatment === 'minimal'
                ? 'truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400'
                : 'truncate text-xs font-medium text-stone-500'
            }
          >
            <Reveal ready={labelsReady} skeleton={<Skeleton className="h-3 w-16" />}>
              <span>{kpi.label}</span>
            </Reveal>
          </dt>
          <dd className="mt-1.5">
            <Reveal ready={dataReady} skeleton={<Skeleton className="h-7 w-24" />}>
              <span
                className={`block truncate font-semibold tracking-tight text-stone-900 tabular-nums ${
                  treatment === 'minimal' ? 'text-3xl' : 'text-2xl'
                }`}
              >
                {formatValue(kpi.value, kpi.format, fmt)}
              </span>
            </Reveal>
            {kpi.delta && dataReady && (
              <DeltaText delta={kpi.delta} format={kpi.format} fmt={fmt} />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DeltaText({
  delta,
  format,
  fmt,
}: {
  delta: NonNullable<Kpi['delta']>;
  format: Kpi['format'];
  fmt: FormatOptions;
}) {
  const { arrow, text } = deltaParts(delta, format, fmt);
  return (
    <span
      className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${
        TONE_TEXT[delta.tone ?? 'neutral']
      }`}
    >
      {arrow && <span aria-hidden="true">{arrow}</span>}
      {text}
    </span>
  );
}

function DeltaPill({ kpi, fmt }: { kpi: Kpi; fmt: FormatOptions }) {
  if (!kpi.delta) return null;
  const tone = kpi.delta.tone ?? 'neutral';
  const { arrow, text } = deltaParts(kpi.delta, kpi.format, fmt);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ring-1 ring-inset ${TONE_CHIP[tone]}`}
    >
      {arrow && <span aria-hidden="true">{arrow}</span>}
      {text}
    </span>
  );
}

/* ── Bar chart body (flush) ───────────────────────────────────────────────── */

function ChartBodyView({
  body,
  fmt,
  ready,
  reduced,
}: {
  body: ChartBody;
  fmt: FormatOptions;
  ready: boolean;
  reduced: boolean;
}) {
  const caption = body.caption ?? `Bar chart of ${body.bars.length} values.`;

  if (!ready) {
    return (
      <div className="flex h-56 items-end gap-2" aria-hidden="true">
        {body.bars.map((bar, i) => (
          <div key={`${bar.label}-${i}`} className="flex-1">
            <Skeleton className="w-full rounded-md" style={{ height: `${30 + ((i * 37) % 60)}%` }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Fade reduced={reduced}>
      <figure className="m-0">
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={body.bars} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis
                tick={{ fontSize: 10, fill: '#a8a29e' }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v: number) => formatValue(v, body.format, fmt)}
              />
              <Tooltip
                cursor={{ fill: 'rgba(168,162,158,0.12)' }}
                formatter={(value: number | string | undefined) => [
                  formatValue(typeof value === 'number' ? value : 0, body.format, fmt),
                  'Value',
                ]}
                contentStyle={{
                  backgroundColor: '#1c1917',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 12,
                  padding: '6px 10px',
                }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ color: '#d6d3d1' }}
              />
              <Bar dataKey="value" radius={[5, 5, 0, 0]} isAnimationActive={!reduced} animationDuration={650}>
                {body.bars.map((bar, i) => (
                  <Cell key={`${bar.label}-${i}`} fill={bar.emphasis ? BAR_EMPHASIS : BAR_REST} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: unknown) => (typeof v === 'number' ? formatValue(v, body.format, fmt) : '')}
                  style={{ fontSize: 10, fill: '#78716c' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="sr-only">{caption}</figcaption>
      </figure>
    </Fade>
  );
}

/* ── Table loading state ──────────────────────────────────────────────────── */

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  const r = Math.min(Math.max(rows, 3), 7);
  const c = Math.min(Math.max(cols, 2), 6);
  return (
    <div aria-hidden="true">
      <div className="flex h-10 items-center gap-4 border-b border-stone-200 bg-stone-50 px-3">
        {Array.from({ length: c }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: r }).map((_, ri) => (
        <div key={ri} className="flex h-11 items-center gap-4 border-b border-stone-100 px-3">
          {Array.from({ length: c }).map((_, ci) => (
            <Skeleton key={ci} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Self-contained primitives ────────────────────────────────────────────── */

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`block animate-pulse rounded bg-stone-200/80 ${className}`} style={style} />;
}

function Reveal({ ready, skeleton, children }: { ready: boolean; skeleton: ReactNode; children: ReactNode }) {
  return <>{ready ? children : skeleton}</>;
}

function Fade({ reduced, children }: { reduced: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  if (reduced) return <>{children}</>;

  return (
    <div
      className={`transition-[opacity,transform] duration-500 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      }`}
    >
      {children}
    </div>
  );
}
