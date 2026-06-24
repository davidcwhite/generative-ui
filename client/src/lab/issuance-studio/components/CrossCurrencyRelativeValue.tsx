import { useHydration } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { Card, CardEyebrow, CardSubtitle, CardTitle } from '../primitives/Card';
import { useReducedMotion } from '../useReducedMotion';
import { fmtBps, fmtSpread } from '../format';
import type { IssuanceComponentProps } from '../types';
import type { CrossCurrencyRVData } from '../data/market';

const HOME_REF: Record<string, string> = {
  EUR: '€STR',
  USD: 'SOFR',
  GBP: 'SONIA',
};

export function CrossCurrencyRelativeValue({
  data,
  mode,
  runId,
  delay = 0,
}: IssuanceComponentProps<CrossCurrencyRVData>) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const reduced = useReducedMotion();
  const labelsReady = atLeast('labels');
  const dataReady = atLeast('data');

  const allIns = data.legs.map((l) => l.allInBps);
  const cheapest = data.legs.reduce((min, leg) => (leg.allInBps < min.allInBps ? leg : min), data.legs[0]);
  const minAllIn = Math.min(...allIns);
  const maxAllIn = Math.max(...allIns);
  const homeRef = HOME_REF[data.homeCurrency] ?? data.homeCurrency;

  // Scale within the [min, max] band (not from zero) so the few-bps spread is
  // legible: cheapest leg gets the shortest bar.
  const barFor = (allIn: number) =>
    maxAllIn === minAllIn ? 60 : Math.round(22 + ((allIn - minAllIn) / (maxAllIn - minAllIn)) * 78);

  return (
    <Card>
      <div className="min-h-[2.75rem]">
        <Hydrate
          ready={labelsReady}
          skeleton={
            <div className="space-y-1.5">
              <SkeletonText className="h-4 w-44" />
              <SkeletonText className="h-2.5 w-32" />
            </div>
          }
        >
          <div>
            <CardEyebrow>Cross-Currency Relative Value</CardEyebrow>
            <CardTitle>{data.issuer}</CardTitle>
            <CardSubtitle>
              {data.tenor} funding · all-in swapped to {data.homeCurrency}
            </CardSubtitle>
          </div>
        </Hydrate>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wide text-stone-400">
              <th scope="col" className="pb-2 font-medium">Ccy</th>
              <th scope="col" className="pb-2 font-medium">Ref</th>
              <th scope="col" className="pb-2 text-right font-medium">New issue</th>
              <th scope="col" className="pb-2 text-right font-medium">XCCY basis</th>
              <th scope="col" className="pb-2 text-right font-medium">All-in ({homeRef})</th>
            </tr>
          </thead>
          <tbody>
            {data.legs.map((leg) => {
              const isCheapest = leg.currency === cheapest.currency;
              const barPct = barFor(leg.allInBps);
              return (
                <tr
                  key={leg.currency}
                  className={`border-b border-stone-50 ${isCheapest ? 'bg-emerald-50/60' : ''}`}
                >
                  <th scope="row" className="py-2 pr-2 text-left font-medium text-stone-900">
                    <span className="flex items-center gap-1.5">
                      <span translate="no">{leg.currency}</span>
                      {isCheapest && dataReady && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          Cheapest
                        </span>
                      )}
                    </span>
                  </th>
                  <td className="py-2 text-stone-500" translate="no">{leg.refRate}</td>
                  <td className="py-2 text-right tabular-nums text-stone-700">
                    <Hydrate ready={dataReady} skeleton={<SkeletonText className="ml-auto h-3 w-12" />}>
                      <span>{fmtSpread(leg.newIssueSpreadBps)}</span>
                    </Hydrate>
                  </td>
                  <td className="py-2 text-right tabular-nums text-stone-700">
                    <Hydrate ready={dataReady} skeleton={<SkeletonText className="ml-auto h-3 w-12" />}>
                      <span>{fmtSpread(leg.xccyBasisBps)}</span>
                    </Hydrate>
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <Hydrate ready={dataReady} skeleton={<SkeletonText className="ml-auto h-3 w-14" />}>
                      <div className="flex items-center justify-end gap-2">
                        <span className={`tabular-nums font-semibold ${isCheapest ? 'text-emerald-700' : 'text-stone-900'}`}>
                          {fmtBps(leg.allInBps)}
                        </span>
                        <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-stone-100 sm:block">
                          <span
                            className={`block h-full rounded-full ${isCheapest ? 'bg-emerald-500' : 'bg-stone-400'} ${reduced ? '' : 'transition-[width] duration-700 ease-out'}`}
                            style={{ width: dataReady ? `${barPct}%` : '0%' }}
                          />
                        </span>
                      </div>
                    </Hydrate>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-stone-500 text-pretty">
        <Hydrate ready={dataReady} skeleton={<SkeletonText className="h-3 w-full" />}>
          <span>
            <span className="font-medium text-stone-700" translate="no">{cheapest.currency}</span> is cheapest at{' '}
            <span className="tabular-nums font-medium text-stone-700">{fmtBps(cheapest.allInBps)}</span> all-in after the basis swap.
          </span>
        </Hydrate>
      </p>
    </Card>
  );
}
