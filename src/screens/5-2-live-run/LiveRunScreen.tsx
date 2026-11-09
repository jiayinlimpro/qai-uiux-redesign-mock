import type { Run } from '@/data/types';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

/** 5.2 Live run: run route while Running (screens/06-runs.md). Built in Slice 6. */
export function LiveRunScreen({ run }: { run: Run }) {
  return <PlaceholderScreen screenId="5.2" title={`Live run · Run #${run.number}`} slice={6} details={`${run.scopeLabel} · ${run.environment.name}`} />;
}
