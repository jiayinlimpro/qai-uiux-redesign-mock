import { useCallback, useState } from 'react';
import { Link, Outlet, useLocation, useMatches, useParams } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, House, List, Play, SlidersHorizontal, Sparkles, type LucideIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { BrandLink, GlobalSettingsLink, NavItem, SidebarFrame } from './SidebarParts';
import { ProjectLoadError } from './ProjectLoadError';
import { SkipLink } from './SkipLink';

const sectionNav: { section: ProjectSection; icon: LucideIcon; to: (projectId: string) => string }[] = [
  { section: 'overview', icon: House, to: to.overview },
  { section: 'suites', icon: List, to: to.suites },
  { section: 'runs', icon: Play, to: to.runs },
  { section: 'knowledge', icon: BookOpen, to: to.knowledge },
  { section: 'project-settings', icon: SlidersHorizontal, to: to.projectSettings },
];

/**
 * Shell B (docs/03-navigation.md): every project screen except AI explore.
 * Full-height sidebar (brand, project card, sections, Global settings) with an edge toggle; top bar with breadcrumb + AI explore.
 */
export function ProjectShell() {
  const { projectId = '' } = useParams();
  const project = useAsync(() => getProject(projectId), [projectId]);
  // After an edit (Knowledge, Project settings) screens call reload; the current project stays on screen meanwhile.
  const [latest, setLatest] = useState<Project | null>(null);
  const reload = useCallback(async () => {
    const next = await getProject(projectId);
    setLatest(next);
    return next;
  }, [projectId]);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [itemCrumb, setItemCrumb] = useState<string | undefined>();
  const { section, crumb } = resolveHandle(useMatches().map((m) => m.handle));
  const { pathname } = useLocation();

  if (project.status === 'error') return <ProjectLoadError error={project.error} onRetry={project.retry} />;

  const fresh = project.status === 'ready' ? project.data : undefined;
  const loaded: Project | undefined = latest && fresh && latest.id === fresh.id ? latest : fresh;

  const crumbs: Crumb[] = [{ label: loaded?.name ?? 'Loading…', to: to.overview(projectId) }];
  if (section) crumbs.push({ label: sectionLabels[section], to: sectionNav.find((n) => n.section === section)!.to(projectId) });
  if (crumb) crumbs.push({ label: crumb });
  if (itemCrumb) crumbs.push({ label: itemCrumb });

  return (
    <div className="flex h-full">
      <SkipLink />
      <SidebarFrame collapsed={collapsed} footer={<GlobalSettingsLink collapsed={collapsed} />}>
        <BrandLink collapsed={collapsed} />
        {!collapsed && (
          <div className="rounded-card border border-border bg-surface px-3 py-2">
            <Link to={to.projects()} className="inline-flex items-center gap-1 rounded-control text-label font-normal text-text-muted hover:text-text">
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
              All projects
            </Link>
            <p className="truncate text-base font-semibold" title={loaded?.name}>
              {loaded?.name ?? <span className="text-text-muted">Loading…</span>}
            </p>
          </div>
        )}
        <nav aria-label="Project" className={cn('flex flex-col gap-1', collapsed ? 'items-center' : 'mt-1')}>
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
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="absolute -right-3.5 top-3.5 z-20 flex h-7 w-7 items-center justify-center rounded-pill border border-border bg-surface text-text-muted hover:text-text"
        >
          {collapsed ? <ChevronRight aria-hidden="true" className="h-4 w-4" /> : <ChevronLeft aria-hidden="true" className="h-4 w-4" />}
        </button>
      </SidebarFrame>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-topbar shrink-0 items-center justify-between gap-4 border-b border-border bg-surface pl-6 pr-5">
          <Breadcrumb items={crumbs} />
          <Link to={to.explore(projectId)} state={{ from: pathname }} className={buttonClasses({ variant: 'primary', className: 'shrink-0' })}>
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            AI explore
          </Link>
        </header>
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
  );
}
