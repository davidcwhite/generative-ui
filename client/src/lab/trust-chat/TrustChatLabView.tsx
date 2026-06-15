import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { HydrationMode } from '../issuance-components/useHydration';
import { ReplayIcon } from '../issuance-components/icons';
import type { ComponentLineage } from '../data-lineage-v2/lineageData';
import { ProvOversubscription } from '../trust-panel/components/ProvOversubscription';
import { ProvAllocationDonut } from '../trust-panel/components/ProvAllocationDonut';
import { ProvConcessionMetric } from '../trust-panel/components/ProvConcessionMetric';
import { ProvSpreadTightening } from './components/ProvSpreadTightening';
import { CascadePanel } from './panel/CascadePanel';
import { allAssetIds, chatTurns, getChatLineage } from './chatData';

const MODE_OPTIONS: { id: HydrationMode; label: string }[] = [
  { id: 'progressive', label: 'Progressive' },
  { id: 'instant', label: 'Instant' },
];

type CascadePanelVariant = 'rail' | 'dropdown';

const PANEL_DEFAULT_WIDTH = 46;
const PANEL_EXPANDED_WIDTH = 68;
const PANEL_MIN_WIDTH = 38;
const PANEL_MAX_WIDTH = 72;
const PANEL_WIDTH_STEP = 2;

function clampPanelWidth(width: number) {
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, width));
}

export function TrustChatLabView() {
  return <TrustChatLab panelVariant="rail" />;
}

export function TrustChatDropdownLabView() {
  return <TrustChatLab panelVariant="dropdown" />;
}

function TrustChatLab({ panelVariant }: { panelVariant: CascadePanelVariant }) {
  const [mode, setMode] = useState<HydrationMode>('progressive');
  const [runId, setRunId] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const resizeFrameRef = useRef<number | null>(null);
  const pendingPanelWidthRef = useRef(panelWidth);

  const replay = useCallback(() => setRunId((id) => id + 1), []);

  const handleModeChange = useCallback((next: HydrationMode) => {
    setMode(next);
    setRunId((id) => id + 1);
  }, []);

  const handleTrace = useCallback(
    (id: string) => setActiveId((current) => (current === id ? null : id)),
    [],
  );

  // Panel selectors always repoint (never toggle closed).
  const selectAsset = useCallback((id: string) => setActiveId(id), []);

  const open = activeId !== null;
  const expanded = panelWidth >= (PANEL_DEFAULT_WIDTH + PANEL_EXPANDED_WIDTH) / 2;

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }
    };
  }, []);

  const schedulePanelWidth = useCallback((nextWidth: number) => {
    pendingPanelWidthRef.current = clampPanelWidth(nextWidth);
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      setPanelWidth(pendingPanelWidthRef.current);
    });
  }, []);

  const startPanelResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      setResizing(true);
      const onMove = (moveEvent: PointerEvent) => {
        const width = ((window.innerWidth - moveEvent.clientX) / window.innerWidth) * 100;
        schedulePanelWidth(width);
      };
      const stop = () => {
        setResizing(false);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', stop);
        document.removeEventListener('pointercancel', stop);
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', stop);
      document.addEventListener('pointercancel', stop);
    },
    [schedulePanelWidth],
  );

  // While open, ←/→ cycle across every asset in the conversation.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setActiveId((current) => {
        const idx = allAssetIds.findIndex((id) => id === current);
        if (idx < 0) return current;
        const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
        return allAssetIds[(next + allAssetIds.length) % allAssetIds.length];
      });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const activeLineage = activeId ? getChatLineage(activeId) ?? null : null;

  // Keep the last lineage mounted so the panel can slide closed gracefully.
  const lastLineageRef = useRef<ComponentLineage | null>(null);
  if (activeLineage) lastLineageRef.current = activeLineage;
  const panelLineage = activeLineage ?? lastLineageRef.current;

  const wiringFor = (id: string) => ({
    active: activeId === id,
    revealAll: false,
    onTrace: handleTrace,
  });

  const shared = { mode, runId };
  const cardCols = open ? (expanded ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2') : 'sm:grid-cols-2';
  const usesDropdownPanel = panelVariant === 'dropdown';

  return (
    <div className="flex h-full">
      {/* Left pane: the conversation */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
          {/* Lab header */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              {usesDropdownPanel
                ? 'Components · Lineage · Chat dropdown'
                : 'Components · Trust panel · Chat'}
            </p>
            <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-950">
                  {usesDropdownPanel
                    ? 'Verify a response, component, and query'
                    : 'Verify any figure, stay in the conversation'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
                  {usesDropdownPanel
                    ? 'A two-turn mock chat. Click any cited figure to dock the lineage panel: a top dropdown picks the response, a second picks the component, and a third picks the query step.'
                    : 'A two-turn mock chat. Click any cited figure to dock the trust panel: the rail tracks responses, a dropdown picks the component, another picks the query step.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-0.5">
                  {MODE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleModeChange(option.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        mode === option.id
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-500 hover:text-stone-700'
                      }`}
                      aria-pressed={mode === option.id}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={replay}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
                >
                  <ReplayIcon className="h-3.5 w-3.5" />
                  Replay
                </button>
              </div>
            </div>
          </section>

          {/* Turn 1 */}
          <ChatTurnBlock question={chatTurns[0].question} lead={chatTurns[0].answerLead}>
            <div className={`grid gap-4 ${cardCols}`}>
              <Card active={activeId === 'oversubscription'}>
                <ProvOversubscription delay={0} {...shared} trace={wiringFor('oversubscription')} />
              </Card>
              <Card active={activeId === 'allocation-geography'}>
                <ProvAllocationDonut
                  delay={140}
                  {...shared}
                  trace={wiringFor('allocation-geography')}
                />
              </Card>
            </div>
          </ChatTurnBlock>

          {/* Turn 2 */}
          <ChatTurnBlock question={chatTurns[1].question} lead={chatTurns[1].answerLead}>
            <div className={`grid gap-4 ${cardCols}`}>
              <Card active={activeId === 'concession-vs-sector'}>
                <ProvConcessionMetric
                  delay={520}
                  {...shared}
                  trace={wiringFor('concession-vs-sector')}
                />
              </Card>
              <Card active={activeId === 'spread-tightening'}>
                <ProvSpreadTightening
                  delay={660}
                  {...shared}
                  trace={wiringFor('spread-tightening')}
                />
              </Card>
            </div>
          </ChatTurnBlock>
        </div>
      </div>

      {/* Right pane: the trust panel, slides open as a full-height split */}
      <aside
        aria-hidden={!open}
        className={`relative hidden shrink-0 overflow-hidden border-stone-200 bg-white lg:block ${
          open ? 'border-l' : 'pointer-events-none border-l-0'
        } ${
          resizing
            ? 'transition-none'
            : 'transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
        }`}
        style={{ width: open ? `${panelWidth}%` : '0%' }}
      >
        {open && (
          <div
            role="separator"
            aria-label="Resize lineage panel"
            aria-orientation="vertical"
            aria-valuemin={PANEL_MIN_WIDTH}
            aria-valuemax={PANEL_MAX_WIDTH}
            aria-valuenow={Math.round(panelWidth)}
            tabIndex={0}
            onPointerDown={startPanelResize}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setPanelWidth((width) => clampPanelWidth(width + PANEL_WIDTH_STEP));
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                setPanelWidth((width) => clampPanelWidth(width - PANEL_WIDTH_STEP));
              } else if (event.key === 'Home') {
                event.preventDefault();
                setPanelWidth(PANEL_MIN_WIDTH);
              } else if (event.key === 'End') {
                event.preventDefault();
                setPanelWidth(PANEL_MAX_WIDTH);
              }
            }}
            className="group absolute left-0 top-0 z-30 hidden h-full w-3 cursor-col-resize items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400 lg:flex"
          >
            <span className="h-10 w-px rounded-full bg-stone-200 transition-colors group-hover:bg-stone-400" />
          </div>
        )}
        {panelLineage && (
          <div
            className={`h-full min-w-[480px] transition-opacity duration-300 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <CascadePanel
              turns={chatTurns}
              lineage={panelLineage}
              activeAssetId={panelLineage.id}
              onSelectAsset={selectAsset}
              responseSelector={panelVariant}
              expanded={expanded}
              onToggleExpand={() => {
                setPanelWidth((width) =>
                  width >= (PANEL_DEFAULT_WIDTH + PANEL_EXPANDED_WIDTH) / 2
                    ? PANEL_DEFAULT_WIDTH
                    : PANEL_EXPANDED_WIDTH,
                );
              }}
              onClose={() => {
                setActiveId(null);
              }}
            />
          </div>
        )}
      </aside>
    </div>
  );
}

/* ── Chat scaffolding ────────────────────────────────────────────────────── */

function ChatTurnBlock({
  question,
  lead,
  children,
}: {
  question: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* User message */}
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-stone-100 px-4 py-2.5 text-sm text-stone-800">
          {question}
        </p>
      </div>
      {/* Assistant answer */}
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-stone-600">{lead}</p>
        {children}
      </div>
    </div>
  );
}

function Card({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${
        active ? 'border-stone-300 shadow-md' : 'border-stone-200'
      }`}
    >
      {children}
    </div>
  );
}
