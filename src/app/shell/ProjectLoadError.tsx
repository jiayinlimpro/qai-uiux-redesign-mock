import { Link } from 'react-router-dom';
import { NotFoundError } from '@/data/api';
import { buttonClasses } from '@/components/ui/button';
import { ErrorState } from '@/components/StateViews';
import { to } from '@/app/routes';

/** Shown instead of a project shell when its project can't be loaded. */
export function ProjectLoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const notFound = error instanceof NotFoundError;
  return (
    <main className="flex h-full items-start justify-center bg-bg pt-24">
      <ErrorState
        title={notFound ? 'Project not found' : "Couldn't load the project"}
        message={notFound ? 'It may have been deleted or the link is out of date.' : error.message}
        onRetry={notFound ? undefined : onRetry}
      >
        <Link to={to.projects()} className={buttonClasses({ variant: notFound ? 'primary' : 'secondary' })}>
          All projects
        </Link>
      </ErrorState>
    </main>
  );
}
