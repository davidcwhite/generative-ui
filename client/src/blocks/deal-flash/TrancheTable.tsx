import type { DealFlashTranche } from '../contract';
import type { Currency } from '../data/model';

const dash = (value: number | null, suffix = '') =>
  value === null ? <span className="text-stone-300">—</span> : `${value.toLocaleString()}${suffix}`;

/** Tranches of one deal. Selecting a row promotes it into the pricing ladder. */
export function TrancheTable({
  tranches,
  currency,
  focusId,
  onFocus,
}: {
  tranches: DealFlashTranche[];
  currency: Currency;
  focusId: string;
  onFocus: (trancheId: string) => void;
}) {
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
          <th scope="col" className="py-2 text-left">
            Tranche
          </th>
          <th scope="col" className="py-2 text-left">
            Format
          </th>
          <th scope="col" className="py-2 text-right">
            Size ({currency}m)
          </th>
          <th scope="col" className="py-2 text-right">
            Coupon
          </th>
          <th scope="col" className="py-2 text-right">
            IPT
          </th>
          <th scope="col" className="py-2 text-right">
            Reoffer
          </th>
          <th scope="col" className="py-2 text-right">
            NIP
          </th>
          <th scope="col" className="py-2 text-right">
            Cover
          </th>
        </tr>
      </thead>
      <tbody>
        {tranches.map((tranche) => {
          const focused = tranche.id === focusId;
          const ipt = tranche.stages.find((stage) => stage.label === 'IPT')?.spread ?? null;
          return (
            <tr
              key={tranche.id}
              onClick={() => onFocus(tranche.id)}
              aria-selected={focused}
              className={`cursor-pointer border-b border-stone-100 transition-colors ${
                focused ? 'bg-stone-100/70' : 'hover:bg-stone-50'
              }`}
            >
              <td className="py-2.5 font-medium text-stone-900">
                {tranche.key} · {tranche.tenorLabel}
              </td>
              <td className="py-2.5 text-stone-500">{tranche.format}</td>
              <td className="py-2.5 text-right tabular-nums text-stone-600">
                {dash(tranche.sizeMm)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-stone-600">
                {tranche.coupon === null ? (
                  <span className="text-stone-300">—</span>
                ) : (
                  `${tranche.coupon}%`
                )}
              </td>
              <td className="py-2.5 text-right tabular-nums text-stone-500">{dash(ipt)}</td>
              <td className="py-2.5 text-right font-medium tabular-nums text-stone-900">
                {dash(tranche.reofferSpread)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-stone-600">
                {dash(tranche.nipBp)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-stone-600">
                {dash(tranche.coverage, 'x')}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
