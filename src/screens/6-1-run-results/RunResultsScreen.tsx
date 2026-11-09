import { useSearchParams } from 'react-router-dom';
import type { Run } from '@/data/types';
import { listResults, listTests } from '@/data/api';
import { AsyncPlaceholderLinks, PlaceholderScreen } from '@/components/PlaceholderScreen';
import { to } from '@/app/routes';
import { resultTestLabel } from '@/lib/suiteRules';

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
        load={async () => {
          const [results, tests] = await Promise.all([listResults(run.id), listTests(run.projectId)]);
          return { results, testsById: new Map(tests.map((t) => [t.id, t])) };
        }}
        deps={[run.id]}
        toLinks={({ results, testsById }) =>
          results.slice(0, 4).flatMap((r) => {
            // Current display ID while the test exists; the snapshot from the run once it is deleted (D46).
            const label = resultTestLabel(r, testsById);
            const name = `${label.testId} ${label.title}${label.deleted ? ' (deleted)' : ''}`;
            return [
              { label: `Select result: ${name}`, to: to.run(run.projectId, run.id, r.id) },
              ...(label.deleted
                ? []
                : [
                    { label: `Open test ${label.testId}`, to: to.suiteTest(run.projectId, r.testId) },
                    { label: `Edit ${label.testId} (opened from this result)`, to: to.editTest(run.projectId, r.testId, r.id) },
                  ]),
            ];
          })
        }
      />
    </PlaceholderScreen>
  );
}
