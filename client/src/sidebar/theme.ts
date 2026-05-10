/**
 * SIDEBAR_THEME — the single source of color tokens for the sidebar package.
 *
 * To re-theme for a different brand/project, edit the Tailwind class strings
 * below. All other files in this package import from here; no colors should
 * be hard-coded anywhere else in the package.
 *
 * Values are Tailwind class fragments. Arbitrary values like `bg-[#1A1A1A]`
 * are fine as long as they live in the source so Tailwind's JIT can find them.
 */
export const SIDEBAR_THEME = {
  rail: {
    bg: 'bg-[#F5F5F3]',
    border: 'border-[#E5E5E3]',
  },
  brand: {
    chipBg: 'bg-[#1A1A1A]',
    chipText: 'text-white',
    chipHoverBg: 'bg-[#EEEEEC]',
    chipHoverText: 'text-stone-700',
    wordmark: 'text-[#1A1A1A]',
  },
  row: {
    activeBg: 'bg-[#E5E5E3]',
    activeText: 'text-[#1A1A1A]',
    defaultText: 'text-stone-700',
    mutedText: 'text-stone-600',
    defaultHover: 'hover:bg-[#EEEEEC] hover:text-[#1A1A1A]',
    mutedHover: 'hover:bg-[#EDEDEB] hover:text-[#1A1A1A]',
  },
  link: {
    activeBg: 'bg-[#E5E5E3]',
    activeText: 'text-[#1A1A1A]',
    hoverBg: 'hover:bg-[#EEEEEC]',
    defaultText: 'text-stone-800',
    emptyText: 'text-stone-400',
  },
  group: {
    headerText: 'text-stone-400',
    headerHover: 'hover:text-stone-500',
  },
  delete: {
    text: 'text-stone-400',
    hoverBg: 'hover:bg-stone-200/60',
    hoverText: 'hover:text-stone-700',
  },
  collapseButton: {
    text: 'text-stone-500',
    hoverBg: 'hover:bg-[#E5E5E3]',
    hoverText: 'hover:text-[#1A1A1A]',
  },
  tooltip: {
    bg: 'bg-[#1A1A1A]',
    text: 'text-white',
  },
  focusRing: 'focus-visible:ring-stone-300',
} as const;
