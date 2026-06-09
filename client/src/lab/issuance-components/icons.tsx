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

export function DatabaseIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </svg>
  );
}

export function TransformIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function CloseIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevronRightIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function SearchInspectIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function ExpandIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M15 9l5-5M20 9V4h-5" />
      <path d="M9 15l-5 5M4 15v5h5" />
    </svg>
  );
}

export function CollapseIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M20 4l-5 5M15 4v5h5" />
      <path d="M4 20l5-5M9 20v-5H4" />
    </svg>
  );
}

export function MetricIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 16l3-4 3 2 4-6" />
    </svg>
  );
}

export function ChartIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M21 12a9 9 0 1 1-9-9v9z" />
      <path d="M12 3a9 9 0 0 1 9 9h-9z" />
    </svg>
  );
}

export function ArrowRightIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
