import type { ReactNode } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, CircleAlert } from 'lucide-react';
import type {
  DashboardMetric,
  DealRow,
  InvestorMixPoint,
  IssuancePoint,
  PipelineDeal,
  RelativeValuePoint,
} from './data';

export function DashboardPanel({
  title,
  description,
  action,
  children,
  className = '',
  contentClassName = '',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={`dashboard-panel ${className}`}>
      <header className="flex min-h-14 items-start justify-between gap-4 border-b border-stone-200 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-stone-900">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-5 text-stone-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

function DeltaIcon({ tone }: { tone?: DashboardMetric['tone'] }) {
  if (tone === 'positive') {
    return <ArrowDownRight className="h-3 w-3" aria-hidden />;
  }
  if (tone === 'negative') {
    return <ArrowUpRight className="h-3 w-3" aria-hidden />;
  }
  return null;
}

export function MetricStrip({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section aria-label="Market snapshot" className="dash-metric-strip">
      {metrics.map((metric) => (
        <div key={metric.label} className="dash-metric">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-stone-400">
            {metric.label}
          </p>
          <p className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-stone-950">
            {metric.value}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
            <span className="text-stone-500">{metric.detail}</span>
            {metric.delta && (
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${
                  metric.tone === 'positive'
                    ? 'text-emerald-700'
                    : metric.tone === 'negative'
                      ? 'text-rose-700'
                      : 'text-stone-600'
                }`}
              >
                <DeltaIcon tone={metric.tone} />
                {metric.delta}
              </span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export function VolumeTrendChart({
  data,
  compact = false,
}: {
  data: IssuancePoint[];
  compact?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label="Monthly EUR investment-grade issuance volume and average new issue premium"
      className={compact ? 'h-[220px]' : 'h-[280px]'}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 6, bottom: 2, left: -18 }}>
          <defs>
            <linearGradient id="dashVolumeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#57534e" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#57534e" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e7e5e4" strokeDasharray="2 4" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#78716c', fontSize: 10 }}
            dy={7}
          />
          <YAxis
            yAxisId="volume"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#a8a29e', fontSize: 10 }}
            tickFormatter={(value) => `€${value}bn`}
          />
          <YAxis yAxisId="nip" hide orientation="right" domain={[0, 14]} />
          <Tooltip
            cursor={{ stroke: '#d6d3d1', strokeWidth: 1 }}
            contentStyle={{
              border: '1px solid #e7e5e4',
              borderRadius: 10,
              boxShadow: 'none',
              color: '#292524',
              fontSize: 11,
            }}
            formatter={(value, name) => [
              name === 'Volume' ? `€${value}bn` : `${value}bp`,
              name,
            ]}
          />
          <Area
            yAxisId="volume"
            type="monotone"
            dataKey="volume"
            name="Volume"
            stroke="#57534e"
            strokeWidth={1.6}
            fill="url(#dashVolumeFill)"
            animationDuration={500}
          />
          <Line
            yAxisId="nip"
            type="monotone"
            dataKey="avgNip"
            name="Average NIP"
            stroke="#2563eb"
            strokeWidth={1.8}
            dot={false}
            activeDot={{ r: 3, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
            animationDuration={500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RelativeValueChart({ data }: { data: RelativeValuePoint[] }) {
  return (
    <div
      role="img"
      aria-label="Automobile peer five-year and seven-year spread comparison"
      className="h-[260px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
          barCategoryGap={10}
        >
          <CartesianGrid horizontal={false} stroke="#e7e5e4" strokeDasharray="2 4" />
          <XAxis
            type="number"
            domain={[0, 140]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#a8a29e', fontSize: 10 }}
            tickFormatter={(value) => `${value}bp`}
          />
          <YAxis
            type="category"
            dataKey="issuer"
            width={72}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#57534e', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: '#fafaf9' }}
            contentStyle={{
              border: '1px solid #e7e5e4',
              borderRadius: 10,
              boxShadow: 'none',
              color: '#292524',
              fontSize: 11,
            }}
            formatter={(value, name) => [`${value}bp`, name]}
          />
          <ReferenceLine x={100} stroke="#d6d3d1" strokeDasharray="3 3" />
          <Bar
            dataKey="fiveYear"
            name="5Y"
            fill="#44403c"
            radius={[0, 3, 3, 0]}
            maxBarSize={9}
          />
          <Bar
            dataKey="sevenYear"
            name="7Y"
            fill="#a8a29e"
            radius={[0, 3, 3, 0]}
            maxBarSize={9}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InvestorMix({ data }: { data: InvestorMixPoint[] }) {
  return (
    <div className="space-y-4" aria-label="Investor allocation mix">
      {data.map((item, index) => (
        <div key={item.name}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-stone-600">{item.name}</span>
            <span className="font-medium tabular-nums text-stone-900">{item.value}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div
              className={`h-full rounded-full ${index === 0 ? 'bg-stone-800' : 'bg-stone-400'}`}
              style={{ width: `${item.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function confidenceClass(confidence: PipelineDeal['confidence']) {
  if (confidence === 'High') return 'bg-emerald-50 text-emerald-700';
  if (confidence === 'Medium') return 'bg-amber-50 text-amber-700';
  return 'bg-stone-100 text-stone-600';
}

export function PipelineList({ data }: { data: PipelineDeal[] }) {
  return (
    <ul className="divide-y divide-stone-100">
      {data.map((deal) => (
        <li key={deal.id} className="px-4 py-3.5 transition-colors hover:bg-stone-50/70 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-stone-900">{deal.issuer}</p>
                <span className="text-[10px] text-stone-400">{deal.rating}</span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {deal.tenor} · {deal.expectedSize} · {deal.timing}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${confidenceClass(deal.confidence)}`}
            >
              {deal.confidence}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StatusPill({ status }: { status: DealRow['status'] }) {
  const className =
    status === 'Live'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'Monitoring'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-stone-100 text-stone-600';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}>
      {status}
    </span>
  );
}

export function RecentDealsTable({ data, limit = 6 }: { data: DealRow[]; limit?: number }) {
  const rows = data.slice(0, limit);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
            <th className="px-4 py-2.5 sm:px-5">Status</th>
            <th className="px-3 py-2.5">Issuer</th>
            <th className="px-3 py-2.5">Rating</th>
            <th className="px-3 py-2.5 text-right">Size</th>
            <th className="px-3 py-2.5 text-right">Spread</th>
            <th className="px-3 py-2.5 text-right">NIP</th>
            <th className="px-4 py-2.5 text-right sm:px-5">Book</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((deal) => (
            <tr key={deal.id} className="transition-colors hover:bg-stone-50">
              <td className="px-4 py-3 sm:px-5">
                <StatusPill status={deal.status} />
              </td>
              <td className="px-3 py-3">
                <p className="font-medium text-stone-900">{deal.issuer}</p>
                <p className="mt-0.5 text-[10px] text-stone-400">
                  {deal.currency} · {deal.tenor}
                </p>
              </td>
              <td className="px-3 py-3 text-stone-500">{deal.rating}</td>
              <td className="px-3 py-3 text-right tabular-nums text-stone-600">
                {deal.currency} {deal.size.toLocaleString()}m
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-stone-600">
                {deal.spread}bp
              </td>
              <td className="px-3 py-3 text-right font-medium tabular-nums text-stone-800">
                {deal.nip}bp
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-stone-600 sm:px-5">
                {deal.book ? `€${(deal.book / 1000).toFixed(1)}bn` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1500px] animate-pulse px-4 py-6 lg:px-6">
      <div className="grid grid-cols-2 border-y border-stone-200 bg-white lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="border-stone-200 p-5 lg:border-r last:border-r-0">
            <div className="h-2.5 w-20 rounded bg-stone-100" />
            <div className="mt-4 h-7 w-28 rounded bg-stone-200" />
            <div className="mt-3 h-2.5 w-36 rounded bg-stone-100" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="h-80 rounded-xl border border-stone-200 bg-white lg:col-span-8" />
        <div className="h-80 rounded-xl border border-stone-200 bg-white lg:col-span-4" />
      </div>
    </div>
  );
}

export function DashboardError({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[28rem] max-w-xl flex-col items-center justify-center px-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <CircleAlert className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-stone-900">Dashboard unavailable</h2>
      <p className="mt-1 text-sm leading-6 text-stone-500">{message}</p>
    </div>
  );
}
