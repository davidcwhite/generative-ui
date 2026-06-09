import { useHydration, type HydrationMode } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { Traceable, type TraceWiring } from '../Traceable';

const COMPONENT_ID = 'spread-tightening';

interface ProvProps {
  mode: HydrationMode;
  runId: number;
  delay?: number;
  trace: TraceWiring;
}

const STAGES = [
  { label: 'IPT', value: '+120 area' },
  { label: 'Guidance', value: '+95 (±3)' },
  { label: 'Launch', value: '+88' },
];

export function ProvSpreadTightening({ mode, runId, delay = 0, trace }: ProvProps) {
  const { atLeast } = useHydration({ mode, runId, delay });

  return (
    <div>
      <div className="min-h-[2.25rem]">
        <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-3 w-36" />}>
          <div>
            <p className="text-sm font-semibold text-stone-900">Spread tightening</p>
            <p className="mt-0.5 text-xs text-stone-500">IPT to launch through execution</p>
          </div>
        </Hydrate>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-9 w-24" />}>
          <Traceable componentId={COMPONENT_ID} citation="S1" {...trace}>
            <span className="text-3xl font-semibold tracking-tight text-stone-900">32 bps</span>
          </Traceable>
        </Hydrate>
        <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-4 w-20" />}>
          <span className="text-xs text-stone-400">tighter vs IPT</span>
        </Hydrate>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {STAGES.map((stage, i) => (
          <div key={stage.label} className="flex flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
              <dt className="text-[11px] uppercase tracking-wide text-stone-400">
                <Hydrate ready={atLeast('labels')} skeleton={<SkeletonText className="h-2.5 w-10" />}>
                  <span>{stage.label}</span>
                </Hydrate>
              </dt>
              <dd className="mt-0.5 whitespace-nowrap text-sm font-medium text-stone-800">
                <Hydrate ready={atLeast('data')} skeleton={<SkeletonText className="h-3.5 w-12" />}>
                  <span>{stage.value}</span>
                </Hydrate>
              </dd>
            </div>
            {i < STAGES.length - 1 && (
              <span className="shrink-0 text-stone-300" aria-hidden>
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
