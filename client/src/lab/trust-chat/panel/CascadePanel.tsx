import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ComponentLineage } from '../../data-lineage-v2/lineageData';
import { primarySource, transformKindLabel } from '../../data-lineage-v2/lineageData';
import {
  ChevronDownIcon,
  CloseIcon,
  CollapseIcon,
  ExpandIcon,
} from '../../issuance-components/icons';
import {
  MetaLine,
  RowsTable,
  SqlBlock,
  resultStepIndex,
} from '../../trust-panel/panels/shared';
import { turnAssets, turnForAsset, type ChatTurn } from '../chatData';

interface CascadePanelProps {
  turns: ChatTurn[];
  lineage: ComponentLineage;
  activeAssetId: string;
  onSelectAsset: (id: string) => void;
  responseSelector?: 'rail' | 'dropdown';
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

/**
 * "Cascade" trust panel: the hierarchy mirrors the conversation.
 * Response selector → component dropdown → step dropdown → SQL + rows.
 * Each level scales independently, so the chrome never grows with content.
 */
export function CascadePanel({
  turns,
  lineage,
  activeAssetId,
  onSelectAsset,
  responseSelector = 'rail',
  expanded,
  onToggleExpand,
  onClose,
}: CascadePanelProps) {
  const [stepIdx, setStepIdx] = useState(() => resultStepIndex(lineage));
  const steps = lineage.steps;

  // When the asset changes, land on its result step. Adjusting state during
  // render (rather than in an effect) avoids a one-frame flash of the old step.
  const lineageIdRef = useRef(lineage.id);
  if (lineageIdRef.current !== lineage.id) {
    lineageIdRef.current = lineage.id;
    setStepIdx(resultStepIndex(lineage));
  }

  const headline = lineage.results.find((r) => r.emphasis) ?? lineage.results[0];
  const source = primarySource(lineage);
  const step = steps[Math.min(stepIdx, steps.length - 1)];

  const activeTurn = turnForAsset(activeAssetId) ?? turns[0];
  const assets = turnAssets(activeTurn);
  const activeTurnIndex = turns.findIndex((t) => t.id === activeTurn.id);
  const usesResponseDropdown = responseSelector === 'dropdown';

  return (
    <div className="flex h-full bg-white">
      {/* Turn rail: one dot per chat response */}
      {!usesResponseDropdown && (
        <nav
          aria-label="Responses in this chat"
          className="flex w-12 shrink-0 flex-col items-center gap-2.5 border-r border-stone-100 pt-4"
        >
          {turns.map((turn, i) => {
            const active = turn.id === activeTurn.id;
            return (
              <div key={turn.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelectAsset(turn.assetIds[0])}
                  aria-label={`Response ${i + 1}: ${turn.question}`}
                  aria-current={active ? 'true' : undefined}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
                    active
                      ? 'bg-stone-900 font-medium text-white'
                      : 'text-stone-400 ring-1 ring-inset ring-stone-200 hover:text-stone-600 hover:ring-stone-300'
                  }`}
                >
                  {i + 1}
                </button>
                {/* Question tooltip */}
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 w-48 -translate-y-1/2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  <p className="line-clamp-2 text-[11px] leading-snug text-stone-600">
                    {turn.question}
                  </p>
                </div>
              </div>
            );
          })}
        </nav>
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Turn context + window controls */}
        <div
          className={`relative flex items-center gap-3 px-5 ${
            usesResponseDropdown ? 'z-20 py-2.5' : 'pt-3.5'
          }`}
        >
          {usesResponseDropdown ? (
            <Dropdown
              label={
                <span className="flex min-w-0 items-baseline gap-2 text-[13px] text-stone-700">
                  <span className="shrink-0 font-medium text-stone-900">
                    Response {activeTurnIndex + 1}
                  </span>
                  <span className="min-w-0 truncate text-[11px] text-stone-400">
                    {activeTurn.question}
                  </span>
                </span>
              }
              menuWidth="w-80"
              menuLabel="Responses"
            >
              {(close) =>
                turns.map((turn, i) => {
                  const active = turn.id === activeTurn.id;
                  return (
                    <MenuItem
                      key={turn.id}
                      active={active}
                      onClick={() => {
                        onSelectAsset(turn.assetIds[0]);
                        close();
                      }}
                    >
                      <span className="w-20 shrink-0 font-medium tabular-nums">
                        Response {i + 1}
                      </span>
                      <span className="min-w-0 truncate text-stone-500">{turn.question}</span>
                    </MenuItem>
                  );
                })
              }
            </Dropdown>
          ) : (
            <p className="min-w-0 truncate text-[11px] text-stone-400">
              Response {activeTurnIndex + 1}
              <span className="mx-1.5 text-stone-300">·</span>
              {activeTurn.question}
            </p>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onToggleExpand}
              className="hidden rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 lg:block"
              aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
            >
              {expanded ? <CollapseIcon className="h-4 w-4" /> : <ExpandIcon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              aria-label="Close"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Figure: headline + query + data — soft crossfade on any selection */}
        <Crossfade id={`${lineage.id}:${stepIdx}`}>
          {/* Headline: component dropdown as the title, then value + meta */}
          <div className="relative z-10 px-5 pb-5 pt-3">
          <Dropdown
            label={
              <span className="text-sm font-semibold text-stone-900">{lineage.title}</span>
            }
            menuWidth="w-72"
            menuLabel="Components in this response"
          >
            {(close) =>
              assets.map((a) => {
                const active = a.id === activeAssetId;
                return (
                  <MenuItem
                    key={a.id}
                    active={active}
                    onClick={() => {
                      onSelectAsset(a.id);
                      close();
                    }}
                  >
                    <span className="min-w-0 truncate">{a.title}</span>
                    <span
                      className={`ml-auto shrink-0 pl-3 tabular-nums ${
                        active ? 'text-stone-900' : 'text-stone-400'
                      }`}
                    >
                      {a.value}
                    </span>
                  </MenuItem>
                );
              })
            }
          </Dropdown>

          {headline && (
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-stone-900">
                {headline.value}
              </span>
              <span className="text-xs text-stone-400">{headline.label}</span>
            </p>
          )}
          {!usesResponseDropdown && (
            <div className="mt-3">
              <MetaLine source={source} />
            </div>
          )}
        </div>

        {/* Query: step dropdown, then the materialised view */}
        <div className="flex items-center gap-3 px-5 pb-4 pt-1.5">
          <Dropdown
            label={
              <span className="flex min-w-0 items-center text-[13px] text-stone-700">
                <span className="shrink-0 tabular-nums text-stone-400">{stepIdx + 1}</span>
                <span className="mx-1.5 shrink-0 text-stone-300">·</span>
                <span className="min-w-0 truncate font-medium">{step.label}</span>
              </span>
            }
            menuWidth="w-72"
            menuLabel={`Queries the agent ran · ${steps.length}`}
          >
            {(close) =>
              steps.map((s, i) => {
                const active = i === stepIdx;
                const isResult = i === resultStepIndex(lineage);
                return (
                  <MenuItem
                    key={s.id}
                    active={active}
                    onClick={() => {
                      setStepIdx(i);
                      close();
                    }}
                  >
                    <span className="w-4 shrink-0 tabular-nums text-stone-400">{i + 1}</span>
                    <span className="min-w-0 truncate">{s.label}</span>
                    <span className="ml-auto shrink-0 pl-3 text-[11px] text-stone-400">
                      {isResult ? 'result' : transformKindLabel(s.kind)}
                    </span>
                  </MenuItem>
                );
              })
            }
          </Dropdown>
        </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2">
            <div className="space-y-4">
              <SqlBlock sql={step.sql} tone={usesResponseDropdown ? 'dark' : 'light'} />
              <RowsTable table={step.table} />
            </div>
          </div>
        </Crossfade>
      </div>
    </div>
  );
}

/**
 * Soft crossfade. The live `children` always render on top and stay
 * interactive; when `id` changes, the previous frame is held underneath and
 * fades out, so a selection dissolves into the next instead of snapping.
 */
function Crossfade({ id, children }: { id: string; children: ReactNode }) {
  const [prevId, setPrevId] = useState(id);
  const lastChildren = useRef(children);
  const [leaving, setLeaving] = useState<{ id: string; node: ReactNode } | null>(null);

  if (prevId !== id) {
    // Skip the fading ghost under reduced motion: with `.cf-leave` animation
    // disabled, onAnimationEnd never fires (it would never unmount) and old rows
    // would bleed through below shorter new content.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLeaving({ id: prevId, node: lastChildren.current });
    }
    setPrevId(id);
  }
  useEffect(() => {
    lastChildren.current = children;
  });

  return (
    <div className="relative min-h-0 flex-1">
      {leaving && (
        <div
          key={leaving.id}
          // `inert` keeps the fading ghost out of tab order & the a11y tree.
          // Spread form: React 18's DOM types don't expose the prop yet.
          {...{ inert: '' }}
          className="cf-leave pointer-events-none absolute inset-0 flex flex-col"
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setLeaving(null);
          }}
        >
          {leaving.node}
        </div>
      )}
      <div key={id} className="cf-enter absolute inset-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}

/* ── Quiet dropdown primitives ───────────────────────────────────────────── */

interface DropdownProps {
  label: ReactNode;
  menuWidth: string;
  menuLabel?: string;
  children: (close: () => void) => ReactNode;
}

function Dropdown({ label, menuWidth, menuLabel, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function toggle() {
    if (open) setOpen(false); // triggers exit transition; unmounts on transitionend
    else {
      setMounted(true);
      setOpen(true); // @starting-style animates the enter
    }
  }
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative min-w-0 max-w-full ${mounted ? 'z-20' : ''}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`group/dd -mx-1.5 inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
          open ? 'bg-stone-100 text-stone-900' : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
        }`}
      >
        <span className="min-w-0">{label}</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform duration-200 group-hover/dd:text-stone-600 ${
            open ? 'rotate-180 text-stone-600' : ''
          }`}
          aria-hidden
        />
      </button>
      {mounted && (
        <div
          role="menu"
          data-state={open ? 'open' : 'closed'}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && !open) setMounted(false);
          }}
          className="dd-menu absolute left-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg"
        >
          <div className={`${menuWidth} bg-white`}>
            {menuLabel && (
              <p className="px-3 pb-2 pt-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">
                {menuLabel}
              </p>
            )}
            {children(close)}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400 ${
        active ? 'bg-stone-100 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      {children}
    </button>
  );
}
