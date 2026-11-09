import { useSearchParams } from 'react-router-dom';
import type { Run } from '@/data/types';
import { listResults } from '@/data/api';
import { AsyncPlaceholderLinks, PlaceholderScreen } from '@/components/PlaceholderScreen';
import { to } from '@/app/routes';

/** 6.1 Run results + result detail: run route when Completed, `?result=` selects a result (screens/07-results.md). Built in Slice 7. */
export function RunResultsScreen({ run }: { run: Run }) {
  const resultId = useSearchParams()[0].get('result');
  return (
    <PlaceholderScreen
      screenId="6.1"
      title={`Run results · Run #${run.number}`}
      slice={7}
      details={`${run.environment.name} · ${resultId ? `Selected result: ${resultId}` : 'No result selected'}`}
    >
      <AsyncPlaceholderLinks
        what="results"
        load={() => listResults(run.id)}
        deps={[run.id]}
        toLinks={(results) =>
          results.slice(0, 3).flatMap((r) => [
            { label: `Select result ${r.id}`, to: to.run(run.projectId, run.id, r.id) },
            { label: `Open test of ${r.id}`, to: to.suiteTest(run.projectId, r.testId) },
          ])
        }
      />
    </PlaceholderScreen>
  );
}
