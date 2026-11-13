import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Settings, type LucideIcon } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { QaiMark } from '@/components/QaiMark';
import { to } from '@/app/routes';
import { cn } from '@/lib/utils';

/*
 * Sidebar geometry (D74). One icon column, centred 32 px from the window edge, in both states:
 * the column is 64 px wide (the collapsed rail and the menu button's cell), content inset 12 px, every row 40 px high.
 * Expanded rows put their icon at the same x (12 + 11 px padding), so nothing moves when the sidebar collapses.
 */

interface MastheadProps {
  /** The menu button (SidebarToggle). */
  menu: ReactNode;
  /** The item right after the menu button (QAI brand, or Back to project). */
  lead: ReactNode;
  collapsed: boolean;
  /** The project sidebar (Projects and project shells) or the AI explore chat list. */
  tone?: 'sidebar' | 'chat';
  children?: ReactNode;
}

/* Literal class names so Tailwind generates them. Line: starts 1 px inside the sidebar's edge to meet its right border. */
const mastheadTone = {
  sidebar: {
    bg: 'bg-surface-muted',
    content: 'left-[calc(theme(spacing.sidebar)+1.5rem)]',
    line: { expanded: 'left-[calc(theme(spacing.sidebar)-1px)]', collapsed: 'left-[calc(theme(spacing.sidebar-collapsed)-1px)]' },
  },
  chat: {
    bg: 'bg-bg',
    content: 'left-[calc(18rem+1.5rem)]',
    line: { expanded: 'left-72', collapsed: 'left-sidebar-collapsed' },
  },
} as const;

/**
 * Masthead (D74). A static bar in the sidebar's colour: the menu button, the lead item and the rest (breadcrumb, actions)
 * never move or change when the sidebar collapses, as on YouTube. Only the line under the bar moves: it starts at the
 * sidebar's edge, so the bar's left part reads as the top of the sidebar (no line under "≡"; under the brand only when
 * collapsed) and the rest as the top of the page. The rest starts where expanded content starts, in both states.
 */
export function Masthead({ menu, lead, collapsed, tone = 'sidebar', children }: MastheadProps) {
  const t = mastheadTone[tone];
  return (
    <header className={cn('relative flex h-topbar shrink-0 items-center', t.bg)}>
      <div className="flex w-sidebar-collapsed shrink-0 justify-center">{menu}</div>
      <div className="ml-2 flex shrink-0 items-center">{lead}</div>
      <div className={cn('absolute inset-y-0 right-5 flex min-w-0 items-center gap-3', t.content)}>{children}</div>
      <span
        aria-hidden="true"
        className={cn('pointer-events-none absolute bottom-0 right-0 h-px bg-border transition-[left] duration-150', collapsed ? t.line.collapsed : t.line.expanded)}
      />
    </header>
  );
}

/** Sidebar frame shared by the Projects shell and the project shell; sits under the masthead. Collapsed = 64 px icon rail. */
export function SidebarFrame({ collapsed = false, children, footer }: { collapsed?: boolean; children: ReactNode; footer: ReactNode }) {
  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        'relative flex h-full shrink-0 flex-col border-r border-border bg-surface-muted transition-[width] duration-150',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
      )}
    >
      {/* No scrolling while collapsed: the rail is short and its tooltips must not be clipped. */}
      <div className={cn('flex min-h-0 flex-1 flex-col gap-1 px-3 py-3', !collapsed && 'overflow-y-auto')}>{children}</div>
      <div className="mx-3 border-t border-border py-3">{footer}</div>
    </aside>
  );
}

/** QAI brand. Always links to All projects (docs/03-navigation.md). The same size in both sidebar states (D74). */
export function BrandLink() {
  return (
    <Tooltip label="All projects" side="bottom" className="shrink-0">
      <Link to={to.projects()} className="flex items-center gap-2 rounded-control">
        <QaiMark />
        <span className="text-h3">QAI</span>
      </Link>
    </Tooltip>
  );
}

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  /** true when this item is exactly the current page (not just the current section). */
  current?: boolean;
  collapsed?: boolean;
  state?: unknown;
}

/**
 * Icon + label nav row, 40 px high in both states, icon in the same spot (D74). Collapsed: icon only; the label stays
 * the link's accessible name and shows as a tooltip on hover and keyboard focus.
 */
export function NavItem({ to: target, icon: Icon, label, active, current = false, collapsed = false, state }: NavItemProps) {
  const link = (
    <Link
      to={target}
      state={state}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex h-10 items-center rounded-control',
        collapsed ? 'w-10 justify-center' : 'w-full gap-3 pl-[11px] pr-3 text-base',
        active ? 'bg-accent-soft font-semibold text-accent-soft-text' : 'text-text hover:bg-bg',
      )}
    >
      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span>
    </Link>
  );
  return collapsed ? (
    <Tooltip label={label} describe={false} className="w-10">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

/** Global settings pinned bottom-left. Remembers where it was opened from so "Back" can return there (screens/01-global.md 2.3). */
export function GlobalSettingsLink({ collapsed = false }: { collapsed?: boolean }) {
  const location = useLocation();
  return (
    <NavItem
      to={to.globalSettings()}
      icon={Settings}
      label="Global settings"
      active={false}
      collapsed={collapsed}
      state={{ from: location.pathname + location.search }}
    />
  );
}

/** "Ctrl+B" or "⌘B": the desktop convention for showing and hiding a sidebar, shown in the menu button's tooltip. */
export const SIDEBAR_SHORTCUT = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘B' : 'Ctrl+B';

/**
 * Menu button "≡" (D74): top of the sidebar column, the same spot in both states (YouTube, Outlook). Collapses the
 * sidebar to its icon rail and back; the tooltip names the shortcut. 40 px, centred on the sidebar's icon column.
 */
export function SidebarToggle({ collapsed, onToggle, what = 'sidebar' }: { collapsed: boolean; onToggle: () => void; what?: string }) {
  const label = collapsed ? `Expand ${what}` : `Collapse ${what}`;
  return (
    <Tooltip label={`${label} (${SIDEBAR_SHORTCUT})`} describe={false} side="bottom" className="shrink-0">
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={!collapsed}
        aria-keyshortcuts="Control+B Meta+B"
        className="flex h-10 w-10 items-center justify-center rounded-pill text-text hover:bg-bg"
      >
        <Menu aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </Tooltip>
  );
}

/** Ctrl+B / ⌘B toggles the sidebar of the current shell. Ignored while typing in a field or while a dialog is open. */
export function useSidebarShortcut(toggle: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'b') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      if (document.querySelector('dialog[open]')) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
}
