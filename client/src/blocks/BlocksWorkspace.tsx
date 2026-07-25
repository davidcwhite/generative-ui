import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BlockType, CompsSpec } from './contract';
import { DEFAULT_COMPS_SPEC } from './execute';
import { TRANCHE_ROWS } from './data/queries';
import { CompsWorkspace } from './comps/CompsWorkspace';
import { useWorkspaceTarget } from './navigation';
import { readSpecFromUrl, writeSpecToUrl } from './urlState';

interface BlockOption {
  id: BlockType;
  label: string;
  hint: string;
  ready: boolean;
}

/**
 * Planned blocks are listed but disabled rather than hidden, so the shape of
 * the set is visible without anything pretending to work. Secondary
 * performance is absent by design: there is no bond-level data behind it.
 */
const BLOCKS: BlockOption[] = [
  { id: 'comps', label: 'Comps', hint: 'Where a deal prices against its peer set', ready: true },
  { id: 'deal_flash', label: 'Deal Flash', hint: 'Single deal, terms to book', ready: false },
  {
    id: 'allocation_summary',
    label: 'Allocation Summary',
    hint: 'Distribution, scaling and hit rate',
    ready: false,
  },
  {
    id: 'investor_profile',
    label: 'Investor Profile',
    hint: 'One account across every deal',
    ready: false,
  },
  { id: 'supply', label: 'Supply', hint: 'Volume and mix over time', ready: false },
];

/** Searchable subject picker over the tranche universe. */
function SubjectPicker({
  spec,
  onChange,
}: {
  spec: CompsSpec;
  onChange: (next: CompsSpec) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = needle
      ? TRANCHE_ROWS.filter(
          (row) =>
            row.issuer.name.toLowerCase().includes(needle) ||
            row.issuer.ticker.toLowerCase().includes(needle),
        )
      : TRANCHE_ROWS;
    return pool.slice(0, 40);
  }, [query]);

  const current = spec.subject
    ? TRANCHE_ROWS.find((row) => row.id === spec.subject?.trancheId)
    : undefined;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 max-w-[280px] items-center gap-2 rounded-md border border-stone-200 bg-white px-2.5 text-xs text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
          <span className="truncate">
            {current ? `${current.issuer.name} ${current.tenorLabel}` : 'Set a subject deal'}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-stone-400" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-stone-100 p-2">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search issuer"
            className="h-7 w-full rounded-md bg-stone-100 px-2 text-xs text-stone-800 outline-none placeholder:text-stone-400"
          />
        </div>
        <div className="max-h-72 overflow-auto p-1">
          {matches.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                onChange({ ...spec, subject: { trancheId: row.id } });
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-stone-100"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-stone-800">
                  {row.issuer.name}
                </span>
                <span className="block text-[10px] text-stone-400">
                  {row.tenorLabel} · {row.deal.currency} {row.sizeMm}m · {row.deal.pricingDate}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-stone-500">
                {row.reofferSpread}bp
              </span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BlockPicker({
  active,
  onChange,
}: {
  active: BlockType;
  onChange: (next: BlockType) => void;
}) {
  const current = BLOCKS.find((block) => block.id === active) ?? BLOCKS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-md bg-stone-100 px-3 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
        >
          {current.label}
          <ChevronDown className="h-3 w-3 text-stone-400" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {BLOCKS.map((block) => (
          <button
            key={block.id}
            type="button"
            disabled={!block.ready}
            onClick={() => onChange(block.id)}
            className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors enabled:hover:bg-stone-100 disabled:cursor-default disabled:opacity-45"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-stone-800">{block.label}</span>
              <span className="block text-[10px] leading-4 text-stone-400">{block.hint}</span>
            </span>
            {!block.ready && (
              <span className="mt-0.5 shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-stone-500">
                Soon
              </span>
            )}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The container for every block: a block picker and a subject picker, and
 * nothing else. Arriving from chat sets both, which is the entire interaction.
 */
export function BlocksWorkspace() {
  const [blockType, setBlockType] = useState<BlockType>('comps');
  const [spec, setSpec] = useState<CompsSpec>(() => readSpecFromUrl() ?? DEFAULT_COMPS_SPEC);
  const target = useWorkspaceTarget();

  // A spec arriving from chat replaces the current one, including on a repeat
  // click of the same block, which is why the target carries a nonce.
  useEffect(() => {
    if (target) setSpec(target.spec);
  }, [target]);

  useEffect(() => {
    writeSpecToUrl(spec);
  }, [spec]);

  return (
    <div className="mx-auto w-full max-w-[1800px] px-5 py-7 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BlockPicker active={blockType} onChange={setBlockType} />
        <SubjectPicker spec={spec} onChange={setSpec} />
      </div>

      <div className="mt-6">
        <CompsWorkspace spec={spec} onSpecChange={setSpec} />
      </div>
    </div>
  );
}
