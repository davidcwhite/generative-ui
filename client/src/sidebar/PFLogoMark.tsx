/**
 * PFLogoMark — the default brand mark used inside the sidebar's brand chip.
 *
 * Uses `currentColor` for strokes so it inherits the chip's text color
 * (white on the dark idle state, stone-700 on the hovered light state).
 *
 * To use a different brand mark, pass your own `logo` to <Sidebar />.
 */
export function PFLogoMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 5.5v13" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path
        d="M8 6.25h6a3 3 0 0 1 0 6H9"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 14.5h6.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}
