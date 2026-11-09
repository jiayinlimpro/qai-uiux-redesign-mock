import { Outlet } from 'react-router-dom';
import { listTests } from '@/data/api';
import { AsyncPlaceholderLinks, PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';

/**
 * 3.1 Suites (screens/04-suites.md): list + test detail. Built in Slice 4.
 * Child routes: test detail (`suites/:testId`) and 3.3 Import (`suites/import`).
 */
export function SuitesScreen() {
  const project = useProject();
  return (
    <PlaceholderScreen screenId="3.1" title="Suites" slice={4}>
      <AsyncPlaceholderLinks
        what="tests"
        load={() => listTests(project.id)}
        deps={[project.id]}
        toLinks={(tests) => {
          // A few in a suite, plus everything in Not in a suite (AI explore tests, e.g. the Likely bug one).
          const sample = [...tests.filter((t) => t.suiteId !== null).slice(0, 2), ...tests.filter((t) => t.suiteId === null)];
          return [
            ...sample.map((t) => ({ label: `${t.testId} ${t.title}`, to: to.suiteTest(project.id, t.id) })),
            { label: 'New test', to: to.newTest(project.id) },
            { label: 'Import', to: to.importTests(project.id) },
          ];
        }}
      />
      <Outlet />
    </PlaceholderScreen>
  );
}
