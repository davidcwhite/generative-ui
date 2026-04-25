// GloopIndicator — small SVG status badge that morphs between
// pending → running → done / errored.
//
// The "gloop" is achieved by wrapping the core circle + its two orbiting
// satellites inside a single `filter="url(#labGoo)"` group: a Gaussian
// blur followed by a high-contrast alpha matrix fuses adjacent shapes
// into a single liquid blob (classic CSS-Tricks "goo" trick). When the
// state transitions to `done`, the satellites snap inward, the core
// squishes once with a single overshoot curve, the colour crossfades
// from amber to emerald, and the check `<path>` strokes on via
// `stroke-dashoffset`. Errored uses the same choreography in rose with
// a cross instead of a check.
//
// All motion is gated by `prefers-reduced-motion` (see index.css) and
// drawn purely in CSS / SVG — no animation library, ~1KB gzip.

export type GloopState = 'pending' | 'running' | 'done' | 'errored';

interface GloopIndicatorProps {
  state: GloopState;
  size?: number;
}

// Singleton SVG that defines `#labGoo` once for the whole variant.
// Must be mounted once in the V5 variant root before any GloopIndicator
// is rendered. It takes no layout space.
export function GooFilterDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
      }}
    >
      <defs>
        <filter id="labGoo" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 18 -7
            "
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

export function GloopIndicator({ state, size = 22 }: GloopIndicatorProps) {
  return (
    <span
      className={`lab-gloop lab-gloop--${state}`}
      role="img"
      aria-label={state}
      style={{ width: size, height: size, display: 'inline-block' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <g filter="url(#labGoo)">
          <circle cx="12" cy="12" className="lab-gloop__core" />
          <g className="lab-gloop__orbit">
            <circle cx="12" cy="3" className="lab-gloop__sat" />
            <circle cx="12" cy="21" className="lab-gloop__sat" />
          </g>
        </g>
        <path
          className="lab-gloop__tick"
          d="M6.5 12.2 L10 15.6 L17 8.6"
          fill="none"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="lab-gloop__cross"
          d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
