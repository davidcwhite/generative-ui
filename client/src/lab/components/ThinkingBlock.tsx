import { useMemo, type CSSProperties } from 'react';

// OpenCode web UI dot-matrix spinner with green accent on peak pulse.
// Single-file portable variant: keyframes injected once into <head> so the
// component drops into any React project without a separate CSS file.
// See ThinkingBlock.md for the rationale and porting gotchas.

const INNER_INDICES = new Set([5, 6, 9, 10]);
const CORNER_INDICES = new Set([0, 3, 12, 15]);

const STYLES = `
@keyframes tb-active {
  0%, 100% { opacity: 0.4;  fill: #d6d3d1; }
  50%      { opacity: 1;    fill: #10b981; }
}
@keyframes tb-soft {
  0%, 100% { opacity: 0.15; fill: #e7e5e4; }
  50%      { opacity: 0.45; fill: #a8a29e; }
}
`;

let injected = false;
function injectStyles() {
  if (injected || typeof document === 'undefined') return;
  const tag = document.createElement('style');
  tag.setAttribute('data-thinking-block', '');
  tag.textContent = STYLES;
  document.head.appendChild(tag);
  injected = true;
}

interface ThinkingBlockProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function ThinkingBlock({
  size = 16,
  className,
  style,
}: ThinkingBlockProps) {
  injectStyles();
  const squares = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: (i % 4) * 4,
        y: Math.floor(i / 4) * 4,
        delay: Math.random() * 1.8,
        duration: 1.2 + Math.random() * 1.2,
        corner: CORNER_INDICES.has(i),
        inner: INNER_INDICES.has(i),
      })),
    [],
  );

  return (
    <svg
      data-component="thinking-block"
      viewBox="0 0 15 15"
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      aria-hidden
    >
      {squares.map((s) => (
        <rect
          key={s.id}
          x={s.x}
          y={s.y}
          width="3"
          height="3"
          rx="1"
          fill="#d6d3d1"
          style={
            s.corner
              ? { opacity: 0 }
              : {
                  animation: `${s.inner ? 'tb-active' : 'tb-soft'} ${s.duration}s ease-in-out infinite both`,
                  animationDelay: `${s.delay}s`,
                }
          }
        />
      ))}
    </svg>
  );
}
