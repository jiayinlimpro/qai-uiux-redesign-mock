import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getProject } from '@/data/api';
import { buttonClasses } from '@/components/ui/button';
import { LoadingState } from '@/components/StateViews';
import { useAsync } from '@/app/hooks/useAsync';
import { ProjectContext } from '@/app/projectContext';
import { to } from '@/app/routes';
import { ProjectLoadError } from './ProjectLoadError';
import { Masthead, SidebarToggle, useSidebarShortcut } from './SidebarParts';
import { ExploreLayoutContext } from './exploreLayout';
import { useSidebarCollapsed } from '@/app/hooks/useSidebarCollapsed';

/**
 * Shell C (docs/03-navigation.md): AI explore replaces the whole window. No project sidebar.
 * Header: ≡ · ← Back to project · AI explore · <project name>, the same static masthead as the project shell (D74).
 */
export function ExploreWorkspace() {
  const { projectId = '' } = useParams();
  const project = useAsync(() => getProject(projectId), [projectId]);
  const from = (useLocation().state as { from?: string } | null)?.from;
  // The chat list's full / mini state, remembered separately from the project sidebar (D71, D74).
  const [collapsed, toggleCollapsed] = useSidebarCollapsed('qai.exploreSidebarCollapsed');
  useSidebarShortcut(toggleCollapsed);

  if (project.status === 'error') return <ProjectLoadError error={project.error} onRetry={project.retry} />;

  return (
    <div className="flex h-full flex-col">
      <Masthead
        collapsed={collapsed}
        tone="chat"
        menu={<SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} what="chat list" />}
        lead={
          // Returns to the project screen AI explore was opened from; Overview otherwise.
          <Link to={from ?? to.overview(projectId)} className={buttonClasses({ size: 'sm', className: 'shrink-0' })}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to project
          </Link>
        }
      >
        <p className="shrink-0 text-h3">AI explore</p>
        <p className="truncate text-text-muted">{project.status === 'ready' ? project.data.name : 'Loading…'}</p>
      </Masthead>
      <main id="main" tabIndex={-1} className="relative min-h-0 flex-1 overflow-auto bg-bg focus:outline-none">
        {project.status === 'ready' ? (
          <ProjectContext.Provider value={project.data}>
            <ExploreLayoutContext.Provider value={{ collapsed }}>
              <Outlet />
            </ExploreLayoutContext.Provider>
          </ProjectContext.Provider>
        ) : (
          <LoadingState label="Loading project…" />
        )}
      </main>
    </div>
  );
}
