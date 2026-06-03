import { dealMeta } from '../dealTearSheetData';
import { useHydration, type HydrationMode } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';

interface DealHeaderProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
}

const CHIP = 'inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600';

export function DealHeader({ mode, runId, delay = 0 }: DealHeaderProps) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const d = dealMeta;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-h-[2.75rem] flex-1">
          <Hydrate
            ready={atLeast('labels')}
            skeleton={
              <div className="space-y-1.5">
                <SkeletonText className="h-2.5 w-24" />
                <SkeletonText className="h-5 w-56" />
                <SkeletonText className="h-2.5 w-40" />
              </div>
            }
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Deal snapshot
              </p>
              <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-stone-950">
                {d.issuer}
              </h2>
              <p className="text-sm text-stone-500">
                {d.bondName} · {d.isin}
              </p>
            </div>
          </Hydrate>
        </div>

        <Hydrate
          ready={atLeast('data')}
          skeleton={<SkeletonText className="h-6 w-20 rounded-full" />}
        >
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            {d.status}
          </span>
        </Hydrate>
      </div>

      <div className="mt-4 min-h-[1.75rem]">
        <Hydrate
          ready={atLeast('data')}
          skeleton={
            <div className="flex flex-wrap gap-2">
              {['w-16', 'w-12', 'w-28', 'w-16', 'w-24'].map((w, i) => (
                <SkeletonText key={i} className={`h-6 rounded-full ${w}`} />
              ))}
            </div>
          }
        >
          <div className="flex flex-wrap gap-2">
            <span className={CHIP}>{d.rating}</span>
            <span className={CHIP}>{d.currency}</span>
            <span className={CHIP}>{d.format}</span>
            <span className={`${CHIP} bg-emerald-50 text-emerald-700`}>{d.esg}</span>
            <span className={CHIP}>Priced {d.pricingDate}</span>
          </div>
        </Hydrate>
      </div>
    </div>
  );
}
