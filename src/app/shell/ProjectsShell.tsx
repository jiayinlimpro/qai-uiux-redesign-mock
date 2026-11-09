import { Outlet, useMatch } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { paths, to } from '@/app/routes';
import { BrandLink, GlobalSettingsLink, NavItem, SidebarFrame } from './SidebarParts';
import { SkipLink } from './SkipLink';

/**
 * Shell A (docs/03-navigation.md): slim app sidebar for Projects.
 * QAI brand on top, "Projects" active, Global settings pinned bottom-left. No collapse toggle (not in the spec).
 */
export function ProjectsShell() {
  const onProjects = useMatch(paths.projects) !== null;
  return (
    <div className="flex h-full">
      <SkipLink />
      <SidebarFrame footer={<GlobalSettingsLink />}>
        <BrandLink />
        <nav aria-label="Main" className="mt-2">
          <NavItem to={to.projects()} icon={LayoutGrid} label="Projects" active current={onProjects} />
        </nav>
      </SidebarFrame>
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-auto bg-bg focus:outline-none">
        <Outlet />
      </main>
    </div>
  );
}
