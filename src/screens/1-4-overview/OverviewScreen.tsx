import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CirclePause, CircleStop, Folder, History, Monitor, Play, Plus, Rocket, Server, TriangleAlert, Upload, type LucideIcon } from 'lucide-react';
import { listLatestResults, listLibraryTests, listResults, listRuns, listSuites, stopRun } from '@/data/api';
import type { ID } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { AiExploreIcon } from '@/components/AiExploreIcon';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { RunDialog } from '@/components/RunDialog';
import { RunStateChip } from '@/components/RunStateChip';
import { StatusCountChips, StatusCountsCompact } from '@/components/StatusCountChips';
import { PassRateDonut, SuiteStatusBars } from '@/components/StatusCharts';
import { useConfirm } from '@/components/useConfirm';
import { errorText } from '@/components/StatusLine';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { formatCost, formatStarted, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { scopeWithCount } from '@/lib/runPlan';
import { lastCompletedRun, needsAttention, notInASuiteCount, pauseReasonText, recentRuns, resumeBannerText, runToResume, suiteRows, totalCounts } from '@/lib/overviewRules';

/** A standalone "go somewhere" link: violet, medium weight, with an arrow (D80). */
const goClass = 'inline-flex items-center gap-1 font-medium text-accent hover:underline [&_svg]:size-4';

/**
 * 1.4 Project overview (screens/02-project.md): what needs attention. Every count is computed from library tests and
 * results (rule 5, BR-EXPLORE-07). Two charts of the latest status (D77); trends stay parked.
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
        <div className="max-w-xl">
          <EmptyState
            icon={Rocket}
            headingLevel={1}
            title={`${project.name} has no tests yet`}
            actions={
              <>
                <Link to={to.importTests(project.id)} className={buttonClasses()}>
                  <Upload aria-hidden="true" />
                  Import tests
                </Link>
                <Link to={to.newTest(project.id)} className={buttonClasses()}>
                  <Plus aria-hidden="true" />
                  Write a test
                </Link>
                <Link to={to.environments(project.id)} className={buttonClasses()}>
                  <Server aria-hidden="true" />
                  Set up environments
                </Link>
                <Link to={to.explore(project.id)} state={exploreState} className={buttonClasses({ variant: 'primary' })}>
                  <AiExploreIcon aria-hidden="true" />
                  Explore with AI
                </Link>
              </>
            }
          >
            Start by bringing in tests, writing one, or letting the AI explore your platform. Environments tell tests where to run and how to log in; Knowledge helps the AI understand the platform.
          </EmptyState>
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
        <div className="flex flex-col gap-1.5">
          <p className="text-label font-normal text-text-muted">Project</p>
          <h1 className="text-h1">{project.name}</h1>
          <ul aria-label="Project details" className="flex flex-wrap gap-x-5 gap-y-1 text-text-muted">
            <li className="inline-flex items-center gap-1.5">
              <Monitor aria-hidden="true" className="size-4" />
              {plural(project.platforms.length, 'platform')}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Server aria-hidden="true" className="size-4" />
              Environments: {project.environments.map((e) => e.name).join(', ')}
            </li>
          </ul>
        </div>
        <div className="flex gap-2">
          <Link to={to.importTests(project.id)} className={buttonClasses()}>
            <Upload aria-hidden="true" />
            Import
          </Link>
          <Link to={to.newTest(project.id)} className={buttonClasses()}>
            <Plus aria-hidden="true" />
            New test
          </Link>
          <Button variant="primary" icon={Play} disabled={tests.length === 0} onClick={() => setRunning(tests.map((t) => t.id))}>
            Run…
          </Button>
        </div>
      </header>

      {resume && (
        <section aria-label="Run to resume" className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-cc-border bg-cc-fill px-5 py-3.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-surface text-cc-dot">
            <CirclePause aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-[1_1_18rem]">
            <p className="font-semibold text-cc-text">{resumeBannerText(resume)}</p>
            {resume.pauseReason && <p className="text-cc-text">{pauseReasonText[resume.pauseReason]}</p>}
          </div>
          <div className="flex gap-2">
            <Button icon={CircleStop} onClick={() => void stop(resume.id, resume.number)}>
              Stop run<span className="sr-only"> #{resume.number}</span>
            </Button>
            <Link to={to.run(project.id, resume.id)} className={buttonClasses({ variant: 'primary' })}>
              <Play aria-hidden="true" />
              Resume<span className="sr-only"> run #{resume.number}</span>
            </Link>
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
          <Card icon={AiExploreIcon} label="New from AI explore" title={`${plural(looseCount, 'test')} not in a suite`}>
            <Link to={to.suites(project.id)} state={{ expand: 'not-in-a-suite' }} className={goClass}>
              Organise in Suites
              <ArrowRight aria-hidden="true" />
            </Link>
          </Card>
        )}
        <Card icon={History} label="Last completed run" title={last ? `Run #${last.number} · ${formatStarted(last.startedAt)}` : 'No completed run yet'}>
          {last && attention && (
            <>
              {last.stoppedAt && <p className="text-text-muted">Stopped at {`${last.stoppedAt.done}/${last.stoppedAt.total}`}</p>}
              <StatusCountChips counts={attention.counts} />
            </>
          )}
        </Card>
        <Card icon={TriangleAlert} tone={attention && attention.count > 0 ? 'cc' : undefined} label="Needs attention" title={attention ? `${attention.count} failed or couldn't complete` : 'Nothing yet'}>
          {last && attention && (
            <>
              <p className="text-text-muted">
                {plural(attention.worthALook, 'result')} worth a look <span className="text-label">(proposal)</span>
              </p>
              <Link to={to.run(project.id, last.id)} className={goClass}>
                Open run #{last.number}
                <ArrowRight aria-hidden="true" />
              </Link>
            </>
          )}
        </Card>
      </div>

      {/* D77: the latest status of each library test, the same counts as the Suites table below. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <ChartCard id="overview-pass-rate" title="Pass rate">
          <PassRateDonut counts={totalCounts(rows)} />
        </ChartCard>
        <ChartCard id="overview-by-suite" title="Status by suite">
          <SuiteStatusBars rows={rows} />
        </ChartCard>
      </div>

      <section aria-labelledby="overview-suites">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="overview-suites" className="text-h3">
            Suites
          </h2>
          <Link to={to.suites(project.id)} className={goClass}>
            Open Suites
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <Table dense>
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
                <Td>
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Folder aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
                    {r.name}
                  </span>
                </Td>
                <Td className="tabular-nums">{r.testIds.length}</Td>
                <Td className="whitespace-nowrap">
                  <StatusCountsCompact counts={r.counts} />
                </Td>
                <Td className="whitespace-nowrap text-text-muted">{r.lastRun ? `Run #${r.lastRun.number} · ${formatStarted(r.lastRun.startedAt)}` : 'Never run'}</Td>
                <Td className="text-right">
                  <Button size="xs" icon={Play} disabled={r.testIds.length === 0} onClick={() => setRunning(r.testIds)}>
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
          <Link to={to.runs(project.id)} className={goClass}>
            All runs
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        {runs.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-4 text-text-muted">No runs yet. Select tests in Suites to run them.</p>
        ) : (
          <Table dense>
            <thead>
              <tr>
                <Th>Run</Th>
                <Th>Scope</Th>
                <Th>Environment</Th>
                <Th>State</Th>
                <Th className="text-right">Cost</Th>
              </tr>
            </thead>
            <tbody>
              {recentRuns(runs).map((run) => (
                <Tr key={run.id}>
                  <Td>
                    <Link to={to.run(project.id, run.id)} className="font-semibold tabular-nums text-accent hover:underline">
                      #{run.number}
                    </Link>
                  </Td>
                  <Td>{scopeWithCount(run.scopeLabel, run.progress.total)}</Td>
                  <Td>{run.environment.name}</Td>
                  <Td>
                    <RunStateChip run={run} />
                  </Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">
                    {formatCost(run.cost)}
                    {run.state !== 'completed' ? ' so far' : ''}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
      <p className="text-label font-normal text-text-muted">Trends across runs are not part of this version.</p>

      {running && <RunDialog testIds={running} onClose={() => setRunning(null)} />}
      {confirmDialog}
    </div>
  );
}

/** Summary card (D80): icon tile and label, then the headline and its next step. */
function Card({ icon: Icon, tone, label, title, children }: { icon: LucideIcon; tone?: 'cc'; label: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className={cn('inline-flex size-7 items-center justify-center rounded-control', tone === 'cc' ? 'bg-cc-fill text-cc-dot' : 'bg-accent-soft text-accent-soft-text')}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <h2 className="text-label text-text-muted">{label}</h2>
      </div>
      <p className="text-h3">{title}</p>
      {children}
    </section>
  );
}

function ChartCard({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div>
        <h2 id={id} className="text-h3">
          {title}
        </h2>
        <p className="text-text-muted">Latest result of each test</p>
      </div>
      {children}
    </section>
  );
}
