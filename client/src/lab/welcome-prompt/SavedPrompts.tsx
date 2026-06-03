import { ArrowUpRight, Bookmark, Trash2 } from 'lucide-react';
import type { SavedPrompt } from './useSavedPrompts';

interface SavedPromptsProps {
  savedPrompts: SavedPrompt[];
  onSelect: (prompt: SavedPrompt) => void;
  onRemove: (id: string) => void;
}

export function SavedPrompts({ savedPrompts, onSelect, onRemove }: SavedPromptsProps) {
  return (
    <div className="w-full max-w-2xl">
      <div className="mb-3 flex items-center gap-1.5">
        <Bookmark className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.75} aria-hidden="true" />
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Saved prompts</p>
        {savedPrompts.length > 0 && (
          <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">
            {savedPrompts.length}
          </span>
        )}
      </div>

      {savedPrompts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5E5E3] bg-white/60 px-4 py-5 text-center">
          <p className="text-xs text-stone-400">
            Save a suggestion or your own prompt with the bookmark icon to reuse it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {savedPrompts.map((saved) => (
            <div
              key={saved.id}
              className="group flex items-center gap-2 rounded-xl border border-[#E5E5E3] bg-white p-3 shadow-sm transition-colors hover:border-stone-300"
            >
              <button
                type="button"
                onClick={() => onSelect(saved)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-stone-700 transition-colors group-hover:text-stone-900">
                  {saved.label}
                </span>
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 text-stone-300 transition-colors group-hover:text-stone-500"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={() => onRemove(saved.id)}
                className="rounded-md p-1.5 text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Delete saved prompt"
                aria-label="Delete saved prompt"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
