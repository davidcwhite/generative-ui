import { useCallback, useEffect, useMemo, useState } from 'react';

interface SidebarChat {
  id: string;
  title: string;
  preview: string;
  userMessage: string;
  responseSummary: string;
  meta: string;
}

const SWITCH_DELAY_MS = 1850;

const CHATS: SidebarChat[] = [
  {
    id: 'bmw',
    title: 'BMW concession check',
    preview: 'Show me BMW versus auto peers...',
    userMessage: 'Show me the new issue concession for BMW versus the EUR autos peer set.',
    responseSummary:
      'BMW is pricing close to the tight end of the autos peer set. The latest 5Y comparable screen points to an 84 bps z-spread, roughly 4 bps tighter on the week and inside the broader basket.',
    meta: '12 min ago',
  },
  {
    id: 'renault',
    title: 'Renault comparables',
    preview: 'Find recent EUR auto comps...',
    userMessage: 'Find comparable EUR deals for Renault and show me where the new issue should clear.',
    responseSummary:
      'Renault screens wider than the premium autos names, with recent 4Y and 5Y benchmarks pointing to a fair-value range around 105-112 bps depending on tenor and rating bucket.',
    meta: '28 min ago',
  },
  {
    id: 'supply',
    title: 'EUR IG supply',
    preview: 'Summarise next week supply...',
    userMessage: 'Summarise expected EUR investment grade supply for next week.',
    responseSummary:
      'Syndicate desks expect a measured reopening after the rates move, with financials leading supply and corporates likely waiting for a cleaner window after guidance updates.',
    meta: '1 hr ago',
  },
];

export function ChatSwitchSkeletonLabView() {
  const [activeId, setActiveId] = useState(CHATS[0].id);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);

  const active = useMemo(
    () => CHATS.find((chat) => chat.id === activeId) ?? CHATS[0],
    [activeId],
  );
  const isLoading = loadingId === activeId;

  const switchChat = useCallback(
    (id: string) => {
      if (id === activeId && loadingId !== id) return;
      setActiveId(id);
      setLoadingId(id);
      setCycle((value) => value + 1);
    },
    [activeId, loadingId],
  );

  useEffect(() => {
    if (!loadingId) return;
    const timer = window.setTimeout(() => setLoadingId(null), SWITCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loadingId, cycle]);

  const replay = useCallback(() => {
    setLoadingId(activeId);
    setCycle((value) => value + 1);
  }, [activeId]);

  return (
    <div className="flex h-full min-h-[34rem] flex-col bg-[#FAFAF8]">
      <header className="shrink-0 border-b border-stone-200 bg-white px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          Chat History · Switch Skeleton
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-stone-950 text-pretty">
              Sidebar switch loading
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 text-pretty">
              Switching history rows fetches the whole chat from the DB (mocked), so the entire
              chat area — user message and response — renders as one skeleton with a fading
              gradient wash until the conversation loads.
            </p>
          </div>
          <button
            type="button"
            onClick={replay}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            Replay skeleton
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-16 shrink-0 flex-col items-center border-r border-[#E5E5E3] bg-[#F5F5F3] py-4 sm:flex">
          <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A1A1A]">
            <span className="text-xs font-bold text-white">PF</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E5E5E3]">
            <svg className="h-5 w-5 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </aside>

        <aside className="hidden w-72 shrink-0 border-r border-[#E5E5E3] bg-white sm:block">
          <div className="flex items-center justify-between border-b border-[#E5E5E3] px-4 py-3">
            <h2 className="text-sm font-medium text-[#1A1A1A]">History</h2>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
              Prototype
            </span>
          </div>
          <div className="px-2 py-2">
            <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
              Today
            </p>
            <ul className="space-y-1">
              {CHATS.map((chat) => {
                const activeRow = chat.id === activeId;
                const rowLoading = chat.id === loadingId;
                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => switchChat(chat.id)}
                      aria-current={activeRow ? 'true' : undefined}
                      className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
                        activeRow ? 'bg-stone-100 text-stone-950' : 'text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          rowLoading ? 'bg-stone-900' : activeRow ? 'bg-stone-500' : 'bg-stone-300'
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{chat.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-stone-400">
                          {rowLoading ? 'Loading selected chat...' : chat.preview}
                        </span>
                      </span>
                      <span className="mt-0.5 shrink-0 text-[10px] text-stone-400">{chat.meta}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col px-6 py-10">
            <div className="mb-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                Preview
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-950">
                {active.title}
              </h2>
            </div>

            <section aria-live="polite" aria-busy={isLoading}>
              {isLoading ? (
                <ChatSkeleton key={`${activeId}-${cycle}`} />
              ) : (
                <div className="space-y-5">
                  <div className="ml-auto max-w-[82%] rounded-2xl bg-stone-900 px-4 py-3 text-sm leading-relaxed text-stone-100 shadow-sm">
                    {active.userMessage}
                  </div>
                  <div className="lab-fade-in max-w-[86%] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-700 shadow-sm">
                    {active.responseSummary}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * The whole chat is fetched from the DB on switch, so the entire chat area —
 * the user message bubble and the response beneath — renders as one skeleton
 * under a single top-to-bottom fading gradient wash.
 */
function ChatSkeleton() {
  return (
    <div className="ch-switch-skeleton" role="status" aria-label="Loading chat">
      {/* User message: a single solid block (no inner lines) */}
      <div className="ch-switch-line ml-auto h-14 w-[58%] max-w-[82%] rounded-2xl" aria-hidden />

      {/* Response (left-aligned) */}
      <div className="mt-6 space-y-3">
        <span className="ch-switch-line block h-3 w-[94%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[88%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[76%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[92%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[64%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[82%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[90%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[70%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[86%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[58%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[80%] rounded-full" aria-hidden />
        <span className="ch-switch-line block h-3 w-[48%] rounded-full" aria-hidden />
      </div>
      <span className="sr-only">Loading chat</span>
    </div>
  );
}
