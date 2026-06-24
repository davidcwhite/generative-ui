import { useCallback, useRef, useState } from 'react';
import { ChatHistoryPanel } from './components/ChatHistoryPanel';
import { INITIAL_SESSIONS, LAB_NOW, type MockChatSession } from './mockSessions';

type PanelMode = 'hover' | 'pinned';

const MOCK_MESSAGES: Record<string, string[]> = {
  s1: [
    'Show me the new issue concession for BMW versus autos peers',
    'BMW priced +88 bps vs MS, 7 bps NIC — tighter than the sector average of 11 bps.',
  ],
  s2: [
    'What has Volkswagen issued in EUR over the last 12 months?',
    'Volkswagen has issued €4.2 bn across 3 benchmarks in the last 12 months…',
  ],
};

/** Prompts + generated titles cycled through by the "Simulate response" button. */
const GENERATED_CHATS: { prompt: string; title: string; preview: string }[] = [
  {
    prompt: 'Show me comparable EUR deals for Renault in autos',
    title: 'Renault EUR comparables',
    preview: 'Here are the closest EUR auto comparables for Renault over the last 6 months…',
  },
  {
    prompt: 'How is the Mercedes 2031 trading versus reoffer?',
    title: 'Mercedes 2031 vs reoffer',
    preview: 'Mercedes 1.75% 2031 is +4 bps vs reoffer, in line with the autos basket…',
  },
  {
    prompt: 'What is the expected EUR financials supply next week?',
    title: 'EUR financials supply outlook',
    preview: 'Street expects €9–11 bn of EUR financials supply next week, led by seniors…',
  },
];

const RESPONSE_DELAY_MS = 2000;

export function ChatHistoryLabView() {
  const [sessions, setSessions] = useState<MockChatSession[]>(INITIAL_SESSIONS);
  const [activeId, setActiveId] = useState<string | null>(INITIAL_SESSIONS[0]?.id ?? null);
  const [panelMode, setPanelMode] = useState<PanelMode>('pinned');
  const [historyOpen, setHistoryOpen] = useState(true);
  const [shimmerOnSave, setShimmerOnSave] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMessages, setGenMessages] = useState<Record<string, string[]>>({});
  const genSeq = useRef(0);

  const active = sessions.find((s) => s.id === activeId);

  const handleRename = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title, updatedAt: LAB_NOW } : s)),
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setActiveId((current) => (current === id ? next[0]?.id ?? null : current));
      return next;
    });
  }, []);

  const handleSimulateResponse = useCallback(() => {
    if (generating) return;
    const spec = GENERATED_CHATS[genSeq.current % GENERATED_CHATS.length];
    genSeq.current += 1;
    const id = `gen-${Date.now()}`;

    setGenerating(true);
    setSessions((prev) => [
      {
        id,
        title: '',
        preview: spec.prompt,
        updatedAt: LAB_NOW,
        messageCount: 0,
        loading: true,
      },
      ...prev,
    ]);
    setActiveId(id);

    window.setTimeout(() => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                loading: false,
                title: spec.title,
                preview: spec.prompt,
                messageCount: 2,
                updatedAt: LAB_NOW,
              }
            : s,
        ),
      );
      setGenMessages((prev) => ({ ...prev, [id]: [spec.prompt, spec.preview] }));
      setGenerating(false);
    }, RESPONSE_DELAY_MS);
  }, [generating]);

  const previewMessages = active
    ? (MOCK_MESSAGES[active.id] ?? genMessages[active.id] ?? [active.preview])
    : [];

  return (
    <div className="flex h-full min-h-[32rem] flex-col bg-[#FAFAF8]">
      {/* Lab header */}
      <header className="shrink-0 border-b border-stone-200 bg-white px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          Chat History · Rename UX
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-stone-950 text-pretty">
              Saved chats &amp; rename
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 text-pretty">
              Hover a row for the <span className="font-medium text-stone-700">⋯</span> menu →{' '}
              <span className="font-medium text-stone-700">Rename</span> edits the title inline. Enter
              saves, Escape cancels.{' '}
              <span className="font-medium text-stone-700">Simulate response</span> adds a chat that
              shimmers while its title generates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSimulateResponse}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {generating ? 'Generating…' : 'Simulate response'}
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={shimmerOnSave}
              onClick={() => setShimmerOnSave((v) => !v)}
              className="group inline-flex items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            >
              <span className="text-xs font-medium text-stone-600">Save shimmer</span>
              <span
                aria-hidden
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  shimmerOnSave ? 'bg-stone-900' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                    shimmerOnSave ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>

            <div
              className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-0.5"
              role="group"
              aria-label="Panel mode"
            >
              {(['pinned', 'hover'] as PanelMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={panelMode === mode}
                  onClick={() => {
                    setPanelMode(mode);
                    if (mode === 'pinned') setHistoryOpen(true);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
                    panelMode === mode
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {mode === 'pinned' ? 'Pinned panel' : 'Hover flyout'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mock app chrome */}
      <div className="relative flex min-h-0 flex-1">
        {/* Rail */}
        <aside className="hidden w-16 shrink-0 flex-col items-center border-r border-[#E5E5E3] bg-[#F5F5F3] py-4 sm:flex">
          <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A1A1A]">
            <span className="text-xs font-bold text-white">PF</span>
          </div>
          <div
            className="relative"
            onMouseEnter={() => panelMode === 'hover' && setHistoryOpen(true)}
            onMouseLeave={() => panelMode === 'hover' && setHistoryOpen(false)}
          >
            <button
              type="button"
              aria-label="History"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((v) => !v)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
                historyOpen ? 'bg-[#E5E5E3]' : 'hover:bg-[#E5E5E3]'
              }`}
            >
              <svg className="h-5 w-5 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {panelMode === 'hover' && historyOpen && (
              <div className="absolute left-full top-0 h-full w-3" aria-hidden />
            )}
          </div>
        </aside>

        {/* History flyout */}
        {(panelMode === 'pinned' || historyOpen) && (
          <div
            className={`ch-panel-enter hidden w-64 shrink-0 border-r border-[#E5E5E3] shadow-lg sm:block ${
              panelMode === 'hover' ? 'absolute left-16 top-0 z-50 h-full' : 'relative'
            }`}
            onMouseEnter={() => panelMode === 'hover' && setHistoryOpen(true)}
            onMouseLeave={() => panelMode === 'hover' && setHistoryOpen(false)}
          >
            <ChatHistoryPanel
              sessions={sessions}
              activeId={activeId}
              pinned={panelMode === 'pinned'}
              shimmerOnSave={shimmerOnSave}
              onSelect={setActiveId}
              onRename={handleRename}
              onDelete={handleDelete}
              className="h-full"
            />
          </div>
        )}

        {/* Chat preview */}
        <main className="min-w-0 flex-1 overflow-auto p-6">
          {active && active.loading ? (
            <div className="mx-auto max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                Preview
              </p>
              <h2 className="mt-1 text-lg font-semibold text-stone-900 text-pretty">New chat</h2>
              <div className="mt-6 space-y-4">
                <div className="ml-auto max-w-[85%] rounded-2xl bg-stone-900 px-4 py-3 text-sm leading-relaxed text-stone-100">
                  {active.preview}
                </div>
                <div
                  className="max-w-[85%] rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200"
                  role="status"
                  aria-label="Generating response…"
                >
                  <span className="lab-shimmer block h-3 w-11/12 rounded" aria-hidden />
                  <span className="lab-shimmer mt-2 block h-3 w-4/5 rounded" aria-hidden />
                  <span className="lab-shimmer mt-2 block h-3 w-2/3 rounded" aria-hidden />
                </div>
              </div>
            </div>
          ) : active ? (
            <div className="mx-auto max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                Preview
              </p>
              <h2 className="mt-1 text-lg font-semibold text-stone-900 text-pretty">{active.title}</h2>
              <p className="mt-1 text-xs tabular-nums text-stone-400">
                {active.messageCount} messages
              </p>
              <div className="mt-6 space-y-4">
                {previewMessages.map((text, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      i % 2 === 0
                        ? 'ml-auto bg-stone-900 text-stone-100'
                        : 'bg-white text-stone-700 shadow-sm ring-1 ring-stone-200'
                    }`}
                  >
                    {text}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-stone-400">Select a chat from history</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
