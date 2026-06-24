import type { ReactNode } from 'react';

/**
 * Shared card shell + header pieces for every studio component.
 * Plain composition (children) — no behaviour booleans. A card is an
 * <article> (self-contained, composable) carrying one h3 title.
 */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </article>
  );
}

export function CardEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
      {children}
    </p>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-0.5 text-base font-semibold tracking-tight text-stone-900 text-pretty">
      {children}
    </h3>
  );
}

export function CardSubtitle({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 truncate text-xs text-stone-500">{children}</p>;
}

type ChipTone = 'good' | 'bad' | 'watch' | 'neutral';

const CHIP: Record<ChipTone, string> = {
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  bad: 'bg-rose-50 text-rose-700 ring-rose-200',
  watch: 'bg-amber-50 text-amber-700 ring-amber-200',
  neutral: 'bg-stone-100 text-stone-600 ring-stone-200',
};

export function StatusChip({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: ChipTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${CHIP[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
