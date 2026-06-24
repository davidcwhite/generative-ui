import { useRef } from 'react';

/**
 * Accessible segmented control. Real buttons in a labelled group with
 * `aria-pressed`, roving tabindex, and arrow/Home/End keyboard nav.
 * `touch-action: manipulation` removes the 300ms tap delay on mobile.
 */

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusAt = (index: number) => {
    const clamped = (index + options.length) % options.length;
    refs.current[clamped]?.focus();
    onChange(options[clamped].id);
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(options.length - 1);
        break;
    }
  };

  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-0.5 rounded-xl border border-stone-200 bg-stone-50 p-0.5"
      style={{ touchAction: 'manipulation' }}
    >
      {options.map((option, index) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            aria-pressed={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${pad} ${
              active
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
