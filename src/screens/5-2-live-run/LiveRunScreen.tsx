import { useMemo, useState } from 'react';
import { CircleCheck, CircleDashed } from 'lucide-react';
import { listResults, listTests, pauseRun, planRun, skipTest, stopRun } from '@/data/api';
import type { Run, Status } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { statusTone } from '@/components/StatusViews';
import { errorText } from '@/components/StatusLine';
import { useConfirm } from '@/components/useConfirm';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import type { LiveState } from '@/app/RunRoute';
import { browserLabels, modeLabels, statusLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { RunProgress } from './RunProgress';

/** 5.2 Live run (screens/06-runs.md): progress, queue, live screenshot, narration. The user may leave; the run continues. */
export function LiveRunScreen({ run, live }: { run: Run; live: LiveState }) {
  const project = useProject();
  const base = useAsync(async () => {
    const [results, tests, plans] = await Promise.all([listResults(run.id), listTests(project.id), planRun(run.testIds.filter(Boolean), { forceAi: run.forceAi, browsers: run.browsers }).catch(() => [])]);
    return { results, tests, plans };
  }, [run.id]);
  const [confirm, confirmDialog] = useConfirm();
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    if (base.status !== 'ready') return live.newResults;
    const seen = new Set(base.data.results.map((r) => r.id));
    return [...base.data.results, ...live.newResults.filter((r) => !seen.has(r.id))];
  }, [base, live.newResults]);

  if (base.status === 'loading') return <LoadingState label="Loading the run…" />;
  if (base.status === 'error') return <ErrorState title="Couldn't load the run" message={base.error.message} onRetry={base.retry} />;

  const tests = new Map(base.data.tests.map((t) => [t.id, t]));
  const plans = new Map(base.data.plans.map((p) => [p.testId, p]));
  const resultOf = new Map(results.map((r) => [r.testId, r]));
  const n = live.narration;
  const current = run.progress.currentTestId ?? n?.testId;

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function stop() {
    const ok = await confirm({
      title: `Stop Run #${run.number}?`,
      danger: true,
      confirmLabel: 'Stop run',
      body: <p>The tests not run yet show as Not run. A stopped run can’t be resumed; you can re-run the remaining tests from the results.</p>,
    });
    if (ok) await act(() => stopRun(run.id));
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1">
            Running · {run.scopeLabel} · {run.environment.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void act(() => pauseRun(run.id))}>Pause</Button>
          <Button variant="danger" onClick={() => void stop()}>
            Stop
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-failed-text">
          {error}
        </p>
      )}
      <RunProgress run={run} results={results} variant="live" />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr_22rem]">
        <section aria-label="Queue" className="relative min-h-0 overflow-auto rounded-card border border-border bg-surface p-3">
          <h2 className="px-1 pb-2 text-label text-text-muted">Queue</h2>
          <ol className="space-y-1">
            {run.testIds.map((id) => {
              const t = tests.get(id);
              const r = resultOf.get(id);
              const state: Status | 'running' | 'queued' = r ? r.status : id === current ? 'running' : 'queued';
              const mode = r?.mode ?? plans.get(id)?.mode;
              return (
                <li key={id} aria-current={state === 'running' ? 'step' : undefined} className={cn('flex items-center gap-2 rounded-control px-2 py-1', state === 'running' && 'bg-accent-soft')}>
                  {state === 'running' ? <Chip tone="info">Running</Chip> : state === 'queued' ? <Chip>Queued</Chip> : <Chip tone={statusTone[state]}>{statusLabels[state]}</Chip>}
                  <span className={cn('truncate', state === 'running' && 'font-semibold')}>{t?.testId ?? 'Deleted test'}</span>
                  {mode && <span className="ml-auto shrink-0 text-label font-normal text-text-muted">{modeLabels[mode]}</span>}
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-label="Live screenshot" className="flex min-h-[16rem] flex-col">
          <div className="flex flex-1 flex-col items-center justify-center rounded-card border border-dashed border-border bg-bg p-6 text-center text-text-muted">
            <p>Live browser screenshot, refreshed each step</p>
            <p className="text-label font-normal">
              {n ? `${n.url} · ${browserLabels[n.browser]} ${run.viewport.width}×${run.viewport.height}` : 'Starting the browser…'}
            </p>
          </div>
          <p className="mt-2 text-label font-normal text-text-muted">
            {run.advanced?.headless ? 'Headless: the test browser is hidden.' : 'Watching in the browser too? The test browser shows the same narration in its side panel when headless is off.'}
          </p>
        </section>

        <section aria-label="Now running" aria-live="polite" className="relative min-h-0 overflow-auto rounded-card border border-border bg-surface p-4">
          {!n ? (
            <p className="text-text-muted">Starting the next test…</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-label text-text-muted">Now running</h2>
                <p className="font-semibold">
                  {n.displayId} · {n.title}
                </p>
              </div>
              <div className="border-t border-border pt-3">
                <h3 className="text-label text-text-muted">
                  Step {n.step} of {n.stepCount}
                </h3>
                <p>{n.stepText}</p>
              </div>
              <div>
                <h3 className="text-label text-text-muted">Doing</h3>
                <p>{n.doing}</p>
              </div>
              <div>
                <h3 className="text-label text-text-muted">Why</h3>
                <p className="text-text-muted">{n.why}</p>
              </div>
              <div>
                <h3 className="text-label text-text-muted">Checks so far</h3>
                <ul className="mt-1 space-y-1">
                  {n.checks.map((c) => (
                    <li key={c.text} className="flex items-start gap-2">
                      {c.status === 'passed' ? <CircleCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-passed-dot" /> : <CircleDashed aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-notrun" />}
                      <span>
                        {c.text}: <span className="text-text-muted">{c.status}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-label font-normal text-text-muted">{n.aiSteps ? `AI steps used: ${n.aiSteps.used} of ${n.aiSteps.max}` : 'Script replay: no AI steps'}</span>
                <Button size="sm" onClick={() => void act(() => skipTest(run.id, n.testId))}>
                  Skip test
                </Button>
              </div>
              <details>
                <summary className="cursor-pointer text-label">Full AI reasoning</summary>
                <p className="mt-1 text-text-muted">{n.reasoning}</p>
              </details>
            </div>
          )}
        </section>
      </div>
      {confirmDialog}
    </div>
  );
}
