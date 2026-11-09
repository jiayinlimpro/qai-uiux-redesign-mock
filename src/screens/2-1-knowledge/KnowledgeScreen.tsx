import { listAccounts, listKnowledge, listRuns, listSuites, listTests } from '@/data/api';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { AppsEnvironmentsSection } from './AppsEnvironmentsSection';
import { AccountsSection } from './AccountsSection';
import { DocumentsSection, SkillsSection } from './KnowledgeItemsSections';

const anchors = [
  { id: 'apps-environments', label: 'Apps and environments' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'documents', label: 'Documents' },
  { id: 'skills', label: 'Skills' },
];

/**
 * 2.1 Knowledge (screens/03-knowledge.md): everything the AI may use for this project.
 * Single scrolling page with anchor chips: Apps and environments · Accounts · Documents · Skills.
 */
export function KnowledgeScreen() {
  const project = useProject();
  const data = useAsync(async () => {
    const [accounts, items, suites, tests, runs] = await Promise.all([
      listAccounts(project.id),
      listKnowledge(project.id),
      listSuites(project.id),
      listTests(project.id),
      listRuns(project.id),
    ]);
    return { accounts, items, suites, tests, runs };
  }, [project.id], { keepPrevious: true });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <h1 className="text-h1">Knowledge</h1>
      <p className="text-text-muted">What the AI can use for this project. Each item can apply project-wide, to a suite, or to a test.</p>
      <nav aria-label="Knowledge sections" className="mt-3 flex flex-wrap gap-2">
        {anchors.map((a) => (
          <button
            key={a.id}
            type="button"
            className="rounded-pill border border-border bg-surface px-3 py-1 text-label font-normal text-accent hover:bg-accent-soft"
            onClick={() => {
              // Hash routing owns the URL hash, so scroll and move focus instead of using #anchors.
              document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              document.getElementById(`${a.id}-title`)?.focus({ preventScroll: true });
            }}
          >
            {a.label}
          </button>
        ))}
      </nav>

      <div className="mt-5 flex flex-col gap-5">
        {data.status === 'loading' && <LoadingState label="Loading knowledge…" />}
        {data.status === 'error' && <ErrorState title="Couldn't load knowledge" message={data.error.message} onRetry={data.retry} />}
        {data.status === 'ready' && (
          <>
            <AppsEnvironmentsSection accounts={data.data.accounts} runs={data.data.runs} onSaved={data.retry} />
            <AccountsSection accounts={data.data.accounts} onChanged={data.retry} />
            <DocumentsSection items={data.data.items} suites={data.data.suites} tests={data.data.tests} onChanged={data.retry} />
            <SkillsSection items={data.data.items} suites={data.data.suites} tests={data.data.tests} onChanged={data.retry} />
          </>
        )}
      </div>
    </div>
  );
}
