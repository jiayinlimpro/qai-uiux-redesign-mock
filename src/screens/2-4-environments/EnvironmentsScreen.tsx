import { listAccounts, listRuns } from '@/data/api';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { SectionAnchors } from '@/components/SectionAnchors';
import { PlatformsEnvironmentsSection } from './PlatformsEnvironmentsSection';
import { AccountsSection } from './AccountsSection';

const anchors = [
  { id: 'platforms-environments', label: 'Platforms and environments' },
  { id: 'accounts', label: 'Accounts' },
];

/**
 * 2.4 Environments (screens/03-knowledge.md § 2.4, D72): where tests run and how they log in. The platforms × environments
 * grid (URLs) and the accounts per role, platform and environment (BR-ENV-*).
 */
export function EnvironmentsScreen() {
  const project = useProject();
  const data = useAsync(async () => {
    const [accounts, runs] = await Promise.all([listAccounts(project.id), listRuns(project.id)]);
    return { accounts, runs };
  }, [project.id], { keepPrevious: true });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <h1 className="text-h1">Environments</h1>
      <p className="text-text-muted">Where this project's tests run, and the accounts they log in with.</p>
      <SectionAnchors label="Environments sections" anchors={anchors} />

      <div className="mt-5 flex flex-col gap-5">
        {data.status === 'loading' && <LoadingState label="Loading environments…" />}
        {data.status === 'error' && <ErrorState title="Couldn't load environments" message={data.error.message} onRetry={data.retry} />}
        {data.status === 'ready' && (
          <>
            <PlatformsEnvironmentsSection accounts={data.data.accounts} runs={data.data.runs} onSaved={data.retry} />
            <AccountsSection accounts={data.data.accounts} onChanged={data.retry} />
          </>
        )}
      </div>
    </div>
  );
}
