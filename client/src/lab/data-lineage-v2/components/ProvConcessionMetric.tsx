import { useHydration, type HydrationMode } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { Traceable } from '../Traceable';
import type { TraceWiring } from '../DataLineageV2LabView';

const COMPONENT_ID = 'concession-vs-sector';

interface ProvProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
  trace: TraceWiring;
}

export function ProvConcessionMetric({ mode, runId, delay = 0, trace }: ProvProps) {
  const { atLeast } = useHydration({ mode, runId, delay });

  return (
    <div>
      <div className="min-h-[2.25rem]">
        <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-3 w-44" />}>
          <div>
            <p className="text-sm font-semibold text-stone-900">New issue concession vs sector</p>
            <p className="mt-0.5 text-xs text-stone-500">Pricing premium vs fair value and peers</p>
          </div>
        </Hydrate>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-9 w-20" />}>
          <Traceable componentId={COMPONENT_ID} citation="S1" {...trace}>
            <span className="text-3xl font-semibold tracking-tight text-stone-900">7 bps</span>
          </Traceable>
        </Hydrate>
        <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-4 w-24" />}>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            -2 bps vs sector
          </span>
        </Hydrate>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          { label: 'Modelled fair value', value: '+81 bps' },
          { label: 'Sector average', value: '9 bps' },
        ].map((item) => (
          <div key={item.label}>
            <dt className="text-[11px] uppercase tracking-wide text-stone-400">
              <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-2.5 w-20" />}>
                <span>{item.label}</span>
              </Hydrate>
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-stone-800">
              <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-3.5 w-14" />}>
                <span>{item.value}</span>
              </Hydrate>
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
}
