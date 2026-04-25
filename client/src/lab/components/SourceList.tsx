import type { ReactNode } from 'react';

export interface SourceItem {
  id: string;
  title: string;
  subtitle?: string;
  initials?: string;
  meta?: ReactNode;
}

interface SourceListProps {
  items: SourceItem[];
  emptyLabel?: string;
}

// A vertical list of source rows with circular favicon-style initials,
// title, and a subtitle (mirrors Perplexity's "Sources" pattern).
export function SourceList({ items, emptyLabel }: SourceListProps) {
  if (items.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-stone-400">
        {emptyLabel ?? 'No sources yet…'}
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-stone-100">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-3 py-2">
          <span
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-stone-100 text-[10px] font-semibold uppercase text-stone-500"
            aria-hidden="true"
          >
            {item.initials ?? item.title.slice(0, 2)}
          </span>
          <span className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm text-stone-800">{item.title}</span>
            {item.subtitle && (
              <span className="truncate text-xs text-stone-500">
                {item.subtitle}
              </span>
            )}
          </span>
          {item.meta && (
            <span className="ml-2 flex-none text-xs text-stone-400">
              {item.meta}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
