import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { useHydration } from '../../issuance-components/useHydration';
import { Hydrate, SkeletonText } from '../../issuance-components/Skeleton';
import { Card, CardEyebrow, CardSubtitle, CardTitle } from '../primitives/Card';
import { ChartFigure } from '../primitives/ChartFigure';
import { useReducedMotion } from '../useReducedMotion';
import { fmtBps, fmtCcyMm, fmtPct, fmtSignedBps } from '../format';
import type { IssuanceComponentProps } from '../types';
import type { PeerAnalysisData, PeerBond } from '../data/book';

type SortKey = 'zSpreadBps' | 'outstandingMm' | 'tradedMm' | 'changeBps';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'zSpreadBps', label: 'Z-spread' },
  { key: 'outstandingMm', label: 'Outstanding' },
  { key: 'tradedMm', label: 'Traded' },
  { key: 'changeBps', label: 'Δ 1d' },
];

function SortHeader({
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  column: { key: SortKey; label: string };
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === column.key;
  return (
    <th scope="col" className="pb-2 text-right font-medium" aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className="ml-auto flex items-center gap-1 rounded text-[11px] uppercase tracking-wide text-stone-400 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
      >
        {column.label}
        <span aria-hidden="true" className={active ? 'text-stone-700' : 'text-stone-300'}>
          {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}

export function PeerAnalysis({ data, mode, runId, delay = 0 }: IssuanceComponentProps<PeerAnalysisData>) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const reduced = useReducedMotion();
  const labelsReady = atLeast('labels');
  const dataReady = atLeast('data');

  const [sortKey, setSortKey] = useState<SortKey>('outstandingMm');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    const factor = sortDir === 'asc' ? 1 : -1;
    return [...data.peers].sort((a, b) => (a[sortKey] - b[sortKey]) * factor);
  }, [data.peers, sortKey, sortDir]);

  const maxTurnover = Math.max(...data.peers.map((p) => p.tradedMm / p.outstandingMm));
  const self = data.peers.filter((p) => p.isSelf);
  const others = data.peers.filter((p) => !p.isSelf);
  const caption = `Z-spread versus tenor for ${data.peers.length} ${data.sector} bonds; ${self.map((s) => s.issuer).join(' and ')} highlighted. Full data in the table below.`;

  return (
    <Card>
      <div className="min-h-[2.75rem]">
        <Hydrate
          ready={labelsReady}
          skeleton={
            <div className="space-y-1.5">
              <SkeletonText className="h-4 w-40" />
              <SkeletonText className="h-2.5 w-36" />
            </div>
          }
        >
          <div>
            <CardEyebrow>Peer Analysis</CardEyebrow>
            <CardTitle>{data.issuer}</CardTitle>
            <CardSubtitle>{data.benchmarkLabel}</CardSubtitle>
          </div>
        </Hydrate>
      </div>

      <div className="mt-3">
        {dataReady ? (
          <div className={reduced ? '' : 'lab-fade-in'}>
            <ChartFigure caption={caption} height={180}>
              <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis
                  type="number"
                  dataKey="tenorYears"
                  name="Tenor"
                  unit="y"
                  domain={[3, 8]}
                  tick={{ fontSize: 10, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="zSpreadBps"
                  name="Z-spread"
                  tick={{ fontSize: 10, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#1c1917', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff', padding: '6px 10px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#d6d3d1' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Scatter name="Peers" data={others} fill="#3b82f6" isAnimationActive={!reduced} />
                <Scatter name={`${data.issuer.split(' ')[0]} (self)`} data={self} fill="#1c1917" isAnimationActive={!reduced} />
              </ScatterChart>
            </ChartFigure>
          </div>
        ) : (
          <div className="h-44 rounded-lg border border-dashed border-stone-200" />
        )}
      </div>

      <div className="mt-3 overflow-x-auto border-t border-stone-100 pt-2">
        <table className="w-full text-sm">
          <caption className="sr-only">{data.sector} peer bonds by spread, outstanding, traded volume and one-day change.</caption>
          <thead>
            <tr className="border-b border-stone-100 text-left">
              <th scope="col" className="pb-2 text-[11px] font-medium uppercase tracking-wide text-stone-400">Bond</th>
              {COLUMNS.map((column) => (
                <SortHeader key={column.key} column={column} sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((peer: PeerBond) => {
              const turnover = peer.tradedMm / peer.outstandingMm;
              const barPct = Math.round((turnover / maxTurnover) * 100);
              return (
                <tr key={peer.id} className={`border-b border-stone-50 ${peer.isSelf ? 'bg-stone-50' : ''}`}>
                  <th scope="row" className="py-2 pr-2 text-left font-medium text-stone-900">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{peer.issuer}</span>
                      <span className="shrink-0 rounded bg-stone-100 px-1 text-[10px] font-medium text-stone-500">{peer.rating}</span>
                    </span>
                  </th>
                  <td className="py-2 text-right tabular-nums text-stone-700">{fmtBps(peer.zSpreadBps)}</td>
                  <td className="py-2 text-right tabular-nums text-stone-700">{fmtCcyMm(peer.outstandingMm)}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="tabular-nums text-stone-700">{fmtCcyMm(peer.tradedMm)}</span>
                      <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-stone-100 sm:block" aria-label={`Turnover ${fmtPct(turnover * 100)}`}>
                        <span
                          className={`block h-full rounded-full bg-blue-400 ${reduced ? '' : 'transition-[width] duration-700 ease-out'}`}
                          style={{ width: dataReady ? `${barPct}%` : '0%' }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className={`py-2 text-right tabular-nums ${peer.changeBps < 0 ? 'text-emerald-600' : peer.changeBps > 0 ? 'text-rose-600' : 'text-stone-500'}`}>
                    {peer.changeBps === 0 ? '0' : fmtSignedBps(peer.changeBps)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
