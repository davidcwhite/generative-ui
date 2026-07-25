import type { PricingStage } from '../contract';

/**
 * The pricing ladder: initial price thoughts, guidance, reoffer.
 *
 * A progress indicator rather than a chart, because that is what it is — a
 * deal moves down these rungs in order, and how far it has got is as much of
 * the answer as the numbers themselves. Stages the deal hasn't reached are
 * drawn hollow and left blank, so a live deal reads as in-flight instead of
 * broken, and nothing on screen implies a price that doesn't exist yet.
 */
export function PricingLadder({
  stages,
  compressionBp,
  size = 'full',
}: {
  stages: PricingStage[];
  compressionBp: number | null;
  size?: 'full' | 'compact';
}) {
  const compact = size === 'compact';
  const lastReached = stages.reduce(
    (last, stage, index) => (stage.reached ? index : last),
    -1,
  );
  // Rail spans dot-centre to dot-centre, so it insets by half a column each side.
  const inset = 100 / (stages.length * 2);
  const progress = lastReached <= 0 ? 0 : (lastReached / (stages.length - 1)) * 100;

  return (
    <div>
      <div className="relative">
        <div
          className="absolute top-[5px] h-px bg-stone-200"
          style={{ left: `${inset}%`, right: `${inset}%` }}
          aria-hidden
        />
        <div
          className="absolute top-[5px] h-px bg-stone-900 transition-[width] duration-500"
          style={{ left: `${inset}%`, width: `calc((100% - ${inset * 2}%) * ${progress / 100})` }}
          aria-hidden
        />

        <ol className="relative flex">
          {stages.map((stage) => (
            <li key={stage.label} className="flex flex-1 flex-col items-center">
              <span
                className={`h-[11px] w-[11px] rounded-full border-2 bg-white ${
                  stage.reached ? 'border-stone-900 bg-stone-900' : 'border-stone-300'
                }`}
                aria-hidden
              />
              <span
                className={`mt-2 font-semibold uppercase tracking-[0.12em] ${
                  compact ? 'text-[9px]' : 'text-[10px]'
                } ${stage.reached ? 'text-stone-500' : 'text-stone-300'}`}
              >
                {stage.label}
              </span>
              <span
                className={`mt-0.5 font-semibold tabular-nums ${compact ? 'text-xs' : 'text-sm'} ${
                  stage.reached ? 'text-stone-900' : 'text-stone-300'
                }`}
              >
                {stage.spread === null ? '—' : `${stage.spread}bp`}
                <span className="sr-only">
                  {stage.reached ? '' : ' not yet reached'}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {compressionBp !== null && (
        <p
          className={`mt-3 text-center text-stone-500 ${compact ? 'text-[10px]' : 'text-[11px]'}`}
        >
          <span className="font-medium text-emerald-600">−{compressionBp}bp</span> from IPT to
          reoffer
        </p>
      )}
    </div>
  );
}
