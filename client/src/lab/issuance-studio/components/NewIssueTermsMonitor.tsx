import { useHydration } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { Card, CardEyebrow, CardSubtitle, CardTitle } from '../primitives/Card';
import { MetricStat } from '../primitives/MetricStat';
import { useReducedMotion } from '../useReducedMotion';
import { fmtBps, fmtMult, fmtSignedBps, fmtSpread } from '../format';
import type { IssuanceComponentProps } from '../types';
import type { NewIssueTermsData, PriceStage } from '../data/deal';

const ORDER: PriceStage['stage'][] = ['ipt', 'guidance', 'launch', 'priced'];

/** Representative bps for a stage: explicit point, else band midpoint. */
function rep(stage: PriceStage): number | null {
  if (stage.pointBps != null) return stage.pointBps;
  if (stage.lowBps != null && stage.highBps != null) return (stage.lowBps + stage.highBps) / 2;
  return null;
}

function Stepper({ stages, current }: { stages: PriceStage[]; current: PriceStage['stage'] }) {
  const currentIndex = ORDER.indexOf(current);
  return (
    <ol className="flex items-center gap-1.5">
      {stages.map((stage) => {
        const index = ORDER.indexOf(stage.stage);
        const done = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={stage.stage} className="flex items-center gap-1.5" aria-current={isCurrent ? 'step' : undefined}>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isCurrent
                  ? 'bg-stone-900 text-white'
                  : done
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                    : 'bg-stone-100 text-stone-400'
              }`}
            >
              {stage.label}
            </span>
            {index < ORDER.length - 1 && <span className="text-stone-300" aria-hidden="true">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

function RangeBar({ stages, reduced, ready }: { stages: PriceStage[]; reduced: boolean; ready: boolean }) {
  const reps = stages.map((s) => ({ stage: s, value: rep(s) })).filter((r): r is { stage: PriceStage; value: number } => r.value != null);
  if (reps.length < 2) return null;

  const values = reps.map((r) => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(2, (max - min) * 0.15);
  const lo = min - pad;
  const hi = max + pad;
  const pos = (v: number) => ((v - lo) / (hi - lo)) * 100;

  // Compression journey: from the widest (IPT) rep to the current/tightest.
  const first = reps[0].value;
  const lastRep = reps[reps.length - 1].value;
  const fillLeft = Math.min(pos(first), pos(lastRep));
  const fillWidth = Math.abs(pos(first) - pos(lastRep));

  return (
    <div className="mt-1">
      <div className="relative h-2 w-full rounded-full bg-stone-100">
        <div
          className={`absolute top-0 h-full rounded-full bg-emerald-400/70 ${reduced ? '' : 'transition-all duration-700 ease-out'}`}
          style={{ left: `${fillLeft}%`, width: ready ? `${fillWidth}%` : '0%' }}
        />
        {reps.map((r) => (
          <span
            key={r.stage.stage}
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-stone-700 shadow-sm"
            style={{ left: `${pos(r.value)}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-stone-400">
        <span>{fmtBps(max)} (wide)</span>
        <span>{fmtBps(min)} (tight)</span>
      </div>
    </div>
  );
}

export function NewIssueTermsMonitor({
  data,
  mode,
  runId,
  delay = 0,
}: IssuanceComponentProps<NewIssueTermsData>) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const reduced = useReducedMotion();
  const labelsReady = atLeast('labels');
  const dataReady = atLeast('data');

  const currentStage = data.stages.find((s) => s.stage === data.currentStage);
  const currentRep = currentStage ? rep(currentStage) : null;

  return (
    <Card>
      <div className="min-h-[2.75rem]">
        <Hydrate
          ready={labelsReady}
          skeleton={
            <div className="space-y-1.5">
              <SkeletonText className="h-4 w-44" />
              <SkeletonText className="h-2.5 w-20" />
            </div>
          }
        >
          <div>
            <CardEyebrow>New Issue Terms</CardEyebrow>
            <CardTitle>{data.bondName}</CardTitle>
            <CardSubtitle>Spread {data.benchmark}</CardSubtitle>
          </div>
        </Hydrate>
      </div>

      <div className="mt-3">
        <Hydrate ready={labelsReady} skeleton={<SkeletonText className="h-6 w-60 rounded-full" />}>
          <Stepper stages={data.stages} current={data.currentStage} />
        </Hydrate>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
            {data.currentStage === 'priced' ? 'Priced at' : 'Current level'}
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <Hydrate ready={dataReady} skeleton={<SkeletonText className="h-7 w-24" />}>
              <span className="text-2xl font-semibold tabular-nums tracking-tight text-stone-900">
                {currentRep == null ? '—' : fmtSpread(currentRep)}
              </span>
            </Hydrate>
            <Hydrate ready={dataReady} skeleton={<SkeletonText className="h-4 w-20" />}>
              <span className="text-sm font-medium tabular-nums text-emerald-600">
                {fmtSignedBps(data.tighteningBps)} from IPT
              </span>
            </Hydrate>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {dataReady ? (
          <RangeBar stages={data.stages} reduced={reduced} ready={dataReady} />
        ) : (
          <SkeletonText className="h-2 w-full rounded-full" />
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-x-4 border-t border-stone-100 pt-3">
        <MetricStat
          label="New issue concession"
          value={data.newIssueConcessionBps == null ? 'Pending' : fmtBps(data.newIssueConcessionBps)}
          size="sm"
          labelReady={labelsReady}
          valueReady={dataReady}
        />
        <MetricStat label="Book at launch" value={fmtMult(data.bookCoverageAtLaunch)} size="sm" labelReady={labelsReady} valueReady={dataReady} />
        <MetricStat label="Price moves" value={String(data.priceProgressions)} size="sm" labelReady={labelsReady} valueReady={dataReady} />
      </dl>
    </Card>
  );
}
