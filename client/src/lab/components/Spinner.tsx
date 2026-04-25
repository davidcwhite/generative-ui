import type { CSSProperties } from 'react';

interface SpinnerProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

export function Spinner({ size = 14, className = '', style, label }: SpinnerProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-stone-500 ${className}`.trim()}
      style={style}
    >
      <svg
        className="animate-spin text-stone-400"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.25"
        />
        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="text-xs">{label}</span>}
    </span>
  );
}
