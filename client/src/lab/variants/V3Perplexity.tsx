import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { SourceList, type SourceItem } from '../components/SourceList';
import { DoneChip } from '../components/DoneChip';
import { Spinner } from '../components/Spinner';
import {
  MandateBriefView,
  type MandateBrief,
} from '../components/MandateBriefView';
import type { VariantRenderProps } from '../types';

interface ResolveResult {
  matches: Array<{
    id: string;
    name: string;
    shortName: string;
    sector: string;
    country: string;
  }>;
  confidence: string;
}

interface IssuerDealsResult {
  issuer: { id: string; name: string; sector: string };
  deals: Array<{
    id: string;
    issuerName: string;
    isin: string;
    currency: string;
    size: number;
    tenor: string;
    coupon: number;
    pricingDate: string;
  }>;
  summary?: { totalDeals: number; totalRaised: number };
}

interface BriefResult {
  brief: MandateBrief;
  exportFormats?: string[];
}

function dealsToSources(result: IssuerDealsResult): SourceItem[] {
  return result.deals.map((d) => ({
    id: d.id,
    title: `${d.issuerName} ${d.coupon}% ${d.tenor}`,
    subtitle: `${d.isin} · ${d.currency} ${d.size}M · priced ${d.pricingDate}`,
    initials: d.currency,
  }));
}

function matchesToSources(result: ResolveResult): SourceItem[] {
  return result.matches.map((m) => ({
    id: m.id,
    title: m.name,
    subtitle: `${m.sector} · ${m.country}`,
    initials: m.shortName.slice(0, 2),
  }));
}

interface SourceGroup {
  id: string;
  label: string;
  items: SourceItem[];
}

// V3 Perplexity Sources — collapsible "Searching…" header that reveals
// each peer/deal as a row with circular icon + title + domain-style
// subtitle, terminated with a `DoneChip`. Mirrors the Perplexity Sources
// card pattern.
export function V3Perplexity({ message }: VariantRenderProps) {
  const [open, setOpen] = useState(true);

  const groups: SourceGroup[] = [];
  let isSearching = false;
  let mandateBrief: BriefResult | undefined;
  const trailingTexts: string[] = [];

  for (const part of message.parts ?? []) {
    if (part.type === 'tool-invocation') {
      const inv = part.toolInvocation;
      if (inv.state !== 'result') {
        isSearching = true;
        continue;
      }
      if (inv.toolName === 'resolve_entity') {
        const r = inv.result as ResolveResult;
        groups.push({
          id: inv.toolCallId,
          label: 'Resolved entities',
          items: matchesToSources(r),
        });
      } else if (inv.toolName === 'get_issuer_deals') {
        const r = inv.result as IssuerDealsResult;
        groups.push({
          id: inv.toolCallId,
          label: `Recent issuance · ${r.issuer.name}`,
          items: dealsToSources(r),
        });
      } else if (inv.toolName === 'generate_mandate_brief') {
        mandateBrief = inv.result as BriefResult;
      }
    } else if (part.type === 'text') {
      if (part.text.trim()) trailingTexts.push(part.text);
    }
  }

  const totalSources = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-stone-200 bg-white">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-stone-50"
          aria-expanded={open}
        >
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-stone-50 text-stone-500">
            {isSearching ? (
              <Spinner size={12} />
            ) : (
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="9"
                  cy="9"
                  r="5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M13 13l4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </span>
          <span className="flex-1 text-sm font-medium text-stone-800">
            {isSearching ? 'Searching DCM data…' : 'Searched DCM data'}
          </span>
          {!isSearching && totalSources > 0 && (
            <DoneChip label={`${totalSources} sources`} />
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 20 20"
            fill="none"
            className={`ml-2 text-stone-400 transition-transform ${
              open ? 'rotate-180' : ''
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
        {open && (
          <div className="border-t border-stone-100">
            {groups.length === 0 ? (
              <div className="px-3 py-2 text-xs text-stone-400">
                Waiting for sources…
              </div>
            ) : (
              <div className="flex flex-col">
                {groups.map((g) => (
                  <div key={g.id}>
                    <div className="bg-stone-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      {g.label}
                    </div>
                    <SourceList items={g.items} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {trailingTexts.length > 0 && (
        <div className="markdown-content">
          <ReactMarkdown>{trailingTexts.join('')}</ReactMarkdown>
        </div>
      )}

      {mandateBrief?.brief && (
        <MandateBriefView
          brief={mandateBrief.brief}
          exportFormats={mandateBrief.exportFormats}
        />
      )}
    </div>
  );
}
