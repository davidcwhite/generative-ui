import { useState } from 'react';

interface JsonInspectorProps {
  label?: string;
  value: unknown;
  defaultOpen?: boolean;
}

// Compact, reusable "View raw JSON" disclosure for tool args/results.
export function JsonInspector({
  label = 'Raw JSON',
  value,
  defaultOpen = false,
}: JsonInspectorProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-700"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 20 20"
          fill="none"
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden="true"
        >
          <path
            d="M7 5l6 5-6 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </button>
      {open && (
        <pre className="mt-1 max-h-64 overflow-auto rounded-md border border-stone-200 bg-stone-900/95 p-2 font-mono text-[10px] leading-relaxed text-stone-100">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}
