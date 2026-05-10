import { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { RailTooltip, useRailTooltip } from './RailTooltip';
import { SIDEBAR_THEME } from './theme';

/**
 * The unified row primitive used by every sidebar nav entry — primary nav,
 * pinned action rows, and the bottom action row. Renders as a fixed-width
 * icon slot (so chips stay aligned in the collapsed rail) plus a label that
 * fades out when the rail is collapsed.
 *
 * Shows a portal tooltip to the right when collapsed and hovered.
 */
export function SidebarNavRow({
  icon: Icon,
  label,
  collapsed,
  active = false,
  tone = 'default',
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  active?: boolean;
  tone?: 'default' | 'muted';
  onClick: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { show, bind } = useRailTooltip(collapsed);

  const colorClasses = active
    ? `${SIDEBAR_THEME.row.activeBg} ${SIDEBAR_THEME.row.activeText}`
    : tone === 'muted'
    ? `${SIDEBAR_THEME.row.mutedText} ${SIDEBAR_THEME.row.mutedHover}`
    : `${SIDEBAR_THEME.row.defaultText} ${SIDEBAR_THEME.row.defaultHover}`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        {...bind}
        className={`flex w-full items-center rounded-lg py-2 text-left text-sm font-medium transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 ${SIDEBAR_THEME.focusRing} motion-reduce:transition-none ${colorClasses}`}
      >
        <span className="flex h-5 w-10 shrink-0 items-center justify-center">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span
          className={`ml-3 min-w-0 flex-1 truncate transition-opacity duration-150 ease-out motion-reduce:transition-none ${
            collapsed ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {label}
        </span>
      </button>
      <RailTooltip label={label} anchor={buttonRef.current} show={show} />
    </>
  );
}
