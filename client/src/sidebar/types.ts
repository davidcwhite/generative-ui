import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface SidebarSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface SidebarLink {
  id: string;
  label: string;
}

export interface SidebarContextGroup {
  id: string;
  title: string;
  links: SidebarLink[];
}

export interface SidebarActionRow {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'default' | 'muted';
}

export interface SidebarProps {
  /** Brand wordmark text. Default: 'Primary Flow'. */
  brandName?: string;
  /** Brand mark rendered inside the collapsed chip. Default: <PFLogoMark />. */
  logo?: ReactNode;

  /** Top-level navigation items (Agents / Documents / Data etc.). */
  sections: SidebarSection[];
  activeSectionId: string;
  onSectionChange: (id: string) => void;

  /**
   * Optional pinned action rows rendered at the top of the section content
   * (above the scrollable groups). Keyed by section id.
   */
  sectionActions?: Record<string, SidebarActionRow[]>;

  /** Scrollable groups + links for the active section. Host derives per section. */
  contextGroups: SidebarContextGroup[];

  onLinkClick?: (link: SidebarLink, group: SidebarContextGroup) => void;
  onLinkDelete?: (link: SidebarLink) => void;
  isLinkActive?: (link: SidebarLink) => boolean;
  isLinkDeletable?: (link: SidebarLink) => boolean;
  isLinkDisabled?: (link: SidebarLink) => boolean;

  /** Bottom-anchored action row (e.g. Logout). */
  bottomAction?: SidebarActionRow;

  /** Controlled collapsed state. Omit for uncontrolled. */
  collapsed?: boolean;
  /** Initial collapsed state when uncontrolled. Default: false. */
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;

  /** Extra classes on the outer <aside>. */
  className?: string;
}
