import { useState } from 'react';
import { listResults, resumeRun, stopRun } from '@/data/api';
import type { Run } from '@/data/types';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { errorText } from '@/components/StatusLine';
import { useConfirm } from '@/components/useConfirm';
import { useAsync } from '@/app/hooks/useAsync';
import { scopeWithCount } from '@/lib/runPlan';
import { RunProgress } from '../5-2-live-run/RunProgress';

/** Banner text per reason (screens/06-runs.md 5.3). Proposed variants are [DEV-CONFIRM] (BR-RUN-11). */
function banner(run: Run): { title: string; text: string } {
  const at = `${run.progress.done} of ${run.progress.total}`;
  switch (run.pauseReason) {
    case 'app_closed':
      return { title: `Interrupted at test ${at}`, text: `QAI closed while the run was in progress. Progress up to test ${run.progress.done} is saved.` };
    case 'provider_unavailable':
      return { title: `Paused at test ${at}`, text: 'AI provider unavailable: QAI retried automatically and now waits for you to resume.' };
    case 'environment_unresponsive':
      return { title: `Paused at test ${at}`, text: `${run.environment.name} website not responding for 5 tests in a row: check the site, then resume.` };
    case 'preflight_blocked':
      return { title: 'Blocked before start', text: 'API key rejected (pre-flight check). Fix it in Global settings, then resume.' };
    default:
      return { title: `Paused at test ${at}`, text: `You paused this run. Progress up to test ${run.progress.done} is saved.` };
  }
}

/** 5.3 Paused / interrupted run: banner with Resume from the next test (BR-RUN-10) · Stop run; progress so far. */
export function PausedRunScreen({ run }: { run: Run }) {
  const results = useAsync(() => listResults(run.id), [run.id, run.progress.done]);
  const [confirm, confirmDialog] = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const b = banner(run);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-h1">
          {scopeWithCount(run.scopeLabel, run.progress.total)} · {run.environment.name}
        </h1>
      </div>
      <section role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-cc-border bg-cc-fill px-4 py-3 text-cc-text">
        <div>
          <p className="font-semibold">{b.title}</p>
          <p>{b.text}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" disabled={busy} onClick={() => void act(() => resumeRun(run.id))}>
            Resume from test {Math.min(run.progress.done + 1, run.progress.total)}
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              const ok = await confirm({
                title: `Stop Run #${run.number}?`,
                danger: true,
                confirmLabel: 'Stop run',
                body: <p>The tests not run yet show as Not run. A stopped run can’t be resumed; you can re-run the remaining tests from the results.</p>,
              });
              if (ok) await act(() => stopRun(run.id));
            }}
          >
            Stop run
          </Button>
        </div>
      </section>
      {error && (
        <p role="alert" className="text-failed-text">
          {error}
        </p>
      )}
      {results.status === 'loading' && <LoadingState label="Loading progress…" />}
      {results.status === 'error' && <ErrorState title="Couldn't load the progress" message={results.error.message} onRetry={results.retry} />}
      {results.status === 'ready' && <RunProgress run={run} results={results.data} variant="paused" />}
      <p className="text-label font-normal text-text-muted">Tests that never ran show as Not run, never as Failed, and do not count in the pass rate.</p>
      {confirmDialog}
    </div>
  );
}
