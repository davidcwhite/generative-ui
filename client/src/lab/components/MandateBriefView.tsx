import { useState } from 'react';

interface SectionDataPoint {
  field?: string | number;
  value?: string | number;
  [key: string]: string | number | undefined;
}

interface MandateBriefSection {
  title: string;
  content: string;
  dataPoints?: SectionDataPoint[];
}

interface MandateBrief {
  issuerId: string;
  issuerName: string;
  generatedAt: string;
  sections: MandateBriefSection[];
  provenance?: {
    sources: string[];
    timestamp: string;
    queryContext: string;
  };
}

interface MandateBriefViewProps {
  brief: MandateBrief;
  exportFormats?: string[];
}

function DataPointTable({ rows }: { rows: SectionDataPoint[] }) {
  if (!rows.length) return null;
  const columns = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full border-collapse text-[11px] text-stone-700">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-500">
            {columns.map((c) => (
              <th key={c} className="px-2 py-1 font-medium capitalize">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-stone-100 last:border-b-0">
              {columns.map((c) => (
                <td key={c} className="px-2 py-1 text-stone-600">
                  {String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MandateBriefView({ brief, exportFormats }: MandateBriefViewProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true });

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-stone-400">
            Mandate Brief
          </span>
          <span className="text-sm font-semibold text-stone-800">
            {brief.issuerName}
          </span>
          <span className="text-[11px] text-stone-400">
            Generated {new Date(brief.generatedAt).toLocaleString()}
          </span>
        </div>
        {exportFormats && exportFormats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {exportFormats.map((fmt) => (
              <span
                key={fmt}
                className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-stone-600"
              >
                {fmt}
              </span>
            ))}
          </div>
        )}
      </div>
      <ol className="flex flex-col divide-y divide-stone-100">
        {brief.sections.map((section, i) => {
          const isOpen = expanded[i] ?? false;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [i]: !isOpen }))
                }
                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-stone-50"
                aria-expanded={isOpen}
              >
                <span className="text-[10px] font-semibold text-stone-400">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 text-sm font-medium text-stone-800">
                  {section.title}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 20 20"
                  fill="none"
                  className={`text-stone-400 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                >
                  <path
                    d="M5 8l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 pt-0 text-xs text-stone-700">
                  <p className="leading-relaxed">{section.content}</p>
                  {section.dataPoints && section.dataPoints.length > 0 && (
                    <DataPointTable rows={section.dataPoints} />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {brief.provenance && brief.provenance.sources.length > 0 && (
        <div className="border-t border-stone-100 px-4 py-2 text-[10px] text-stone-400">
          <span className="uppercase tracking-wide">Sources:</span>{' '}
          {brief.provenance.sources.join(', ')}
        </div>
      )}
    </div>
  );
}

export type { MandateBrief };
