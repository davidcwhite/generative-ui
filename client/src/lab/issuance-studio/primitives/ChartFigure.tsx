import type { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * Wraps a Recharts chart in a <figure> with a text-equivalent <figcaption>.
 * Recharts SVGs are not accessible on their own, so the caption carries the
 * headline read for screen-reader and keyboard users. Pass `captionVisible`
 * to show it; otherwise it is visually hidden but still announced.
 */
export function ChartFigure({
  caption,
  height,
  captionVisible = false,
  children,
}: {
  caption: string;
  height: number;
  captionVisible?: boolean;
  children: ReactNode;
}) {
  return (
    <figure className="m-0">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
      <figcaption
        className={
          captionVisible
            ? 'mt-1 text-center text-xs text-stone-500'
            : 'sr-only'
        }
      >
        {caption}
      </figcaption>
    </figure>
  );
}
