import type { CSSProperties } from 'react';
import './thinking-block.css';

// OpenCode web UI dot-matrix spinner, with inner cells pulsing to primary
// green at peak and outer cells staying in soft gray.

const INNER_INDICES = new Set([5, 6, 9, 10]);
const CORNER_INDICES = new Set([0, 3, 12, 15]);

const SQUARES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: (i % 4) * 4,
  y: Math.floor(i / 4) * 4,
  delay: Math.random() * 1.8,
  duration: 1.2 + Math.random() * 1.2,
  corner: CORNER_INDICES.has(i),
  inner: INNER_INDICES.has(i),
}));

interface ThinkingBlockProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function ThinkingBlock({
  size = 16,
  className = '',
  style,
}: ThinkingBlockProps) {
  return (
    <svg
      data-component="thinking-block"
      viewBox="0 0 15 15"
      className={className}
      style={{ width: size, height: size, ...style }}
      aria-hidden
    >
      {SQUARES.map((square) => (
        <rect
          key={square.id}
          x={square.x}
          y={square.y}
          width="3"
          height="3"
          rx="1"
          fill="#d6d3d1"
          style={
            square.corner
              ? { opacity: 0 }
              : {
                  animation: `${square.inner ? 'oc-pulse-green-active' : 'oc-pulse-green-soft'} ${square.duration}s ease-in-out infinite`,
                  animationFillMode: 'both',
                  animationDelay: `${square.delay}s`,
                }
          }
        />
      ))}
    </svg>
  );
}
