import { useParams, useSearchParams } from 'react-router-dom';
import { getTest, NotFoundError } from '@/data/api';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { PlaceholderLinks, type PlaceholderLink } from '@/components/PlaceholderScreen';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { to, type TestTab } from '@/app/routes';
import { OverviewLink } from '@/app/WayBackLink';

const tabs: { tab: TestTab; label: string }[] = [
  { tab: 'definition', label: 'Definition' },
  { tab: 'test-data', label: 'Test data' },
  { tab: 'visual-check', label: 'Visual check' },
  { tab: 'history', label: 'History' },
];

/** 3.1 test detail pane with tabs (screens/04-suites.md). Placeholder; built in Slice 4. */
export function TestDetail() {
  const project = useProject();
  const { testId = '' } = useParams();
  const [search] = useSearchParams();
  const tab = tabs.find((t) => t.tab === search.get('tab')) ?? tabs[0]!;
  const test = useAsync(() => getTest(testId), [testId]);

  if (test.status === 'loading') return <LoadingState label="Loading test…" />;
  if (test.status === 'error') {
    const notFound = test.error instanceof NotFoundError;
    return (
      <ErrorState
        title={notFound ? 'Test not found' : "Couldn't load the test"}
        message={notFound ? 'It may have been deleted.' : test.error.message}
        onRetry={notFound ? undefined : test.retry}
      >
        <OverviewLink projectId={project.id} projectName={project.name} />
      </ErrorState>
    );
  }

  const t = test.data;
  const links: PlaceholderLink[] = [
    ...tabs.map((x) => ({ label: `${x.label} tab`, to: to.suiteTest(project.id, t.id, x.tab) })),
    { label: 'Edit test', to: to.editTest(project.id, t.id) },
  ];
  if (t.aiExploreFinding) {
    // BR-EXPLORE-05 cross-link: opens the chat at its tests-ready message.
    links.push({ label: 'View in AI explore', to: to.exploreChat(project.id, t.aiExploreFinding.chatId, t.aiExploreFinding.messageIndex) });
  }

  return (
    <section aria-label="Test detail" className="mt-6 max-w-xl rounded-card border border-border bg-surface p-5">
      <h2 className="text-h2">
        {t.testId} · {t.title}
      </h2>
      <p className="mt-1 text-text-muted">Test detail · {tab.label} tab · placeholder, built in Slice 4</p>
      <PlaceholderLinks links={links} />
    </section>
  );
}
