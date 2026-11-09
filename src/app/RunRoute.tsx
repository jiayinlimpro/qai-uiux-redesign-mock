import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRun, NotFoundError, subscribeRun, type Narration } from '@/data/api';
import type { Result, Run } from '@/data/types';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { LiveRunScreen } from '@/screens/5-2-live-run/LiveRunScreen';
import { PausedRunScreen } from '@/screens/5-3-paused-run/PausedRunScreen';
import { RunResultsScreen } from '@/screens/6-1-run-results/RunResultsScreen';
import { useAsync } from './hooks/useAsync';
import { useItemCrumb, useProject } from './projectContext';
import { OverviewLink } from './WayBackLink';

export interface LiveState {
  narration: Narration | null;
  /** Results that arrived while watching (the screen merges them with what it loaded). */
  newResults: Result[];
}

/**
 * `/p/:projectId/runs/:runId` shows a different screen by run state (docs/03-navigation.md), and follows live events:
 * Running → 5.2 Live run · Paused/Interrupted → 5.3 · Completed → 6.1 Run results.
 */
export function RunRoute() {
  const project = useProject();
  const { runId = '' } = useParams();
  const loaded = useAsync(() => getRun(runId), [runId]);
  const [live, setLive] = useState<Run | null>(null);
  const [state, setState] = useState<LiveState>({ narration: null, newResults: [] });

  useEffect(() => {
    setLive(null);
    setState({ narration: null, newResults: [] });
    return subscribeRun(runId, (e) => {
      if (e.kind === 'progress') setLive(e.run);
      else if (e.kind === 'narration') setState((s) => ({ ...s, narration: e.narration }));
      else setState((s) => ({ ...s, newResults: [...s.newResults, e.result] }));
    });
  }, [runId]);

  const run = live ?? (loaded.status === 'ready' ? loaded.data : null);
  useItemCrumb(run ? `Run #${run.number}` : undefined);

  if (!run && loaded.status === 'loading') return <LoadingState label="Loading run…" />;
  if (!run && loaded.status === 'error') {
    const notFound = loaded.error instanceof NotFoundError;
    return (
      <ErrorState title={notFound ? 'Run not found' : "Couldn't load the run"} message={notFound ? 'It may have been deleted.' : loaded.error.message} onRetry={notFound ? undefined : loaded.retry}>
        <OverviewLink projectId={project.id} projectName={project.name} />
      </ErrorState>
    );
  }
  if (!run) return null;
  switch (run.state) {
    case 'running':
      return <LiveRunScreen run={run} live={state} />;
    case 'paused':
    case 'interrupted':
      return <PausedRunScreen run={run} />;
    case 'completed':
      return <RunResultsScreen run={run} />;
  }
}
