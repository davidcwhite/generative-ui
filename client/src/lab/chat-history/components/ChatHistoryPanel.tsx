import { useCallback, useEffect, useRef, useState } from 'react';
import { groupSessions } from '../format';
import type { MockChatSession } from '../mockSessions';
import { LAB_NOW } from '../mockSessions';
import { ChatHistoryRow } from './ChatHistoryRow';

interface PopoverState {
  sessionId: string;
}

interface ChatHistoryPanelProps {
  sessions: MockChatSession[];
  activeId: string | null;
  pinned?: boolean;
  now?: number;
  shimmerOnSave?: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function ChatHistoryPanel({
  sessions,
  activeId,
  pinned = false,
  now = LAB_NOW,
  shimmerOnSave = true,
  onSelect,
  onRename,
  onDelete,
  className = '',
}: ChatHistoryPanelProps) {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const prevLoadingRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!savedId) return;
    const timer = window.setTimeout(() => setSavedId(null), 330);
    return () => window.clearTimeout(timer);
  }, [savedId]);

  // When a session finishes generating (loading: true → false), glint its new
  // title with the same sheen used on rename save (respecting the toggle).
  useEffect(() => {
    const prev = prevLoadingRef.current;
    const next: Record<string, boolean> = {};
    let justLoaded: string | null = null;
    for (const session of sessions) {
      next[session.id] = !!session.loading;
      if (prev[session.id] && !session.loading) justLoaded = session.id;
    }
    prevLoadingRef.current = next;
    if (justLoaded && shimmerOnSave) setSavedId(justLoaded);
  }, [sessions, shimmerOnSave]);

  const closePopover = useCallback(() => setPopover(null), []);

  const openRename = useCallback((sessionId: string) => {
    setPopover(null);
    setEditingId(sessionId);
  }, []);

  const openDelete = useCallback((sessionId: string) => {
    setEditingId(null);
    setPopover({ sessionId });
  }, []);

  const handleSave = useCallback(
    (sessionId: string, title: string) => {
      onRename(sessionId, title);
      setEditingId(null);
      if (shimmerOnSave) setSavedId(sessionId);
    },
    [onRename, shimmerOnSave],
  );

  const handleConfirmDelete = useCallback(
    (sessionId: string) => {
      onDelete(sessionId);
      closePopover();
    },
    [onDelete, closePopover],
  );

  const groups = groupSessions(sessions, now);

  return (
    <nav
      aria-label="Chat history"
      className={`flex h-full flex-col bg-white ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#E5E5E3] px-4 py-3">
        <h2 className="text-sm font-medium text-[#1A1A1A]">History</h2>
        {pinned ? (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
            Pinned
          </span>
        ) : (
          <button
            type="button"
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            aria-label="Pin sidebar"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ overscrollBehavior: 'contain' }}
      >
        {sessions.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-stone-500">No chat history yet</p>
            <p className="mt-1 text-xs text-stone-400">Start a new conversation</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.bucket} aria-labelledby={`bucket-${group.bucket}`}>
              <h3
                id={`bucket-${group.bucket}`}
                className="sticky top-0 z-10 bg-white/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400 backdrop-blur-sm"
              >
                {group.label}
              </h3>
              <ul className="flex flex-col">
                {group.sessions.map((session) => (
                  <ChatHistoryRow
                    key={session.id}
                    session={session}
                    active={session.id === activeId}
                    now={now}
                    editing={editingId === session.id}
                    saved={savedId === session.id}
                    popoverOpen={popover?.sessionId === session.id}
                    onSelect={() => {
                      closePopover();
                      setEditingId(null);
                      onSelect(session.id);
                    }}
                    onOpenRename={() => openRename(session.id)}
                    onOpenDelete={() => openDelete(session.id)}
                    onSaveTitle={(title) => handleSave(session.id, title)}
                    onConfirmDelete={() => handleConfirmDelete(session.id)}
                    onClosePopover={closePopover}
                    onCancelRename={() => setEditingId(null)}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </nav>
  );
}
