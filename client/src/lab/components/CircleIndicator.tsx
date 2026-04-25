// CircleIndicator — small SVG ring that morphs through the four task
// states. Pending shows a faint outline. Running spins an arc segment.
// Done draws a full emerald ring (~320ms) and then pops a check inside
// (~220ms). Errored mirrors that with a rose ring + cross. The arc
// draw is `stroke-dashoffset: circumference → 0` and the glyphs use
// the same dash trick — all on `cubic-bezier(.7, 0, .2, 1)` so they
// land hard rather than fading.

export type CircleState = 'pending' | 'running' | 'done' | 'errored';

interface CircleIndicatorProps {
  state: CircleState;
  size?: number;
}

export function CircleIndicator({ state, size = 14 }: CircleIndicatorProps) {
  return (
    <svg
      className={`circle-ind circle-ind--${state}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={`status: ${state}`}
    >
      {/* Background ring — always visible. */}
      <circle
        className="circle-ind__bg"
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
      />

      {/* Indeterminate arc — only painted while running, rotated by CSS. */}
      <g className="circle-ind__spin">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="14 43"
          transform="rotate(-90 12 12)"
        />
      </g>

      {/* Completion arc — draws clockwise from 12 o'clock on done/errored. */}
      <circle
        className="circle-ind__arc"
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />

      {/* Inner glyph — check or cross, drawn after the arc lands. */}
      <path
        className="circle-ind__check"
        d="M7.5 12.4 L10.6 15.5 L16.5 9.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="circle-ind__cross"
        d="M9 9 L15 15 M15 9 L9 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
