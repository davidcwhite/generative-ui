import { useEffect } from 'react';
import { Bookmark, BookmarkCheck, Trash2, X, type LucideIcon } from 'lucide-react';

export interface PromptPanelItem {
  id: string;
  label: string;
  prompt: string;
}

interface PromptCategoryPanelProps {
  title: string;
  icon: LucideIcon;
  items: PromptPanelItem[];
  /** 'canned' shows a save bookmark; 'saved' shows a delete action. */
  variant: 'canned' | 'saved';
  isSaved: (prompt: string) => boolean;
  onClose: () => void;
  onHover: (prompt: string | null) => void;
  onCommit: (item: PromptPanelItem) => void;
  onToggleSave: (item: PromptPanelItem) => void;
  onDelete: (item: PromptPanelItem) => void;
}

export function PromptCategoryPanel({
  title,
  icon: Icon,
  items,
  variant,
  isSaved,
  onClose,
  onHover,
  onCommit,
  onToggleSave,
  onDelete,
}: PromptCategoryPanelProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#E5E5E3] bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2 text-stone-400">
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="border-t border-[#EFEFEC] px-5 py-8 text-center">
          <p className="text-sm text-stone-400">
            {variant === 'saved'
              ? 'No saved prompts yet. Hover a suggestion and tap the bookmark to save it here.'
              : 'No prompts in this category yet.'}
          </p>
        </div>
      ) : (
        <div
          className="max-h-[320px] overflow-y-auto"
          onMouseLeave={() => onHover(null)}
        >
          {items.map((item) => {
            const saved = isSaved(item.prompt);
            return (
              <div
                key={item.id}
                onMouseEnter={() => onHover(item.prompt)}
                className="group flex items-center gap-3 border-t border-[#EFEFEC] px-5 transition-colors hover:bg-stone-50"
              >
                <button
                  type="button"
                  onClick={() => onCommit(item)}
                  className="min-w-0 flex-1 py-3.5 text-left text-[15px] text-stone-800 outline-none"
                >
                  <span className="block truncate">{item.label}</span>
                </button>

                {variant === 'saved' ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                    className="shrink-0 rounded-md p-1.5 text-stone-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 group-hover:opacity-100"
                    title="Delete saved prompt"
                    aria-label="Delete saved prompt"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(item);
                    }}
                    className={`shrink-0 rounded-md p-1.5 transition-all focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 ${
                      saved
                        ? 'text-amber-500 opacity-100 hover:bg-amber-50'
                        : 'text-stone-300 opacity-0 hover:bg-stone-100 hover:text-stone-500 group-hover:opacity-100'
                    }`}
                    title={saved ? 'Remove from saved' : 'Save prompt'}
                    aria-label={saved ? 'Remove from saved' : 'Save prompt'}
                  >
                    {saved ? (
                      <BookmarkCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    ) : (
                      <Bookmark className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
