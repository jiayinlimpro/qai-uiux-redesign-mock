import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getProject } from '@/data/api';
import { buttonClasses } from '@/components/ui/button';
import { LoadingState } from '@/components/StateViews';
import { useAsync } from '@/app/hooks/useAsync';
import { ProjectContext } from '@/app/projectContext';
import { to } from '@/app/routes';
import { ProjectLoadError } from './ProjectLoadError';

/**
 * Shell C (docs/03-navigation.md): AI explore replaces the whole window. No project sidebar.
 * Header: ← Back to project · AI explore · <project name>. Chat list + chat are the screen (Slice 8).
 */
export function ExploreWorkspace() {
  const { projectId = '' } = useParams();
  const project = useAsync(() => getProject(projectId), [projectId]);
  const from = (useLocation().state as { from?: string } | null)?.from;

  if (project.status === 'error') return <ProjectLoadError error={project.error} onRetry={project.retry} />;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-topbar shrink-0 items-center gap-4 border-b border-border bg-surface px-5">
        {/* Returns to the project screen AI explore was opened from; Overview otherwise. */}
        <Link to={from ?? to.overview(projectId)} className={buttonClasses({ size: 'sm' })}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to project
        </Link>
        <p className="text-h3">AI explore</p>
        <p className="truncate text-text-muted">{project.status === 'ready' ? project.data.name : 'Loading…'}</p>
      </header>
      <main id="main" tabIndex={-1} className="relative min-h-0 flex-1 overflow-auto bg-bg focus:outline-none">
        {project.status === 'ready' ? (
          <ProjectContext.Provider value={project.data}>
            <Outlet />
          </ProjectContext.Provider>
        ) : (
          <LoadingState label="Loading project…" />
        )}
      </main>
    </div>
  );
}
