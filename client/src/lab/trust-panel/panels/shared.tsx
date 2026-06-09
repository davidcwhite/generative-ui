import type {
  AssetDescriptor,
  ComponentLineage,
  DataSource,
  UnderlyingTable,
} from '../../data-lineage-v2/lineageData';
import { TIER_LABEL } from '../../data-lineage-v2/lineageData';

/** Props common to both trust-panel designs. */
export interface TrustPanelProps {
  lineage: ComponentLineage;
  assets: AssetDescriptor[];
  activeId: string;
  onSelectAsset: (id: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

/**
 * Index of the query step that produces the headline figure: prefer the step
 * whose emphasised row carries the headline value, else the last step with an
 * emphasised row, else the final step.
 */
export function resultStepIndex(lineage: ComponentLineage): number {
  const headline = lineage.results.find((r) => r.emphasis) ?? lineage.results[0];
  const steps = lineage.steps;
  const byValue = steps.findIndex((s) =>
    s.table.rows.some((r) => r.emphasis && r.cells.some((c) => String(c) === headline?.value)),
  );
  if (byValue >= 0) return byValue;
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    if (steps[i].table.rows.some((r) => r.emphasis)) return i;
  }
  return steps.length - 1;
}

const TIER_DOT: Record<1 | 2 | 3, string> = {
  1: 'bg-emerald-500',
  2: 'bg-amber-500',
  3: 'bg-stone-400',
};

/** One quiet line of provenance metadata: tier · source · rows · as-of. */
export function MetaLine({ source }: { source: DataSource }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-stone-400">
      <span className="inline-flex items-center gap-1.5 text-stone-500">
        <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[source.tier]}`} aria-hidden />
        {TIER_LABEL[source.tier]}
      </span>
      <Sep />
      <span>{source.name}</span>
      <Sep />
      <span>
        {source.rowCount.toLocaleString()} {source.rowCount === 1 ? 'row' : 'rows'}
      </span>
      <Sep />
      <span>as of {source.asOf}</span>
    </p>
  );
}

function Sep() {
  return (
    <span className="text-stone-300" aria-hidden>
      ·
    </span>
  );
}

/** SQL in a quiet light-grey block — no dark surfaces. */
export function SqlBlock({ sql }: { sql: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-stone-50 px-4 py-3 font-mono text-[11px] leading-relaxed text-stone-600">
      <code>{sql}</code>
    </pre>
  );
}

/** Underlying rows, borderless: hairline dividers only, muted exclusions. */
export function RowsTable({ table }: { table: UnderlyingTable }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] text-stone-400">{table.caption}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200">
              {table.columns.map((c, ci) => (
                <th
                  key={c}
                  className={`whitespace-nowrap px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-stone-400 first:pl-0 last:pr-0 ${
                    table.numericCols?.includes(ci) ? 'text-right' : ''
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {table.rows.map((row, ri) => (
              <tr key={ri} className={row.emphasis ? 'bg-stone-50' : ''}>
                {row.cells.map((cell, ci) => {
                  const numeric = table.numericCols?.includes(ci);
                  return (
                    <td
                      key={ci}
                      className={`whitespace-nowrap px-2 py-2 first:pl-0 last:pr-0 ${
                        numeric ? 'text-right tabular-nums' : ''
                      } ${ci === 0 ? 'font-medium' : ''} ${
                        !row.contributes
                          ? 'text-stone-300 line-through'
                          : row.emphasis
                            ? 'font-medium text-stone-900'
                            : 'text-stone-600'
                      }`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-stone-400">{table.resultNote}</p>
    </div>
  );
}
