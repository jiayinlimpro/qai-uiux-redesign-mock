import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, type LucideIcon } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { to } from '@/app/routes';
import { cn } from '@/lib/utils';

/** Sidebar frame shared by the Projects shell and the project shell. */
export function SidebarFrame({ collapsed = false, children, footer }: { collapsed?: boolean; children: ReactNode; footer: ReactNode }) {
  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        'relative flex h-full shrink-0 flex-col border-r border-border bg-surface-muted transition-[width] duration-150',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
      )}
    >
      <div className={cn('flex min-h-0 flex-1 flex-col gap-2 py-3', collapsed ? 'items-center px-2' : 'px-2.5')}>{children}</div>
      <div className={cn('mx-2.5 border-t border-border py-3', collapsed && 'mx-2 flex justify-center')}>{footer}</div>
    </aside>
  );
}

/** QAI brand. Always links to All projects, expanded or collapsed (docs/03-navigation.md). */
export function BrandLink({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Tooltip label="All projects" className={collapsed ? undefined : 'self-start'}>
      <Link to={to.projects()} className="flex items-center gap-2 rounded-control px-1 py-1">
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-control bg-accent text-base font-semibold text-accent-contrast">
          Q
        </span>
        <span className={cn('text-h3', collapsed && 'sr-only')}>QAI</span>
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

/** Icon + label nav item. Collapsed: icon only, label stays as the accessible name and shows as a tooltip. */
export function NavItem({ to: target, icon: Icon, label, active, current = false, collapsed = false, state }: NavItemProps) {
  const link = (
    <Link
      to={target}
      state={state}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex h-9 items-center gap-3 rounded-control text-base',
        collapsed ? 'w-10 justify-center' : 'w-full px-3',
        active ? 'bg-accent-soft font-semibold text-accent-soft-text' : 'text-text hover:bg-bg',
      )}
    >
      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span className={cn(collapsed && 'sr-only')}>{label}</span>
    </Link>
  );
  return collapsed ? (
    <Tooltip label={label} describe={false}>
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
