import { Outlet, useMatch } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { paths, to } from '@/app/routes';
import { useSidebarCollapsed } from '@/app/hooks/useSidebarCollapsed';
import { BrandLink, GlobalSettingsLink, Masthead, NavItem, SidebarFrame, SidebarToggle, useSidebarShortcut } from './SidebarParts';
import { SkipLink } from './SkipLink';

/**
 * Shell A (docs/03-navigation.md): Projects. Same masthead as the project shell (menu button + QAI brand in one fixed
 * spot, D74), slim app sidebar under it ("Projects", Global settings pinned bottom-left). The sidebar shares
 * the project sidebar's remembered full / mini state.
 */
export function ProjectsShell() {
  const onProjects = useMatch(paths.projects) !== null;
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  useSidebarShortcut(toggleCollapsed);
  return (
    <div className="flex h-full flex-col">
      <SkipLink />
      <Masthead collapsed={collapsed} menu={<SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />} lead={<BrandLink />} />
      <div className="flex min-h-0 flex-1">
        <SidebarFrame collapsed={collapsed} footer={<GlobalSettingsLink collapsed={collapsed} />}>
          <nav aria-label="Main" className="flex w-full flex-col gap-1">
            <NavItem to={to.projects()} icon={LayoutGrid} label="Projects" active current={onProjects} collapsed={collapsed} />
          </nav>
        </SidebarFrame>
        <main id="main" tabIndex={-1} className="relative min-w-0 flex-1 overflow-auto bg-bg focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
