import { memo, useCallback, useRef, useState, type ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';
import { PFLogoMark } from './PFLogoMark';
import { RailTooltip, useRailTooltip } from './RailTooltip';
import { SectionContent } from './SectionContent';
import { SidebarNavRow } from './SidebarNavRow';
import { SIDEBAR_THEME } from './theme';
import type { SidebarProps } from './types';

/** Controllable/uncontrolled collapse state — picks between prop and local state. */
function useControllableCollapse({
  collapsed,
  defaultCollapsed,
  onCollapsedChange,
}: Pick<SidebarProps, 'collapsed' | 'defaultCollapsed' | 'onCollapsedChange'>) {
  const isControlled = collapsed !== undefined;
  const [internal, setInternal] = useState(defaultCollapsed ?? false);
  const value = isControlled ? collapsed : internal;
  const setValue = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternal(next);
      onCollapsedChange?.(next);
    },
    [isControlled, onCollapsedChange],
  );
  return [value, setValue] as const;
}

/**
 * Brand chip with a 4-state background ladder driven by the rail's hover state
 * and the chip's own direct-hover state:
 *   1) expanded                          - dark pill, brand mark
 *   2) collapsed + chip directly hovered - light-grey pill, expand icon
 *   3) collapsed + rail hovered, not chip- transparent, expand icon outline
 *   4) collapsed + idle                  - dark pill, brand mark
 * The PFLogoMark <-> PanelLeft glyph swap is keyed to (collapsed && railHovered).
 */
function BrandChip({
  collapsed,
  railHovered,
  logo,
  onOpen,
}: {
  collapsed: boolean;
  railHovered: boolean;
  logo: ReactNode;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { hovered: chipHovered, show, bind } = useRailTooltip(collapsed);

  const bg = !collapsed
    ? `cursor-default ${SIDEBAR_THEME.brand.chipBg} ${SIDEBAR_THEME.brand.chipText}`
    : chipHovered
    ? `cursor-pointer ${SIDEBAR_THEME.brand.chipHoverBg} ${SIDEBAR_THEME.brand.chipHoverText}`
    : railHovered
    ? `cursor-pointer bg-transparent ${SIDEBAR_THEME.brand.chipHoverText}`
    : `cursor-pointer ${SIDEBAR_THEME.brand.chipBg} ${SIDEBAR_THEME.brand.chipText}`;

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={collapsed ? onOpen : undefined}
        tabIndex={collapsed ? 0 : -1}
        aria-label={collapsed ? 'Open sidebar' : undefined}
        aria-hidden={collapsed ? undefined : true}
        {...bind}
        className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 ${SIDEBAR_THEME.focusRing} motion-reduce:transition-none ${bg}`}
      >
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out motion-reduce:transition-none ${
            collapsed && railHovered ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {logo}
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out motion-reduce:transition-none ${
            collapsed && railHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <PanelLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
      </button>
      <RailTooltip label="Open sidebar" anchor={ref.current} show={show} />
    </>
  );
}

/**
 * Reusable sidebar with a persistent left rail, three-section nav, per-section
 * pinned actions, a scrollable context panel, and an optional bottom action.
 *
 * Domain-agnostic — pass sections + context groups + predicates as props.
 * Re-theme via `client/src/sidebar/theme.ts`. Default-exported wrapped in
 * `React.memo` so a parent that re-renders frequently does not force the
 * sidebar to re-render unless its props actually change.
 */
function Sidebar(props: SidebarProps) {
  const {
    brandName = 'Primary Flow',
    logo = <PFLogoMark className="h-5 w-5" />,
    sections,
    activeSectionId,
    onSectionChange,
    sectionActions,
    contextGroups,
    onLinkClick,
    onLinkDelete,
    isLinkActive,
    isLinkDeletable,
    isLinkDisabled,
    bottomAction,
    className,
  } = props;

  const [collapsed, setCollapsed] = useControllableCollapse(props);
  const [railHovered, setRailHovered] = useState(false);

  // Always clear rail-hover before flipping collapsed so the brand chip never
  // flashes a transitional state during the width animation.
  const handleCollapse = useCallback(() => {
    setRailHovered(false);
    setCollapsed(true);
  }, [setCollapsed]);
  const handleExpand = useCallback(() => {
    setRailHovered(false);
    setCollapsed(false);
  }, [setCollapsed]);

  return (
    <aside
      className={`hidden md:flex h-full shrink-0 flex-col overflow-x-hidden border-r ${SIDEBAR_THEME.rail.border} ${SIDEBAR_THEME.rail.bg} transition-[width] duration-200 ease-out motion-reduce:transition-none ${
        collapsed ? 'w-16' : 'w-72'
      }${className ? ` ${className}` : ''}`}
      aria-label="Primary navigation"
      onMouseEnter={() => setRailHovered(true)}
      onMouseLeave={() => setRailHovered(false)}
    >
      {/* Brand row */}
      <div className="flex h-[60px] items-center gap-3 px-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          <BrandChip collapsed={collapsed} railHovered={railHovered} logo={logo} onOpen={handleExpand} />
        </div>
        <span
          className={`min-w-0 flex-1 truncate text-sm font-semibold ${SIDEBAR_THEME.brand.wordmark} transition-opacity duration-150 ease-out motion-reduce:transition-none ${
            collapsed ? 'opacity-0' : 'opacity-100'
          }`}
          aria-hidden={collapsed ? true : undefined}
        >
          {brandName}
        </span>
        <button
          type="button"
          onClick={handleCollapse}
          tabIndex={collapsed ? -1 : 0}
          aria-label="Collapse sidebar"
          aria-hidden={collapsed ? true : undefined}
          title="Collapse sidebar"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${SIDEBAR_THEME.collapseButton.text} transition-opacity duration-150 ease-out ${SIDEBAR_THEME.collapseButton.hoverBg} ${SIDEBAR_THEME.collapseButton.hoverText} focus:outline-none focus-visible:ring-2 ${SIDEBAR_THEME.focusRing} motion-reduce:transition-none ${
            collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {/* Primary nav */}
      <nav className="mt-2 flex flex-col gap-0.5 px-3" aria-label="Primary sections">
        {sections.map((section) => (
          <SidebarNavRow
            key={section.id}
            icon={section.icon}
            label={section.label}
            collapsed={collapsed}
            active={activeSectionId === section.id}
            onClick={() => onSectionChange(section.id)}
          />
        ))}
      </nav>

      <SectionContent
        actions={sectionActions?.[activeSectionId]}
        groups={contextGroups}
        collapsed={collapsed}
        onLinkClick={onLinkClick}
        onLinkDelete={onLinkDelete}
        isLinkActive={isLinkActive}
        isLinkDeletable={isLinkDeletable}
        isLinkDisabled={isLinkDisabled}
      />

      {bottomAction && (
        <div className={`mt-auto border-t ${SIDEBAR_THEME.rail.border} px-3 py-3`}>
          <SidebarNavRow
            icon={bottomAction.icon}
            label={bottomAction.label}
            collapsed={collapsed}
            onClick={bottomAction.onClick}
          />
        </div>
      )}
    </aside>
  );
}

export default memo(Sidebar);
