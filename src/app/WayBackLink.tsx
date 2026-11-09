import { Link } from 'react-router-dom';
import { getProject } from '@/data/api';
import type { ID } from '@/data/types';
import { buttonClasses } from '@/components/ui/button';
import { useAsync } from './hooks/useAsync';
import { to } from './routes';

/**
 * Way out of a not-found / error screen (docs/03-navigation.md § Not found and error screens):
 * the project's Overview if the project still exists, otherwise All projects.
 * Use when the screen does not know whether the project exists (unknown address, crash).
 */
export function WayBackLink({ projectId }: { projectId: ID | undefined }) {
  const project = useAsync(() => (projectId ? getProject(projectId) : Promise.reject(new Error('no project'))), [projectId]);
  if (project.status === 'loading') return null;
  if (project.status === 'ready') {
    return (
      <Link to={to.overview(project.data.id)} className={buttonClasses({ variant: 'primary' })}>
        Go to {project.data.name} overview
      </Link>
    );
  }
  return (
    <Link to={to.projects()} className={buttonClasses({ variant: 'primary' })}>
      All projects
    </Link>
  );
}

/** Inside a loaded project the project is known to exist: always its Overview. */
export function OverviewLink({ projectId, projectName }: { projectId: ID; projectName: string }) {
  return (
    <Link to={to.overview(projectId)} className={buttonClasses()}>
      Go to {projectName} overview
    </Link>
  );
}
