import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SIDEBAR_THEME } from './theme';

/**
 * Hover state + tooltip-visibility model shared by every rail control.
 * - `hovered`: raw direct-hover state (used for bg/styling decisions).
 * - `show`: tooltip visibility, gated by `shouldShow` so callers can scope it
 *   to e.g. collapsed-only.
 * - `bind`: mouse handlers to spread on the target element.
 */
export function useRailTooltip(shouldShow: boolean) {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    show: shouldShow && hovered,
    bind: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  };
}

/**
 * Dark pill tooltip rendered through a portal to escape the rail's
 * `overflow-x-hidden`. Positioned to the right of the anchor at vertical
 * center, viewport-fixed coords.
 */
export function RailTooltip({
  label,
  anchor,
  show,
}: {
  label: string;
  anchor: HTMLElement | null;
  show: boolean;
}) {
  if (!show || !anchor) return null;
  const rect = anchor.getBoundingClientRect();
  return createPortal(
    <span
      role="tooltip"
      style={{
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
        transform: 'translateY(-50%)',
        zIndex: 60,
      }}
      className={`pointer-events-none whitespace-nowrap rounded-md ${SIDEBAR_THEME.tooltip.bg} px-2.5 py-1.5 text-xs font-medium ${SIDEBAR_THEME.tooltip.text} shadow-lg`}
    >
      {label}
    </span>,
    document.body,
  );
}
