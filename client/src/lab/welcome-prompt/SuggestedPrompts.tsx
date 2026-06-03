import { useMemo, useState } from 'react';
import { ArrowUpRight, Bookmark, BookmarkCheck, Shuffle } from 'lucide-react';
import {
  promptCategories,
  promptSuggestions,
  type PromptCategoryId,
  type PromptSuggestion,
} from './welcomePromptData';

interface SuggestedPromptsProps {
  onSelect: (suggestion: PromptSuggestion) => void;
  onToggleSave: (suggestion: PromptSuggestion) => void;
  isSaved: (prompt: string) => boolean;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function SuggestedPrompts({ onSelect, onToggleSave, isSaved }: SuggestedPromptsProps) {
  const [activeCategory, setActiveCategory] = useState<PromptCategoryId>('pitch');
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const visible = useMemo(() => {
    const inCategory = promptSuggestions.filter((s) => s.categoryId === activeCategory);
    // shuffleSeed referenced so a new shuffle reorders the list.
    return shuffleSeed === 0 ? inCategory : shuffle(inCategory);
  }, [activeCategory, shuffleSeed]);

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Try asking</p>
        <button
          type="button"
          onClick={() => setShuffleSeed((s) => s + 1)}
          className="flex items-center gap-1.5 rounded-full border border-[#E5E5E3] bg-white px-2.5 py-1 text-[11px] font-medium text-stone-500 shadow-sm transition-colors hover:border-stone-300 hover:text-stone-700"
          title="Shuffle suggestions"
        >
          <Shuffle className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          Shuffle
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Prompt categories">
        {promptCategories.map((category) => {
          const Icon = category.icon;
          const active = category.id === activeCategory;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                  : 'border-[#E5E5E3] bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.map((suggestion) => {
          const saved = isSaved(suggestion.prompt);
          return (
            <div
              key={suggestion.id}
              className="group relative flex flex-col rounded-xl border border-[#E5E5E3] bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => onToggleSave(suggestion)}
                className={`absolute right-2.5 top-2.5 rounded-md p-1 transition-colors ${
                  saved
                    ? 'text-amber-500 hover:bg-amber-50'
                    : 'text-stone-300 hover:bg-stone-100 hover:text-stone-500'
                }`}
                title={saved ? 'Remove from saved' : 'Save prompt'}
                aria-label={saved ? 'Remove from saved' : 'Save prompt'}
              >
                {saved ? (
                  <BookmarkCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelect(suggestion)}
                className="flex flex-1 flex-col items-start pr-6 outline-none"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
                  {suggestion.label}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-stone-300 transition-colors group-hover:text-stone-500"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
