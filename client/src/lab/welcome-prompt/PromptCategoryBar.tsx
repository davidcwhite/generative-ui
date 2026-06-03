import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, type LucideIcon } from 'lucide-react';

export interface PromptCategoryChip {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface PromptCategoryBarProps {
  chips: PromptCategoryChip[];
  onSelect: (id: string) => void;
  /** Optional handler for the fixed circular search affordance. */
  onSearch?: () => void;
}

export function PromptCategoryBar({ chips, onSelect, onSearch }: PromptCategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    window.addEventListener('resize', updateEdges);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateEdges);
    };
  }, [updateEdges, chips.length]);

  const scrollByDir = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  return (
    <div className="group flex items-center gap-2">
      <button
        type="button"
        onClick={onSearch}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E5E3] bg-white text-stone-500 transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
        title="Search prompts"
        aria-label="Search prompts"
      >
        <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </button>

      <div className="relative min-w-0 flex-1">
        {canLeft && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#FAFAF8] to-transparent" />
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              className="absolute left-0 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E5E3] bg-white text-stone-500 opacity-0 transition-opacity hover:text-stone-800 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 group-hover:opacity-100"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          onScroll={updateEdges}
          className="flex gap-2 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {chips.map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onSelect(chip.id)}
                className="flex shrink-0 items-center gap-2 rounded-2xl border border-[#E5E5E3] bg-white px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
              >
                <Icon className="h-4 w-4 text-stone-500" strokeWidth={1.75} aria-hidden="true" />
                {chip.label}
              </button>
            );
          })}
        </div>

        {canRight && (
          <>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#FAFAF8] to-transparent" />
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              className="absolute right-0 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E5E3] bg-white text-stone-500 opacity-0 transition-opacity hover:text-stone-800 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 group-hover:opacity-100"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
