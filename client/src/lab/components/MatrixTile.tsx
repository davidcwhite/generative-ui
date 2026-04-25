// MatrixTile — small rounded-square tile with a 5×5 grid of dots,
// inspired by Anthropic-style "agent working" iconography.
//
// While running the dots pulse with a diagonal-sweep delay
// (each dot's offset = (row + col) * 70ms) — feels like data
// rippling across a sensor. On `done` the tile collapses to a
// check shape made of dots only; on `errored`, a cross. The
// non-pattern dots are clipped to opacity:0 with a hard
// `cubic-bezier(.7,0,.2,1)` curve so the ending snaps.

export type MatrixState = 'pending' | 'running' | 'done' | 'errored';

const CHECK_PATTERN: ReadonlyArray<ReadonlyArray<0 | 1>> = [
  [0, 0, 0, 0, 1],
  [0, 0, 0, 1, 0],
  [1, 0, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

const CROSS_PATTERN: ReadonlyArray<ReadonlyArray<0 | 1>> = [
  [1, 0, 0, 0, 1],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [1, 0, 0, 0, 1],
];

interface MatrixTileProps {
  state: MatrixState;
  size?: number;
}

export function MatrixTile({ state, size = 36 }: MatrixTileProps) {
  return (
    <div
      className={`matrix-tile matrix-tile--${state}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`status: ${state}`}
    >
      <div className="matrix-grid">
        {Array.from({ length: 25 }, (_, i) => {
          const row = Math.floor(i / 5);
          const col = i % 5;
          return (
            <span
              key={i}
              className="matrix-dot"
              data-in-check={CHECK_PATTERN[row][col] === 1 ? 'true' : 'false'}
              data-in-cross={CROSS_PATTERN[row][col] === 1 ? 'true' : 'false'}
              style={
                {
                  '--matrix-delay': `${(row + col) * 70}ms`,
                } as React.CSSProperties
              }
            />
          );
        })}
      </div>
    </div>
  );
}
