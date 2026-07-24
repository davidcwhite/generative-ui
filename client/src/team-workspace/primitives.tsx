import type { ReactNode } from 'react';
import { DATASETS, scopeLabel, type Scope } from './model';

/* ------------------------------------------------------------------ */
/* Scope chips — the tagging mechanism for instructions and prompts    */
/* ------------------------------------------------------------------ */

const ALL_SCOPES: Scope[] = ['global', ...DATASETS.map((d) => d.id)];

/** Read-only scope badges. */
export function ScopeBadges({ scopes }: { scopes: Scope[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {scopes.map((scope) => (
        <span
          key={scope}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
            scope === 'global'
              ? 'bg-[#1A1A1A] text-white'
              : 'bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-200'
          }`}
        >
          {scopeLabel(scope)}
        </span>
      ))}
    </span>
  );
}

/**
 * Interactive scope picker. Selecting Global clears dataset scopes and
 * vice-versa — an instruction is either desk-wide or dataset-tagged.
 */
export function ScopePicker({
  value,
  onChange,
}: {
  value: Scope[];
  onChange: (scopes: Scope[]) => void;
}) {
  const toggle = (scope: Scope) => {
    if (scope === 'global') {
      onChange(['global']);
      return;
    }
    const withoutGlobal = value.filter((s) => s !== 'global');
    const next = withoutGlobal.includes(scope)
      ? withoutGlobal.filter((s) => s !== scope)
      : [...withoutGlobal, scope];
    onChange(next.length === 0 ? ['global'] : next);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Applies to">
      {ALL_SCOPES.map((scope) => {
        const active = value.includes(scope);
        return (
          <button
            key={scope}
            type="button"
            onClick={() => toggle(scope)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
              active
                ? scope === 'global'
                  ? 'bg-[#1A1A1A] text-white shadow-sm'
                  : 'bg-stone-700 text-white shadow-sm'
                : 'bg-white text-stone-500 ring-1 ring-inset ring-stone-200 hover:text-stone-800 hover:ring-stone-300'
            }`}
          >
            {scopeLabel(scope)}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-1 ${
        checked ? 'bg-[#1A1A1A]' : 'bg-stone-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Section shell                                                       */
/* ------------------------------------------------------------------ */

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E5E5E3] bg-white">
      <header className="flex items-start justify-between gap-4 border-b border-[#E5E5E3] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-[-0.01em] text-[#1A1A1A]">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-5 text-stone-500">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Layer number marker — used to reinforce the 5-layer mental model    */
/* ------------------------------------------------------------------ */

export function LayerMark({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-stone-100 text-[11px] font-semibold text-stone-600">
      {n}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyHint({ headline, body, cta }: { headline: string; body: string; cta?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </span>
      <p className="mt-3 text-sm font-medium text-stone-800">{headline}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-stone-500">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
