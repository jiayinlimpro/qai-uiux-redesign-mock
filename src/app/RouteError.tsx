import { useParams, useRouteError } from 'react-router-dom';
import { ErrorState } from '@/components/StateViews';
import { WayBackLink } from './WayBackLink';

/** Shown when a screen crashes, instead of a blank window. Not a loading error, so no Retry. */
export function RouteError() {
  const error = useRouteError();
  const { projectId } = useParams();
  return (
    <main id="main" className="flex h-full items-start justify-center bg-bg pt-24">
      <ErrorState title="Something went wrong" message={error instanceof Error ? error.message : undefined}>
        <WayBackLink projectId={projectId} />
      </ErrorState>
    </main>
  );
}
