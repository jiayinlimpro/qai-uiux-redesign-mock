import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listLatestResults, listLibraryTests, listResults, listRuns, listSuites, stopRun } from '@/data/api';
import type { ID } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { RunDialog } from '@/components/RunDialog';
import { RunStateChip } from '@/components/RunStateChip';
import { StatusCountChips } from '@/components/StatusCountChips';
import { useConfirm } from '@/components/useConfirm';
import { errorText } from '@/components/StatusLine';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { formatCost, formatStarted, plural } from '@/lib/format';
import { scopeWithCount } from '@/lib/runPlan';
import { lastCompletedRun, needsAttention, notInASuiteCount, pauseReasonText, recentRuns, resumeBannerText, runToResume, suiteRows } from '@/lib/overviewRules';

const linkClass = 'text-accent underline underline-offset-2';

/**
 * 1.4 Project overview (screens/02-project.md): what needs attention. Every count is computed from library tests and
 * results (rule 5, BR-EXPLORE-07). No graphs or trends (parked).
 */
export function OverviewScreen() {
  const project = useProject();
  const data = useAsync(
    async () => {
      const [tests, suites, latest, runs] = await Promise.all([listLibraryTests(project.id), listSuites(project.id), listLatestResults(project.id), listRuns(project.id)]);
      const last = lastCompletedRun(runs);
      const lastResults = last ? await listResults(last.id) : [];
      return { tests, suites, latest, runs, last, lastResults };
    },
    [project.id],
    { keepPrevious: true },
  );
  const [running, setRunning] = useState<ID[] | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const [error, setError] = useState<string | null>(null);

  if (data.status === 'loading') return <LoadingState label="Loading overview…" />;
  if (data.status === 'error') return <ErrorState title="Couldn't load the overview" message={data.error.message} onRetry={data.retry} />;
  const { tests, suites, latest, runs, last, lastResults } = data.data;
  const exploreState = { from: to.overview(project.id) };

  if (tests.length === 0 && runs.length === 0) {
    return (
      <div className="flex h-full items-start justify-center p-10">
        <div className="max-w-lg rounded-card border border-border bg-surface px-8 py-10 text-center">
          <h1 className="text-h2">{project.name} has no tests yet</h1>
          <p className="mt-1 text-text-muted">Start by bringing in tests, writing one, or letting the AI explore your app. Knowledge helps the AI log in and understand the app.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to={to.importTests(project.id)} className={buttonClasses()}>
              Import tests
            </Link>
            <Link to={to.newTest(project.id)} className={buttonClasses()}>
              Write a test
            </Link>
            <Link to={to.explore(project.id)} state={exploreState} className={buttonClasses({ variant: 'primary' })}>
              Explore with AI
            </Link>
            <Link to={to.knowledge(project.id)} className={buttonClasses()}>
              Set up Knowledge
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const resume = runToResume(runs);
  const looseCount = notInASuiteCount(tests);
  const attention = last ? needsAttention(last, lastResults) : null;
  const rows = suiteRows(suites, tests, latest, runs);

  async function stop(runId: ID, number: number) {
    const ok = await confirm({
      title: `Stop Run #${number}?`,
      danger: true,
      confirmLabel: 'Stop run',
      body: <p>The tests not run yet show as Not run. A stopped run can’t be resumed; you can re-run the remaining tests from the results.</p>,
    });
    if (!ok) return;
    try {
      await stopRun(runId); // D55, D67
      setError(null);
      data.retry();
    } catch (e) {
      setError(`Couldn't stop the run: ${errorText(e)}`);
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label font-normal text-text-muted">Project</p>
          <h1 className="text-h1">{project.name}</h1>
          <p className="text-text-muted">
            {plural(project.apps.length, 'app')} · environments: {project.environments.map((e) => e.name).join(', ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={to.newTest(project.id)} className={buttonClasses()}>
            New test
          </Link>
          <Link to={to.importTests(project.id)} className={buttonClasses()}>
            Import
          </Link>
          <Button variant="primary" disabled={tests.length === 0} onClick={() => setRunning(tests.map((t) => t.id))}>
            Run…
          </Button>
        </div>
      </header>

      {resume && (
        <section aria-label="Run to resume" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-cc-border bg-cc-fill px-5 py-3">
          <div>
            <p className="font-semibold text-cc-text">{resumeBannerText(resume)}</p>
            {resume.pauseReason && <p className="text-cc-text">{pauseReasonText[resume.pauseReason]}</p>}
          </div>
          <div className="flex gap-2">
            <Link to={to.run(project.id, resume.id)} className={buttonClasses({ variant: 'primary' })}>
              Resume<span className="sr-only"> run #{resume.number}</span>
            </Link>
            <Button onClick={() => void stop(resume.id, resume.number)}>
              Stop run<span className="sr-only"> #{resume.number}</span>
            </Button>
          </div>
        </section>
      )}
      {error && (
        <p role="alert" className="text-failed-text">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {looseCount > 0 && (
          <Card label="New from AI explore" title={`${plural(looseCount, 'test')} not in a suite`}>
            <Link to={to.suites(project.id)} state={{ expand: 'not-in-a-suite' }} className={linkClass}>
              Organise in Suites
            </Link>
          </Card>
        )}
        <Card label="Last completed run" title={last ? `Run #${last.number} · ${formatStarted(last.startedAt)}` : 'No completed run yet'}>
          {last && attention && (
            <>
              {last.stoppedAt && <p className="text-text-muted">Stopped at {`${last.stoppedAt.done}/${last.stoppedAt.total}`}</p>}
              <StatusCountChips counts={attention.counts} />
            </>
          )}
        </Card>
        <Card label="Needs attention" title={attention ? `${attention.count} failed or couldn't complete` : 'Nothing yet'}>
          {last && attention && (
            <>
              <p className="text-text-muted">
                {plural(attention.worthALook, 'result')} worth a look <span className="text-label">(proposal)</span>
              </p>
              <Link to={to.run(project.id, last.id)} className={linkClass}>
                Open run #{last.number}
              </Link>
            </>
          )}
        </Card>
      </div>

      <section aria-labelledby="overview-suites">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="overview-suites" className="text-h3">
            Suites
          </h2>
          <Link to={to.suites(project.id)} className={linkClass}>
            Open Suites
          </Link>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Suite</Th>
              <Th>Tests</Th>
              <Th>Latest status</Th>
              <Th>Last run</Th>
              <Th>
                <span className="sr-only">Run</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.suite?.id ?? 'not-in-a-suite'}>
                <Td>{r.name}</Td>
                <Td>{r.testIds.length}</Td>
                <Td>
                  <StatusCountChips counts={r.counts} />
                </Td>
                <Td className="whitespace-nowrap text-text-muted">{r.lastRun ? `Run #${r.lastRun.number} · ${formatStarted(r.lastRun.startedAt)}` : 'Never run'}</Td>
                <Td className="text-right">
                  <Button size="sm" disabled={r.testIds.length === 0} onClick={() => setRunning(r.testIds)}>
                    Run<span className="sr-only"> {r.name}</span>
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </section>

      <section aria-labelledby="overview-runs">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="overview-runs" className="text-h3">
            Recent runs
          </h2>
          <Link to={to.runs(project.id)} className={linkClass}>
            All runs
          </Link>
        </div>
        {runs.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-4 text-text-muted">No runs yet. Select tests in Suites to run them.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Run</Th>
                <Th>Scope</Th>
                <Th>Environment</Th>
                <Th>State</Th>
                <Th>Cost</Th>
              </tr>
            </thead>
            <tbody>
              {recentRuns(runs).map((run) => (
                <Tr key={run.id}>
                  <Td>
                    <Link to={to.run(project.id, run.id)} className={linkClass}>
                      #{run.number}
                    </Link>
                  </Td>
                  <Td>{scopeWithCount(run.scopeLabel, run.progress.total)}</Td>
                  <Td>{run.environment.name}</Td>
                  <Td>
                    <RunStateChip run={run} />
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatCost(run.cost)}
                    {run.state !== 'completed' ? ' so far' : ''}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
      <p className="text-label font-normal text-text-muted">Detailed metrics and trends are not part of this version.</p>

      {running && <RunDialog testIds={running} onClose={() => setRunning(null)} />}
      {confirmDialog}
    </div>
  );
}

function Card({ label, title, children }: { label: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
      <h2 className="text-label text-text-muted">{label}</h2>
      <p className="text-h3">{title}</p>
      {children}
    </section>
  );
}
