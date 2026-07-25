import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Clock3, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BlockSpec, BlockType, CompsSpec, DealFlashSpec } from './contract';
import { DEFAULT_COMPS_SPEC } from './execute';
import { AS_OF, ROW_BY_ID, TRANCHE_ROWS } from './data/queries';
import { CompsWorkspace } from './comps/CompsWorkspace';
import { DealFlashWorkspace } from './deal-flash/DealFlashWorkspace';
import {
  returnToChat,
  useRecentBlocks,
  useWorkspaceTarget,
  type BlockSource,
} from './navigation';
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
  { id: 'deal_flash', label: 'Deal Flash', hint: 'Single deal, terms to book', ready: true },
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

/** A multi-tranche priced deal, so the default view shows the block complete. */
const DEFAULT_DEAL_FLASH_SPEC: DealFlashSpec = {
  blockType: 'deal_flash',
  dealId:
    TRANCHE_ROWS.find((row) => row.multiTranche && row.deal.status === 'priced')?.dealId ??
    TRANCHE_ROWS[0].dealId,
  asOf: AS_OF,
};

const blockLabel = (spec: BlockSpec) =>
  BLOCKS.find((block) => block.id === spec.blockType)?.label ?? 'Block';

/** Searchable picker over the tranche universe, shared by both block types. */
function SubjectPicker({ spec, onChange }: { spec: BlockSpec; onChange: (next: BlockSpec) => void }) {
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

  const currentId =
    spec.blockType === 'comps'
      ? spec.subject?.trancheId
      : spec.trancheId ??
        TRANCHE_ROWS.find((row) => row.dealId === spec.dealId)?.id;
  const current = currentId ? ROW_BY_ID.get(currentId) : undefined;

  const select = (trancheId: string) => {
    const row = ROW_BY_ID.get(trancheId);
    if (!row) return;
    onChange(
      spec.blockType === 'comps'
        ? { ...spec, subject: { trancheId } }
        : { ...spec, dealId: row.dealId, trancheId },
    );
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 max-w-[280px] items-center gap-2 rounded-md border border-stone-200 bg-white px-2.5 text-xs text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
          <span className="truncate">
            {current
              ? `${current.issuer.name} ${current.tenorLabel}`
              : spec.blockType === 'comps'
                ? 'Set a subject deal'
                : 'Choose a deal'}
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
          {matches.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-stone-400">No issuer matches that.</p>
          )}
          {matches.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => select(row.id)}
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
  spec,
  onChange,
  recents,
}: {
  spec: BlockSpec;
  onChange: (next: BlockSpec) => void;
  recents: ReturnType<typeof useRecentBlocks>;
}) {
  const [open, setOpen] = useState(false);

  const choose = (id: BlockType) => {
    setOpen(false);
    if (id === spec.blockType) return;
    onChange(id === 'comps' ? DEFAULT_COMPS_SPEC : DEFAULT_DEAL_FLASH_SPEC);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-md bg-stone-100 px-3 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
        >
          {blockLabel(spec)}
          <ChevronDown className="h-3 w-3 text-stone-400" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        {BLOCKS.map((block) => (
          <button
            key={block.id}
            type="button"
            disabled={!block.ready}
            onClick={() => choose(block.id)}
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

        {/* Labelled by the question, not the block type: a list of four comps
            runs is unreadable, a list of four questions is obvious. */}
        {recents.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Opened this session</DropdownMenuLabel>
            {recents.map((entry) => (
              <button
                key={`${entry.at}`}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onChange(entry.spec);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-stone-100"
              >
                <Clock3 className="h-3 w-3 shrink-0 text-stone-300" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-xs text-stone-700">
                  {entry.source?.question ?? blockLabel(entry.spec)}
                </span>
                <span className="shrink-0 text-[10px] text-stone-400">
                  {blockLabel(entry.spec)}
                </span>
              </button>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Names where you came from and takes you back to that spot in the thread. */
function ReturnToChat({ source }: { source: BlockSource }) {
  return (
    <button
      type="button"
      onClick={() => returnToChat(source.anchorId)}
      className="group inline-flex h-7 max-w-[340px] items-center gap-1.5 rounded-md px-2 text-[11px] text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
    >
      <ArrowLeft
        className="h-3 w-3 shrink-0 transition-transform group-hover:-translate-x-0.5"
        aria-hidden
      />
      <span className="shrink-0">Back to chat</span>
      <span className="truncate text-stone-400">· {source.question}</span>
    </button>
  );
}

export function BlocksWorkspace() {
  const [spec, setSpec] = useState<BlockSpec>(() => readSpecFromUrl() ?? DEFAULT_COMPS_SPEC);
  const [source, setSource] = useState<BlockSource | undefined>();
  const target = useWorkspaceTarget();
  const recents = useRecentBlocks();

  // A spec arriving from chat replaces the current one, and brings with it the
  // question that produced it so the way back can be labelled.
  useEffect(() => {
    if (!target) return;
    setSpec(target.spec);
    setSource(target.source);
  }, [target]);

  useEffect(() => {
    writeSpecToUrl(spec);
  }, [spec]);

  // Following a cross-block link is a move within the workspace, so the trail
  // back to the conversation survives it.
  const changeSpec = useCallback((next: BlockSpec) => setSpec(next), []);

  return (
    <div className="mx-auto w-full max-w-[1800px] px-5 py-7 lg:px-8">
      {source && (
        <div className="-ml-2 mb-3">
          <ReturnToChat source={source} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <BlockPicker spec={spec} onChange={changeSpec} recents={recents} />
        <SubjectPicker spec={spec} onChange={changeSpec} />
      </div>

      <div className="mt-6">
        {spec.blockType === 'comps' ? (
          <CompsWorkspace spec={spec} onSpecChange={changeSpec} />
        ) : (
          <DealFlashWorkspace
            spec={spec}
            onSpecChange={changeSpec}
            onOpenComps={(next: CompsSpec) => changeSpec(next)}
          />
        )}
      </div>
    </div>
  );
}
