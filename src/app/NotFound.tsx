import { matchPath, useLocation } from 'react-router-dom';
import { ErrorState } from '@/components/StateViews';
import { WayBackLink } from './WayBackLink';

/** Any address that matches no route. Links to the project's Overview if the address names an existing project. */
export function NotFound() {
  const projectId = matchPath('/p/:projectId/*', useLocation().pathname)?.params.projectId;
  return (
    <main id="main" className="flex h-full items-start justify-center bg-bg pt-24">
      <ErrorState title="Page not found" message="This address doesn't match any screen.">
        <WayBackLink projectId={projectId} />
      </ErrorState>
    </main>
  );
}
