import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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

export function TrustChatLabView() {
  const [mode, setMode] = useState<HydrationMode>('progressive');
  const [runId, setRunId] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  return (
    <div className="flex h-full">
      {/* Left pane: the conversation */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
          {/* Lab header */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              Components · Trust panel · Chat
            </p>
            <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-950">
                  Verify any figure, stay in the conversation
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
                  A two-turn mock chat. Click any cited figure to dock the trust panel: the rail
                  tracks responses, a dropdown picks the component, another picks the query step.
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
        className={`hidden shrink-0 overflow-hidden border-stone-200 bg-white transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:block ${
          open ? 'border-l' : 'pointer-events-none border-l-0'
        }`}
        style={{ width: open ? (expanded ? '68%' : '46%') : '0%' }}
      >
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
              expanded={expanded}
              onToggleExpand={() => setExpanded((v) => !v)}
              onClose={() => {
                setActiveId(null);
                setExpanded(false);
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
