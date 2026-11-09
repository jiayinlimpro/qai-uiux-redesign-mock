import { useParams } from 'react-router-dom';
import { getRun, NotFoundError } from '@/data/api';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { LiveRunScreen } from '@/screens/5-2-live-run/LiveRunScreen';
import { PausedRunScreen } from '@/screens/5-3-paused-run/PausedRunScreen';
import { RunResultsScreen } from '@/screens/6-1-run-results/RunResultsScreen';
import { useAsync } from './hooks/useAsync';
import { useItemCrumb, useProject } from './projectContext';
import { OverviewLink } from './WayBackLink';

/**
 * `/p/:projectId/runs/:runId` shows a different screen by run state (docs/03-navigation.md):
 * Running → 5.2 Live run · Paused/Interrupted → 5.3 · Completed → 6.1 Run results.
 */
export function RunRoute() {
  const { runId = '' } = useParams();
  const project = useProject();
  const run = useAsync(() => getRun(runId), [runId]);
  useItemCrumb(run.status === 'ready' ? `Run #${run.data.number}` : undefined);

  if (run.status === 'loading') return <LoadingState label="Loading run…" />;
  if (run.status === 'error') {
    const notFound = run.error instanceof NotFoundError;
    return (
      <ErrorState
        title={notFound ? 'Run not found' : "Couldn't load the run"}
        message={notFound ? 'It may have been deleted.' : run.error.message}
        onRetry={notFound ? undefined : run.retry}
      >
        <OverviewLink projectId={project.id} projectName={project.name} />
      </ErrorState>
    );
  }
  switch (run.data.state) {
    case 'running':
      return <LiveRunScreen run={run.data} />;
    case 'paused':
    case 'interrupted':
      return <PausedRunScreen run={run.data} />;
    case 'completed':
      return <RunResultsScreen run={run.data} />;
  }
}
