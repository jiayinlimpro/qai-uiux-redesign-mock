import type { Run } from '@/data/types';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { runStateLabels } from '@/lib/labels';

/** 5.3 Paused / interrupted run: run route while Paused or Interrupted (screens/06-runs.md). Built in Slice 6. */
export function PausedRunScreen({ run }: { run: Run }) {
  return (
    <PlaceholderScreen
      screenId="5.3"
      title={`${runStateLabels[run.state]} run · Run #${run.number}`}
      slice={6}
      details={`Stopped at test ${run.progress.done} of ${run.progress.total} · ${run.environment.name}`}
    />
  );
}
