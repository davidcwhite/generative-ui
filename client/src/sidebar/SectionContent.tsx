import { useCallback, useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import type { SidebarActionRow, SidebarContextGroup, SidebarLink } from './types';
import { SidebarNavRow } from './SidebarNavRow';
import { SIDEBAR_THEME } from './theme';

/**
 * The scrollable section panel. Renders:
 *   1) An optional pinned action block (e.g. "New chat", "Search chats") that
 *      stays fixed at the top.
 *   2) A scrollable list of context groups, each with a collapsible header
 *      and a list of links.
 *
 * All domain decisions (which link is active, deletable, disabled) are
 * delegated to host-supplied predicates so the package stays domain-agnostic.
 */
export function SectionContent({
  actions,
  groups,
  collapsed,
  onLinkClick,
  onLinkDelete,
  isLinkActive,
  isLinkDeletable,
  isLinkDisabled,
}: {
  actions?: SidebarActionRow[];
  groups: SidebarContextGroup[];
  collapsed: boolean;
  onLinkClick?: (link: SidebarLink, group: SidebarContextGroup) => void;
  onLinkDelete?: (link: SidebarLink) => void;
  isLinkActive?: (link: SidebarLink) => boolean;
  isLinkDeletable?: (link: SidebarLink) => boolean;
  isLinkDisabled?: (link: SidebarLink) => boolean;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  }, []);

  return (
    <div
      className={`mt-5 flex flex-1 flex-col overflow-hidden transition-opacity duration-150 ease-out motion-reduce:transition-none ${
        collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-hidden={collapsed ? true : undefined}
    >
      {actions && actions.length > 0 && (
        <div className="shrink-0 space-y-0.5 px-3 pb-3">
          {actions.map((action) => (
            <SidebarNavRow
              key={action.label}
              icon={action.icon}
              label={action.label}
              collapsed={false}
              tone={action.tone ?? 'default'}
              onClick={action.onClick}
            />
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        {groups.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.id] ?? false;
          return (
            <section key={group.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider ${SIDEBAR_THEME.group.headerText} transition-colors ${SIDEBAR_THEME.group.headerHover} focus:outline-none focus-visible:ring-2 ${SIDEBAR_THEME.focusRing}`}
                aria-expanded={!isGroupCollapsed}
              >
                <span>{group.title}</span>
                <span
                  className={`transition-transform duration-150 ease-out ${
                    isGroupCollapsed ? '' : 'rotate-90'
                  }`}
                >
                  <ChevronRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                </span>
              </button>

              {!isGroupCollapsed && (
                <div className="flex flex-col">
                  {group.links.map((link) => {
                    const active = isLinkActive?.(link) ?? false;
                    const disabled = isLinkDisabled?.(link) ?? false;
                    const deletable = isLinkDeletable?.(link) ?? false;

                    return (
                      <div
                        key={link.id}
                        className={`group/item flex items-center rounded-lg transition-colors ${
                          active ? SIDEBAR_THEME.link.activeBg : SIDEBAR_THEME.link.hoverBg
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (disabled) return;
                            onLinkClick?.(link, group);
                          }}
                          disabled={disabled}
                          className={`min-w-0 flex-1 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${SIDEBAR_THEME.focusRing} disabled:cursor-default`}
                          aria-current={active ? 'page' : undefined}
                        >
                          <span
                            className={`block truncate text-sm ${
                              disabled
                                ? SIDEBAR_THEME.link.emptyText
                                : active
                                ? `font-medium ${SIDEBAR_THEME.link.activeText}`
                                : SIDEBAR_THEME.link.defaultText
                            }`}
                          >
                            {link.label}
                          </span>
                        </button>
                        {deletable && onLinkDelete && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onLinkDelete(link);
                            }}
                            className={`mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${SIDEBAR_THEME.delete.text} opacity-0 transition-opacity ${SIDEBAR_THEME.delete.hoverBg} ${SIDEBAR_THEME.delete.hoverText} focus:opacity-100 focus:outline-none focus:ring-2 ${SIDEBAR_THEME.focusRing} group-hover/item:opacity-100`}
                            title={`Delete ${link.label}`}
                            aria-label={`Delete ${link.label}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
