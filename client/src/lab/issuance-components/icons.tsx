/**
 * Minimal inline SVG icons so the lab stays dependency-free
 * (the base `main` branch does not ship lucide-react).
 */

interface IconProps {
  className?: string;
}

const base = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

export function TrendUpIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  );
}

export function TrendDownIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M17 17h4v-4" />
    </svg>
  );
}

export function FlatIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function ReplayIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3 12a9 9 0 109-9 9 9 0 00-7.5 4" />
      <path d="M3 3v4h4" />
    </svg>
  );
}
