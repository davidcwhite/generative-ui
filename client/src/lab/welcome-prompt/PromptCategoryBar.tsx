import type { LucideIcon } from 'lucide-react';

export interface PromptCategoryChip {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface PromptCategoryBarProps {
  chips: PromptCategoryChip[];
  onSelect: (id: string) => void;
}

export function PromptCategoryBar({ chips, onSelect }: PromptCategoryBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onSelect(chip.id)}
            className="flex items-center gap-2 rounded-full border border-[#E5E5E3] bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
          >
            <Icon className="h-4 w-4 text-stone-500" strokeWidth={1.75} aria-hidden="true" />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
