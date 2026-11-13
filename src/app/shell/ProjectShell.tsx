import { useCallback, useState } from 'react';
import { Link, Outlet, useLocation, useMatches, useParams } from 'react-router-dom';
import { BookOpen, House, List, Play, Server, SlidersHorizontal, Sparkles, type LucideIcon } from 'lucide-react';
import { getProject } from '@/data/api';
import type { Project } from '@/data/types';
import { buttonClasses } from '@/components/ui/button';
import { Breadcrumb, type Crumb } from '@/components/ui/breadcrumb';
import { LoadingState } from '@/components/StateViews';
import { useAsync } from '@/app/hooks/useAsync';
import { useSidebarCollapsed } from '@/app/hooks/useSidebarCollapsed';
import { ItemCrumbContext, ProjectContext, ProjectReloadContext } from '@/app/projectContext';
import { resolveHandle, sectionLabels, type ProjectSection } from '@/app/routeHandle';
import { to } from '@/app/routes';
import { BrandLink, GlobalSettingsLink, Masthead, NavItem, SidebarFrame, SidebarToggle, useSidebarShortcut } from './SidebarParts';
import { ProjectLoadError } from './ProjectLoadError';
import { SkipLink } from './SkipLink';

const sectionNav: { section: ProjectSection; icon: LucideIcon; to: (projectId: string) => string }[] = [
  { section: 'overview', icon: House, to: to.overview },
  { section: 'suites', icon: List, to: to.suites },
  { section: 'runs', icon: Play, to: to.runs },
  { section: 'environments', icon: Server, to: to.environments }, // D72: above Knowledge
  { section: 'knowledge', icon: BookOpen, to: to.knowledge },
  { section: 'project-settings', icon: SlidersHorizontal, to: to.projectSettings },
];

/**
 * Shell B (docs/03-navigation.md): every project screen except AI explore.
 * Masthead (menu button, brand, breadcrumb, AI explore; D74); under it the sidebar (sections, Global settings; collapses
 * to a 64 px icon rail) and the content. The breadcrumb starts at All projects, so it also names the project (D75).
 */
export function ProjectShell() {
  const { projectId = '' } = useParams();
  const project = useAsync(() => getProject(projectId), [projectId]);
  // After an edit (Environments, Project settings) screens call reload; the current project stays on screen meanwhile.
  const [latest, setLatest] = useState<Project | null>(null);
  const reload = useCallback(async () => {
    const next = await getProject(projectId);
    setLatest(next);
    return next;
  }, [projectId]);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  useSidebarShortcut(toggleCollapsed);
  const [itemCrumb, setItemCrumb] = useState<string | undefined>();
  const { section, crumb } = resolveHandle(useMatches().map((m) => m.handle));
  const { pathname } = useLocation();

  if (project.status === 'error') return <ProjectLoadError error={project.error} onRetry={project.retry} />;

  const fresh = project.status === 'ready' ? project.data : undefined;
  const loaded: Project | undefined = latest && fresh && latest.id === fresh.id ? latest : fresh;

  // D75: one line for "where am I": All projects / project / section / item (replaces the sidebar's project card).
  const crumbs: Crumb[] = [
    { label: 'All projects', to: to.projects() },
    { label: loaded?.name ?? 'Loading…', to: to.overview(projectId) },
  ];
  if (section) crumbs.push({ label: sectionLabels[section], to: sectionNav.find((n) => n.section === section)!.to(projectId) });
  if (crumb) crumbs.push({ label: crumb });
  if (itemCrumb) crumbs.push({ label: itemCrumb });

  return (
    <div className="flex h-full flex-col">
      <SkipLink />
      {/* D74: the menu button and brand stay in one spot whether the sidebar is full or a rail. */}
      <Masthead collapsed={collapsed} menu={<SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />} lead={<BrandLink />}>
        <Breadcrumb items={crumbs} />
        <Link to={to.explore(projectId)} state={{ from: pathname }} className={buttonClasses({ variant: 'primary', className: 'ml-auto shrink-0' })}>
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          AI explore
        </Link>
      </Masthead>

      <div className="flex min-h-0 flex-1">
      <SidebarFrame collapsed={collapsed} footer={<GlobalSettingsLink collapsed={collapsed} />}>
        <nav aria-label="Project" className="flex w-full flex-col gap-1">
          {sectionNav.map((item) => {
            const href = item.to(projectId);
            return (
              <NavItem
                key={item.section}
                to={href}
                icon={item.icon}
                label={sectionLabels[item.section]}
                active={section === item.section}
                current={pathname === href}
                collapsed={collapsed}
              />
            );
          })}
        </nav>
      </SidebarFrame>

      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main" tabIndex={-1} className="relative min-h-0 flex-1 overflow-auto bg-bg focus:outline-none">
          {loaded ? (
            <ProjectContext.Provider value={loaded}>
            <ProjectReloadContext.Provider value={reload}>
              <ItemCrumbContext.Provider value={setItemCrumb}>
                <Outlet />
              </ItemCrumbContext.Provider>
            </ProjectReloadContext.Provider>
            </ProjectContext.Provider>
          ) : (
            <LoadingState label="Loading project…" />
          )}
        </main>
      </div>
      </div>
    </div>
  );
}
