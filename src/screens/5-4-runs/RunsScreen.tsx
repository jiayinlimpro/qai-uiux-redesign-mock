import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listResults, listRuns, listTests, resumeRun, subscribeRun } from '@/data/api';
import type { ID, Result, Run } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { RunDialog } from '@/components/RunDialog';
import { errorText } from '@/components/StatusLine';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { formatDuration, formatStarted } from '@/lib/format';
import { scopeWithCount } from '@/lib/runPlan';
import { countRunStatuses } from '@/lib/status';

/** State column (screens/06-runs.md 5.4): Running x/y · Paused · Interrupted at x/y · Completed · Stopped at x/y (D55). */
function stateChip(run: Run) {
  const at = `${run.progress.done}/${run.progress.total}`;
  if (run.state === 'running') return <Chip tone="info">Running {at}</Chip>;
  if (run.state === 'paused') return <Chip tone="cc">Paused</Chip>;
  if (run.state === 'interrupted') return <Chip tone="cc">Interrupted at {at}</Chip>;
  if (run.stoppedAt) return <Chip>Stopped at {`${run.stoppedAt.done}/${run.stoppedAt.total}`}</Chip>;
  return <Chip>Completed</Chip>;
}

/** 5.4 Runs list (screens/06-runs.md). Counts come from the results (CLAUDE.md rule 5). */
export function RunsScreen() {
  const project = useProject();
  const navigate = useNavigate();
  const data = useAsync(
    async () => {
      const runs = await listRuns(project.id);
      const results = await Promise.all(runs.map(async (r) => [r.id, await listResults(r.id)] as const));
      return { runs, results: new Map(results) };
    },
    [project.id],
  );
  const [newRun, setNewRun] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live: running runs update their row from the run events (progress, duration, cost, results), without reloading the list.
  const [liveRuns, setLiveRuns] = useState<Map<ID, Run>>(new Map());
  const [liveResults, setLiveResults] = useState<Map<ID, Result[]>>(new Map());
  const runningKey = data.status === 'ready' ? data.data.runs.filter((r) => r.state === 'running').map((r) => r.id).join(',') : '';
  useEffect(() => {
    const offs = runningKey
      .split(',')
      .filter(Boolean)
      .map((id) =>
        subscribeRun(id, (e) => {
          if (e.kind === 'progress') setLiveRuns((m) => new Map(m).set(id, e.run));
          else if (e.kind === 'result') setLiveResults((m) => new Map(m).set(id, [...(m.get(id) ?? []), e.result]));
        }),
      );
    return () => offs.forEach((off) => off());
  }, [runningKey]);

  async function openNewRun() {
    try {
      setNewRun((await listTests(project.id)).map((t) => t.id)); // no selection → All tests (D56)
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1">Runs</h1>
          <p className="text-text-muted">Every execution, with the exact test versions it used.</p>
        </div>
        <Button variant="primary" onClick={() => void openNewRun()}>
          New run
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-failed-text">
          {error}
        </p>
      )}
      <div className="mt-5">
        {data.status === 'loading' && <LoadingState label="Loading runs…" />}
        {data.status === 'error' && <ErrorState title="Couldn't load runs" message={data.error.message} onRetry={data.retry} />}
        {data.status === 'ready' && data.data.runs.length === 0 && (
          <div className="rounded-card border border-border bg-surface px-6 py-10 text-center">
            <h2 className="text-h2">No runs yet</h2>
            <p className="mt-1 text-text-muted">Select tests in Suites to run them.</p>
            <Link to={to.suites(project.id)} className={buttonClasses({ className: 'mt-4' })}>
              Go to Suites
            </Link>
          </div>
        )}
        {data.status === 'ready' && data.data.runs.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Run</Th>
                <Th>Started</Th>
                <Th>Scope</Th>
                <Th>Environment</Th>
                <Th>Duration</Th>
                <Th>State</Th>
                <Th>Results</Th>
                <Th>Cost</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {data.data.runs.map((loaded) => {
                const run = liveRuns.get(loaded.id) ?? loaded;
                const base = data.data.results.get(run.id) ?? [];
                const seen = new Set(base.map((r) => r.id));
                const c = countRunStatuses(run.testIds, [...base, ...(liveResults.get(run.id) ?? []).filter((r) => !seen.has(r.id))]);
                return (
                  <Tr key={run.id}>
                    <Td>
                      <Link to={to.run(project.id, run.id)} className="text-accent underline underline-offset-2">
                        #{run.number}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap text-text-muted">{formatStarted(run.startedAt)}</Td>
                    <Td>
                      {scopeWithCount(run.scopeLabel, run.progress.total)}
                    </Td>
                    <Td>{run.environment.name}</Td>
                    <Td className="whitespace-nowrap">{formatDuration(run.durationMs ?? 0)}</Td>
                    <Td className="whitespace-nowrap">{stateChip(run)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {c.passed > 0 && <Chip tone="passed">{c.passed} passed</Chip>}
                        {c.failed > 0 && <Chip tone="failed">{c.failed} failed</Chip>}
                        {c.couldnt_complete > 0 && <Chip tone="cc">{c.couldnt_complete} couldn't complete</Chip>}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap">${run.cost.toFixed(2)}</Td>
                    <Td className="text-right">
                      {run.state === 'running' ? (
                        <Link to={to.run(project.id, run.id)} className={buttonClasses({ size: 'sm' })}>
                          Watch<span className="sr-only"> run #{run.number}</span>
                        </Link>
                      ) : run.state === 'paused' || run.state === 'interrupted' ? (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await resumeRun(run.id);
                              navigate(to.run(project.id, run.id));
                            } catch (e) {
                              setError(errorText(e));
                            }
                          }}
                        >
                          Resume<span className="sr-only"> run #{run.number}</span>
                        </Button>
                      ) : (
                        <Link to={to.run(project.id, run.id)} className={buttonClasses({ size: 'sm' })}>
                          Open<span className="sr-only"> run #{run.number}</span>
                        </Link>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
      {newRun && <RunDialog testIds={newRun} onClose={() => setNewRun(null)} />}
    </div>
  );
}
