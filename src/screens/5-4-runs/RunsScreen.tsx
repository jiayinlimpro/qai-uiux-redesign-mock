import { listRuns } from '@/data/api';
import { AsyncPlaceholderLinks, PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { runStateLabels } from '@/lib/labels';

/** 5.4 Runs list (screens/06-runs.md). Built in Slice 6. */
export function RunsScreen() {
  const project = useProject();
  return (
    <PlaceholderScreen screenId="5.4" title="Runs" slice={6}>
      <AsyncPlaceholderLinks
        what="runs"
        load={() => listRuns(project.id)}
        deps={[project.id]}
        toLinks={(runs) => runs.map((r) => ({ label: `Run #${r.number} · ${runStateLabels[r.state]}`, to: to.run(project.id, r.id) }))}
      />
    </PlaceholderScreen>
  );
}
