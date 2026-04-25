import type { ReactNode } from 'react';

interface DoneChipProps {
  label: ReactNode;
  tone?: 'success' | 'neutral' | 'error';
}

const TONES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  neutral: 'border-stone-200 bg-stone-50 text-stone-600',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
} as const;

export function DoneChip({ label, tone = 'success' }: DoneChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}
    >
      {tone === 'success' ? (
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M5 10.5l3 3 7-7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : tone === 'error' ? (
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M5 5l10 10M15 5L5 15"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
      <span>{label}</span>
    </span>
  );
}
