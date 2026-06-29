/**
 * GenericComponent — a single renderer for the agent↔frontend contract in
 * `contract.ts`. KPI strip on top, one tagged body (bar chart or rich table)
 * beneath, inside a card shell.
 *
 * Portability:
 *  - Dependencies: React, Recharts, Tailwind CSS. No project-internal imports.
 *  - Progressive hydration is OPTIONAL via the `reveal` prop. Omit it and the
 *    component renders fully (e.g. `reveal={{ labels: true, data: true }}` is
 *    the implicit default). A host app can wire its own staged reveal in.
 *  - Reduced motion is honoured automatically; override with `reducedMotion`.
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
import {
  isGenericComponentPayload,
  type ChartBody,
  type GenericComponentPayload,
  type Kpi,
  type Tone,
} from './contract';
import { formatValue, type FormatOptions } from './formatValue';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { AgGridTable } from './AgGridTable';

export interface GenericComponentProps {
  payload: GenericComponentPayload;
  /**
   * Optional staged reveal. `labels` gates titles/labels, `data` gates values,
   * bars and rows. Omit for a fully-rendered component.
   */
  reveal?: { labels: boolean; data: boolean };
  /** Force-disable motion. Defaults to the user's prefers-reduced-motion setting. */
  reducedMotion?: boolean;
  /** Locale for number formatting. Defaults to the runtime locale. */
  locale?: string;
  className?: string;
}

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

const BAR_REST = '#d6d3d1'; // stone-300
const BAR_EMPHASIS = '#292524'; // stone-800

export function GenericComponent({
  payload,
  reveal,
  reducedMotion,
  locale,
  className = '',
}: GenericComponentProps) {
  const prefersReduced = usePrefersReducedMotion();
  const reduced = reducedMotion ?? prefersReduced;

  const labelsReady = reveal ? reveal.labels : true;
  const dataReady = reveal ? reveal.data : true;

  // Guard untrusted payloads: render a calm empty state, never crash.
  if (!isGenericComponentPayload(payload)) {
    return (
      <Card className={className}>
        <p className="text-sm text-stone-500">No data to display.</p>
      </Card>
    );
  }

  const fmt: FormatOptions = { locale, currency: payload.currency };
  const hasKpis = Array.isArray(payload.kpis) && payload.kpis.length > 0;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header + KPIs stand on their own, above the body card. */}
      <div>
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

        {hasKpis && (
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {payload.kpis!.map((kpi, i) => (
              <KpiStat key={`${kpi.label}-${i}`} kpi={kpi} fmt={fmt} labelsReady={labelsReady} dataReady={dataReady} />
            ))}
          </dl>
        )}
      </div>

      {/* The body — chart or table — is the only thing inside the card. */}
      <Card className={payload.body.type === 'table' ? 'overflow-hidden p-0' : ''}>
        {payload.body.type === 'chart' ? (
          <BarBody body={payload.body} fmt={fmt} ready={dataReady} reduced={reduced} />
        ) : dataReady ? (
          <Fade reduced={reduced}>
            <AgGridTable body={payload.body} fmt={fmt} reduced={reduced} />
          </Fade>
        ) : (
          <TableSkeleton rows={payload.body.rows.length || 5} cols={payload.body.columns.length || 4} />
        )}
      </Card>
    </div>
  );
}

/* ── KPI ──────────────────────────────────────────────────────────────────── */

function KpiStat({
  kpi,
  fmt,
  labelsReady,
  dataReady,
}: {
  kpi: Kpi;
  fmt: FormatOptions;
  labelsReady: boolean;
  dataReady: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
        <Reveal ready={labelsReady} skeleton={<Skeleton className="h-2.5 w-14" />}>
          <span className="block truncate">{kpi.label}</span>
        </Reveal>
      </dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <Reveal ready={dataReady} skeleton={<Skeleton className="h-6 w-20" />}>
          <span className="min-w-0 truncate text-lg font-semibold tabular-nums tracking-tight text-stone-900">
            {formatValue(kpi.value, kpi.format, fmt)}
          </span>
        </Reveal>
        {kpi.delta && dataReady && (
          <span className={`text-xs font-medium tabular-nums ${TONE_TEXT[kpi.delta.tone ?? 'neutral']}`}>
            {formatValue(kpi.delta.value, kpi.format, fmt)}
          </span>
        )}
      </dd>
    </div>
  );
}

/* ── Bar chart body ───────────────────────────────────────────────────────── */

function BarBody({
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
  const caption =
    body.caption ?? `Bar chart of ${body.bars.length} values.`;

  if (!ready) {
    return (
      <div className="flex h-52 items-end gap-2" aria-hidden="true">
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
        <div style={{ height: 208 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={body.bars} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#a8a29e' }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
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
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#fff',
                  padding: '6px 10px',
                }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ color: '#d6d3d1' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={!reduced} animationDuration={700}>
                {body.bars.map((bar, i) => (
                  <Cell key={`${bar.label}-${i}`} fill={bar.emphasis ? BAR_EMPHASIS : BAR_REST} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: unknown) =>
                    typeof v === 'number' ? formatValue(v, body.format, fmt) : ''
                  }
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

/** Header + row placeholders shown before the grid hydrates; matches its rhythm. */
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

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <article className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </article>
  );
}

/** Skeleton placeholder using core Tailwind `animate-pulse` (no custom CSS). */
function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`block animate-pulse rounded bg-stone-200/80 ${className}`} style={style} />;
}

/** Swap skeleton → content once `ready`. Keeps layout stable during hydration. */
function Reveal({ ready, skeleton, children }: { ready: boolean; skeleton: ReactNode; children: ReactNode }) {
  return <>{ready ? children : skeleton}</>;
}

/** One-shot opacity/transform fade-in, skipped under reduced motion. */
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
