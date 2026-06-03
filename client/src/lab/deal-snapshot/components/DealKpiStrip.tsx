import { dealKpis } from '../dealTearSheetData';
import { useHydration, type HydrationMode } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';

interface DealKpiStripProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
}

export function DealKpiStrip({ mode, runId, delay = 0 }: DealKpiStripProps) {
  const { atLeast } = useHydration({ mode, runId, delay });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {dealKpis.map((kpi) => (
        <div
          key={kpi.id}
          className="flex flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
        >
          <div className="min-h-[2rem]">
            <Hydrate
              ready={atLeast('labels')}
              skeleton={<SkeletonText className="h-2.5 w-20" />}
            >
              <p className="text-xs font-medium leading-snug text-stone-500">{kpi.label}</p>
            </Hydrate>
          </div>

          <div className="mt-2">
            <Hydrate
              ready={atLeast('data')}
              skeleton={<SkeletonText className="h-6 w-16" />}
            >
              <span
                className={`text-xl font-semibold tracking-tight ${
                  kpi.positive ? 'text-emerald-600' : 'text-stone-900'
                }`}
              >
                {kpi.value}
              </span>
            </Hydrate>
          </div>

          <div className="mt-1 h-4">
            <Hydrate
              ready={atLeast('data')}
              skeleton={<SkeletonText className="h-2.5 w-24" />}
            >
              <span className="text-[11px] text-stone-400">{kpi.context}</span>
            </Hydrate>
          </div>
        </div>
      ))}
    </div>
  );
}
