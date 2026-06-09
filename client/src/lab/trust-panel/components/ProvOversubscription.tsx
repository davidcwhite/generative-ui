import { useHydration, type HydrationMode } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { Traceable } from '../Traceable';
import type { TraceWiring } from '../Traceable';

const COMPONENT_ID = 'oversubscription';

interface ProvProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
  trace: TraceWiring;
}

export function ProvOversubscription({ mode, runId, delay = 0, trace }: ProvProps) {
  const { atLeast } = useHydration({ mode, runId, delay });

  return (
    <div>
      <div className="min-h-[2rem]">
        <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-2.5 w-28" />}>
          <p className="text-xs font-medium text-stone-500">Oversubscription</p>
        </Hydrate>
      </div>

      <div className="mt-2">
        <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-9 w-24" />}>
          <Traceable componentId={COMPONENT_ID} citation="S1" {...trace}>
            <span className="text-3xl font-semibold tracking-tight text-stone-900">3.28x</span>
          </Traceable>
        </Hydrate>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          { label: 'Final book', value: '€4.10bn' },
          { label: 'Deal size', value: '€1.25bn' },
        ].map((item) => (
          <div key={item.label}>
            <dt className="text-[11px] uppercase tracking-wide text-stone-400">
              <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-2.5 w-14" />}>
                <span>{item.label}</span>
              </Hydrate>
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-stone-800">
              <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-3.5 w-16" />}>
                <span>{item.value}</span>
              </Hydrate>
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
}
