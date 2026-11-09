import { Link } from 'react-router-dom';
import { getTestHistory } from '@/data/api';
import type { TestCase } from '@/data/types';
import { Chip } from '@/components/ui/chip';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { ReasonChip, StatusChip } from '@/components/StatusViews';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { formatDate } from '@/lib/format';
import { browserLabels, modeLabels } from '@/lib/labels';
import { useSuites } from '../suitesContext';

/**
 * History tab: Run · Date · Environment · Version ("old version") · Mode · Browser(s) · Result (+ Overridden).
 * The run number opens that result in Run results (6.1). Environment is the run's snapshot (BR-ENV-04).
 */
export function HistoryTab({ test }: { test: TestCase }) {
  const project = useProject();
  const s = useSuites();
  const history = useAsync(() => getTestHistory(test.id), [test.id]);

  if (history.status === 'loading') return <LoadingState label="Loading history…" />;
  if (history.status === 'error') return <ErrorState title="Couldn't load the history" message={history.error.message} onRetry={history.retry} />;
  if (history.data.length === 0) return <p className="rounded-card border border-dashed border-border bg-surface p-6 text-center text-text-muted">No runs yet for this test.</p>;

  return (
    <div className="relative overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-label text-text-muted">
            {['Run', 'Date', 'Environment', 'Version', 'Mode', 'Browser(s)', 'Result'].map((h) => (
              <th key={h} scope="col" className="px-4 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.data.map((r) => {
            const run = s.runs.find((x) => x.id === r.runId);
            return (
              <tr key={r.id} className="border-b border-border align-top last:border-b-0">
                <td className="px-4 py-2">
                  {run ? (
                    <Link to={to.run(project.id, run.id, r.id)} className="text-accent underline underline-offset-2">
                      #{run.number}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2">{run ? formatDate(run.startedAt) : ''}</td>
                <td className="px-4 py-2">{run?.environment.name}</td>
                <td className="whitespace-nowrap px-4 py-2">
                  v{r.testVersion}
                  {r.testVersion < test.version && <Chip className="ml-1">old version</Chip>}
                </td>
                <td className="px-4 py-2">{modeLabels[r.mode]}</td>
                <td className="px-4 py-2">{r.perBrowser.map((b) => browserLabels[b.browser]).join(', ')}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    <StatusChip status={r.status} />
                    {r.reason && <ReasonChip reason={r.reason} />}
                    {r.override && <Chip tone="info">Overridden</Chip>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-2 text-label font-normal text-text-muted">Each run number opens the result, showing the test version that ran.</p>
    </div>
  );
}
