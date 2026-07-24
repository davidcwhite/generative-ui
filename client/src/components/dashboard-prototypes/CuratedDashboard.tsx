import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import {
  DashboardError,
  DashboardLoading,
  DashboardPanel,
  InvestorMix,
  MetricStrip,
  PipelineList,
  RecentDealsTable,
  RelativeValueChart,
  VolumeTrendChart,
} from './shared';
import { useDashboardData } from './useDashboardData';

type Range = '3M' | '6M' | '12M';

export default function CuratedDashboard({
  onOpenWorkbench,
}: {
  onOpenWorkbench?: () => void;
}) {
  const { data, isPending, error } = useDashboardData();
  const [range, setRange] = useState<Range>('12M');

  const trend = useMemo(() => {
    if (!data) return [];
    const count = range === '3M' ? 3 : range === '6M' ? 6 : 12;
    return data.issuance.slice(-count);
  }, [data, range]);

  if (isPending) return <DashboardLoading />;
  if (error || !data) {
    return <DashboardError message={error?.message ?? 'No market data returned.'} />;
  }

  return (
    <div className="dashboard-canvas mx-auto w-full max-w-[1500px] px-4 py-5 lg:px-6 lg:py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            Syndicate overview
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-stone-950">
            EUR investment-grade market
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            A decision-first view of supply, execution and relative value.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-[11px] text-stone-500">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          As of {data.asOf}
        </div>
      </div>

      <MetricStrip metrics={data.metrics} />

      <div className="dash-layout mt-4">
        <DashboardPanel
          title="Primary market activity"
          description="Monthly EUR IG supply with average new issue premium"
          className="dash-span-8"
          contentClassName="px-3 pb-2 pt-1 sm:px-5"
          action={
            <div className="inline-flex rounded-lg bg-stone-100 p-0.5" aria-label="Chart range">
              {(['3M', '6M', '12M'] as Range[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRange(item)}
                  aria-pressed={range === item}
                  className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                    range === item
                      ? 'bg-white text-stone-900 ring-1 ring-stone-200'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          }
        >
          <VolumeTrendChart data={trend} />
        </DashboardPanel>

        <DashboardPanel
          title="Forward pipeline"
          description="Likely transactions over the next four sessions"
          className="dash-span-4"
          contentClassName="pb-1"
          action={
            <span className="text-[10px] font-medium text-stone-400">4 expected</span>
          }
        >
          <PipelineList data={data.pipeline} />
        </DashboardPanel>

        <DashboardPanel
          title="Automobiles relative value"
          description="Indicative asset-swap spreads by tenor"
          className="dash-span-7"
          contentClassName="px-3 pb-2 pt-2 sm:px-5"
          action={
            <div className="flex items-center gap-3 text-[10px] text-stone-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-700" />
                5Y
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                7Y
              </span>
            </div>
          }
        >
          <RelativeValueChart data={data.relativeValue} />
        </DashboardPanel>

        <DashboardPanel
          title="Investor mix"
          description="Average allocation across the latest ten benchmark deals"
          className="dash-span-5"
          contentClassName="px-5 py-5"
        >
          <InvestorMix data={data.investorMix} />
          <div className="mt-6 border-t border-stone-100 pt-4">
            <p className="text-xs leading-5 text-stone-500">
              Long-only demand is carrying the market. Asset managers and insurers
              account for <span className="font-medium text-stone-800">70%</span> of
              allocated books, reducing execution sensitivity to fast-money orders.
            </p>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recent and live deals"
          description="Execution snapshot across the most relevant transactions"
          className="dash-span-12"
          action={
            <button
              type="button"
              onClick={onOpenWorkbench}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            >
              Open data workbench
              <ArrowRight className="h-3 w-3" aria-hidden />
            </button>
          }
        >
          <RecentDealsTable data={data.deals} />
        </DashboardPanel>
      </div>
    </div>
  );
}
