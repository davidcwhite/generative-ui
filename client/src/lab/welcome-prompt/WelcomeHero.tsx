import { forwardRef } from 'react';
import { ArrowUp, Plus } from 'lucide-react';

interface WelcomeHeroProps {
  /** Value shown in the composer (committed text, or a hovered preview). */
  displayValue: string;
  /** When true, the displayValue is a hover preview and is rendered muted. */
  isPreview: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export const WelcomeHero = forwardRef<HTMLTextAreaElement, WelcomeHeroProps>(
  function WelcomeHero({ displayValue, isPreview, onChange, onSubmit }, ref) {
    const canSubmit = !isPreview && displayValue.trim().length > 0;

    return (
      <div className="w-full">
        <div className="rounded-[1.5rem] border border-[#E5E5E3] bg-white transition-colors focus-within:border-[#D5D5D3]">
          <textarea
            ref={ref}
            value={displayValue}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSubmit) onSubmit();
              }
            }}
            rows={3}
            placeholder="Ask anything, or pick a prompt below"
            readOnly={isPreview}
            className={`block w-full resize-none bg-transparent px-5 pt-5 text-[15px] leading-relaxed outline-none placeholder:text-stone-400 ${
              isPreview ? 'text-stone-400' : 'text-stone-800'
            }`}
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
              title="Add context"
              aria-label="Add context"
            >
              <Plus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-stone-400">Primary Flow</span>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
                aria-label="Send message"
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
