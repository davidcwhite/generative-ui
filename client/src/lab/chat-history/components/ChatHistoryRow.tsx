import { useEffect, useId, useRef, useState } from 'react';
import { formatSessionTime } from '../format';
import type { MockChatSession } from '../mockSessions';
import { LAB_NOW } from '../mockSessions';
import { ChatOptionsMenu } from './ChatOptionsMenu';
import { ChatRenamePopover } from './ChatRenamePopover';

interface ChatHistoryRowProps {
  session: MockChatSession;
  active: boolean;
  now?: number;
  editing: boolean;
  popoverOpen: boolean;
  onSelect: () => void;
  onOpenRename: () => void;
  onOpenDelete: () => void;
  onSaveTitle: (title: string) => void;
  onConfirmDelete: () => void;
  onClosePopover: () => void;
  onCancelRename: () => void;
  saved: boolean;
}

const MAX_TITLE = 80;

export function ChatHistoryRow({
  session,
  active,
  now = LAB_NOW,
  editing,
  popoverOpen,
  onSelect,
  onOpenRename,
  onOpenDelete,
  onSaveTitle,
  onConfirmDelete,
  onClosePopover,
  onCancelRename,
  saved,
}: ChatHistoryRowProps) {
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    setError(null);
    const timer = window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [editing, session.title]);

  const saveInlineTitle = () => {
    const trimmed = inputRef.current?.value.trim() ?? '';
    if (!trimmed) {
      setError('Name can’t be empty');
      inputRef.current?.focus();
      return;
    }
    onSaveTitle(trimmed.slice(0, MAX_TITLE));
  };

  return (
    <li className="relative list-none">
      <div
        className={`group/row relative flex items-stretch transition-colors ${
          active ? 'bg-stone-100' : 'hover:bg-stone-50'
        }`}
      >
        {session.loading ? (
          <div
            className="min-w-0 flex-1 px-3 py-2.5"
            role="status"
            aria-label="Generating chat…"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="lab-shimmer h-3.5 w-2/3 rounded" aria-hidden />
              <span className="lab-shimmer h-2.5 w-7 shrink-0 rounded" aria-hidden />
            </div>
            <span className="lab-shimmer mt-2 block h-2.5 w-5/6 rounded" aria-hidden />
            <span className="sr-only">Generating response…</span>
          </div>
        ) : editing ? (
          <div className="min-w-0 flex-1 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor={inputId} className="sr-only">
                  Chat name
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  name="chat-title"
                  defaultValue={session.title}
                  onChange={() => {
                    if (error) setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      saveInlineTitle();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      onCancelRename();
                    }
                  }}
                  maxLength={MAX_TITLE}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="e.g. BMW 5Y concession…"
                  className="ch-inline-edit block w-full min-w-0 bg-transparent text-sm font-medium text-stone-900 caret-stone-900 placeholder:text-stone-400 focus-visible:outline-none"
                />
                {error ? (
                  <p className="mt-1 text-xs text-rose-600" role="alert">
                    {error}
                  </p>
                ) : (
                  <p className="sr-only">Press Enter to save or Escape to cancel.</p>
                )}
                <p className="mt-0.5 line-clamp-1 text-xs text-stone-400">{session.preview}</p>
              </div>
              <time
                dateTime={new Date(session.updatedAt).toISOString()}
                className="shrink-0 text-[11px] tabular-nums text-stone-400"
              >
                {formatSessionTime(session.updatedAt, now)}
              </time>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="min-w-0 flex-1 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`block truncate text-sm font-medium text-stone-800 ${saved ? 'ch-title-saved' : ''}`}
              >
                {session.title}
              </span>
              <time
                dateTime={new Date(session.updatedAt).toISOString()}
                className="shrink-0 text-[11px] tabular-nums text-stone-400"
              >
                {formatSessionTime(session.updatedAt, now)}
              </time>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-stone-400">{session.preview}</p>
          </button>
        )}

        {/* ⋯ menu — visible on hover/focus-within or when menu/popover open */}
        <div className="relative flex shrink-0 items-center pr-2">
          <button
            ref={menuBtnRef}
            type="button"
            aria-label="Chat options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className={`rounded-lg p-1.5 text-stone-400 transition-opacity hover:bg-stone-200 hover:text-stone-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
              editing
                ? 'pointer-events-none opacity-0'
                : menuOpen || popoverOpen
                  ? 'opacity-100'
                  : 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="19" cy="12" r="1.75" />
            </svg>
          </button>

          <ChatOptionsMenu
            open={menuOpen}
            anchorRef={menuBtnRef}
            onClose={() => setMenuOpen(false)}
            onRename={onOpenRename}
            onDelete={onOpenDelete}
          />
        </div>
      </div>

      <ChatRenamePopover
        open={popoverOpen}
        onConfirmDelete={onConfirmDelete}
        onCancel={onClosePopover}
      />
    </li>
  );
}
