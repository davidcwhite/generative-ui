import { useState, type ReactNode } from 'react';
import { Spinner } from './Spinner';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface StepCardProps {
  status: StepStatus;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  defaultExpanded?: boolean;
  expandable?: boolean;
  children?: ReactNode;
  icon?: ReactNode;
}

const STATUS_DOT: Record<StepStatus, string> = {
  pending: 'bg-stone-200',
  running: 'bg-amber-300 animate-pulse',
  done: 'bg-emerald-400',
  error: 'bg-rose-400',
};

export function StepCard({
  status,
  title,
  subtitle,
  meta,
  defaultExpanded = false,
  expandable = true,
  children,
  icon,
}: StepCardProps) {
  const [open, setOpen] = useState(defaultExpanded);
  const canExpand = expandable && Boolean(children);

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => canExpand && setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
          canExpand ? 'cursor-pointer hover:bg-stone-50' : 'cursor-default'
        }`}
        aria-expanded={canExpand ? open : undefined}
      >
        <span
          className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-stone-50 text-stone-500"
          aria-hidden="true"
        >
          {icon ?? (
            status === 'running' ? (
              <Spinner size={12} />
            ) : status === 'done' ? (
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 10.5l3 3 7-7"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-600"
                />
              </svg>
            ) : status === 'error' ? (
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  className="text-rose-500"
                />
              </svg>
            ) : (
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
            )
          )}
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-sm text-stone-800">{title}</span>
          {subtitle && (
            <span className="text-xs text-stone-500">{subtitle}</span>
          )}
        </span>
        {meta && (
          <span className="ml-2 flex-none text-xs text-stone-400">{meta}</span>
        )}
        {canExpand && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 20 20"
            fill="none"
            className={`ml-2 flex-none text-stone-400 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          >
            <path
              d="M5 8l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      {canExpand && open && (
        <div className="border-t border-stone-100 bg-stone-50/60 px-3 py-2 text-xs text-stone-700">
          {children}
        </div>
      )}
    </div>
  );
}
