import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listKnowledge, listResults, listRuns, listSuites, listLibraryTests } from '@/data/api';
import type { ID, ResultStep, Run, Status } from '@/data/types';
import { SplitPane } from '@/components/ui/split-pane';
import { Toast, type ToastMessage } from '@/components/ui/toast';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { RunDialog } from '@/components/RunDialog';
import { BugReportDialog, type BugReportItem } from '@/components/BugReportDialog';
import { VisualCompare } from '@/components/VisualCompare';
import { modelOptions } from '@/components/ProjectModelSelect';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { useGlobalSettings } from '@/app/settings';
import { to } from '@/app/routes';
import { formatCost, formatStarted, plural } from '@/lib/format';
import { statusLabels } from '@/lib/labels';
import { buildResultRows, hasBugReport, NO_RESULT_FILTERS, shownRows, withStatus, type ResultFilterState, type ResultRow } from '@/lib/resultRules';
import { countByStatus } from '@/lib/status';
import { cn } from '@/lib/utils';
import { ResultsList } from './ResultsList';
import { ResultDetail } from './ResultDetail';
import { KnownIssueDialog, OverrideDialog, ScreenshotViewer } from './ResultDialogs';

const TECHNICAL_KEY = 'qai.results.showTechnical';
function readFlag(key: string): boolean {
  try {
    return globalThis.localStorage?.getItem(key) === 'true';
  } catch {
    return false;
  }
}

const SUMMARY: { status: Status; label: (n: number) => string; tone: string }[] = [
  { status: 'failed', label: (n) => `${n} failed`, tone: 'border-failed-border bg-failed-fill text-failed-text' },
  { status: 'couldnt_complete', label: (n) => `${n} couldn't complete`, tone: 'border-cc-border bg-cc-fill text-cc-text' },
  { status: 'passed', label: (n) => `${n} passed`, tone: 'border-passed-border bg-passed-fill text-passed-text' },
  { status: 'not_run', label: (n) => `${n} not run`, tone: 'border-border bg-bg text-text-muted' },
];

type Dialogs =
  | { kind: 'rerun'; testIds: ID[]; model?: string }
  | { kind: 'bugReport'; items: BugReportItem[] }
  | { kind: 'knownIssue'; rows: ResultRow[] }
  | { kind: 'override'; row: ResultRow }
  | { kind: 'visual'; row: ResultRow; stepIndex: number }
  | { kind: 'screenshot'; row: ResultRow; step: ResultStep }
  | null;

/**
 * 6.1 Run results + result detail (screens/07-results.md): the run route when Completed; `?result=` selects a result.
 * Summary buttons are the status filter; master–detail with a draggable split (BR-LIST-05). Counts are computed (rule 5).
 */
export function RunResultsScreen({ run }: { run: Run }) {
  const project = useProject();
  const { settings } = useGlobalSettings();
  const [params] = useSearchParams();
  const data = useAsync(
    async () => {
      const [results, tests, suites, knowledge, runs, models] = await Promise.all([
        listResults(run.id),
        listLibraryTests(project.id),
        listSuites(project.id),
        listKnowledge(project.id),
        listRuns(project.id),
        modelOptions(settings.providers),
      ]);
      return { results, tests, suites, knowledge, runs, models: [...new Set(models.flatMap((g) => g.models))] };
    },
    [run.id, project.id, settings.providers],
    { keepPrevious: true },
  );
  const [filters, setFilters] = useState<ResultFilterState>(NO_RESULT_FILTERS);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [showTechnical, setShowTechnicalState] = useState(() => readFlag(TECHNICAL_KEY));
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const showToast = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  const closeToast = useCallback(() => setToast(null), []);

  const setShowTechnical = (on: boolean) => {
    setShowTechnicalState(on);
    try {
      globalThis.localStorage?.setItem(TECHNICAL_KEY, String(on)); // "Show technical details" is remembered
    } catch {
      // storage unavailable: the choice lasts for this screen only
    }
  };

  const rows = useMemo(() => (data.status === 'ready' ? buildResultRows(run, data.data.results, data.data.tests, data.data.suites) : []), [data, run]);
  const shown = useMemo(() => shownRows(rows, filters), [rows, filters]);
  const counts = useMemo(() => countByStatus(rows), [rows]);

  if (data.status === 'loading') return <LoadingState label="Loading results…" />;
  if (data.status === 'error') return <ErrorState title="Couldn't load the results" message={data.error.message} onRetry={data.retry} />;
  const d = data.data;

  const requested = params.get('result');
  const selectedKey = requested ?? shown[0]?.key ?? null;
  const selected = selectedKey ? rows.find((r) => r.key === selectedKey) : undefined;
  const testOf = (row: ResultRow) => d.tests.find((t) => t.id === row.testId) ?? null;

  const rerun = (picked: ResultRow[], model?: string) => {
    const ids = picked.filter((r) => !r.deleted).map((r) => r.testId);
    if (ids.length === 0) return showToast("Deleted tests can't be re-run.");
    if (ids.length < picked.length) showToast(`${plural(picked.length - ids.length, 'deleted test')} left out.`);
    setDialog({ kind: 'rerun', testIds: ids, ...(model ? { model } : {}) });
  };
  const bugReports = (picked: ResultRow[]) => {
    const withReport = picked.filter((r) => r.result && hasBugReport(r.result));
    if (withReport.length === 0) return showToast('None of the selected results failed, so there is no bug report.');
    if (withReport.length < picked.length) showToast(`${plural(picked.length - withReport.length, 'result')} without a failure left out.`);
    setDialog({ kind: 'bugReport', items: withReport.map((r) => ({ resultId: r.result!.id, label: r.displayId })) });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-surface px-6 py-4">
        <div>
          <p className="text-label font-normal text-text-muted">
            {run.scopeLabel} · {run.environment.name} · {formatStarted(run.startedAt)} · {formatCost(run.cost)}
            {run.stoppedAt ? ` · Stopped at ${run.stoppedAt.done}/${run.stoppedAt.total}` : ''}
          </p>
          <h1 className="text-h1">
            Run #{run.number} · {plural(rows.length, 'test')}
          </h1>
        </div>
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          <SummaryButton pressed={filters.status === 'all'} tone="border-border bg-surface text-text" onClick={() => setFilters(withStatus(filters, 'all'))}>
            All {rows.length}
          </SummaryButton>
          {SUMMARY.filter((s) => s.status !== 'not_run' || counts.not_run > 0).map((s) => (
            <SummaryButton key={s.status} pressed={filters.status === s.status} tone={s.tone} onClick={() => setFilters(withStatus(filters, filters.status === s.status ? 'all' : s.status))}>
              {s.label(counts[s.status])}
            </SummaryButton>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <SplitPane
          label="Resize results list"
          defaultLeft={440}
          left={
            <ResultsList
              rows={rows}
              shown={shown}
              filters={filters}
              setFilters={setFilters}
              selection={selection}
              setSelection={setSelection}
              selectedKey={selectedKey}
              rowLink={(key) => to.run(project.id, run.id, key)}
              models={d.models}
              actions={{
                rerun: (picked) => rerun(picked),
                rerunWithModel: (picked, model) => rerun(picked, model),
                copyBugReports: bugReports,
                knownIssue: (picked) => {
                  const live = picked.filter((r) => !r.deleted);
                  if (live.length === 0) return showToast("Deleted tests can't be marked.");
                  setDialog({ kind: 'knownIssue', rows: live });
                },
              }}
            />
          }
          right={
            <div className="h-full overflow-auto bg-bg">
              {selected ? (
                <ResultDetail
                  key={selected.key}
                  row={selected}
                  run={run}
                  test={testOf(selected)}
                  projectId={project.id}
                  knowledge={d.knowledge}
                  runs={d.runs}
                  showTechnical={showTechnical}
                  setShowTechnical={setShowTechnical}
                  onRerun={() => rerun([selected])}
                  onCopyBugReport={() => bugReports([selected])}
                  onOverride={() => setDialog({ kind: 'override', row: selected })}
                  onKnownIssue={() => setDialog({ kind: 'knownIssue', rows: [selected] })}
                  onOpenVisual={(stepIndex) => setDialog({ kind: 'visual', row: selected, stepIndex })}
                  onOpenScreenshot={(step) => setDialog({ kind: 'screenshot', row: selected, step })}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-text-muted">
                  <p>{requested ? 'This result is not part of this run.' : 'Select a result to see its details.'}</p>
                </div>
              )}
            </div>
          }
        />
      </div>

      {dialog?.kind === 'rerun' && <RunDialog testIds={dialog.testIds} presetEnvironmentId={run.environmentId} presetModel={dialog.model ?? run.model} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'bugReport' && <BugReportDialog items={dialog.items} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'knownIssue' && (
        <KnownIssueDialog
          testIds={dialog.rows.map((r) => r.testId)}
          labels={dialog.rows.map((r) => r.displayId)}
          onClose={() => setDialog(null)}
          onDone={(tests) => {
            setDialog(null);
            data.retry();
            showToast(`${tests.length === 1 ? tests[0]!.testId : plural(tests.length, 'test')} marked as a known issue`);
          }}
        />
      )}
      {dialog?.kind === 'override' && dialog.row.result && (
        <OverrideDialog
          result={dialog.row.result}
          label={dialog.row.displayId}
          onClose={() => setDialog(null)}
          onSaved={(r) => {
            setDialog(null);
            data.retry();
            showToast(`${dialog.row.displayId} overridden to ${statusLabels[r.status]}`);
          }}
        />
      )}
      {dialog?.kind === 'visual' && dialog.row.result && (
        <VisualCompare
          result={dialog.row.result}
          run={run}
          test={testOf(dialog.row)}
          displayId={dialog.row.displayId}
          stepIndex={dialog.stepIndex}
          onClose={() => setDialog(null)}
          onResultChange={() => data.retry()}
          onTestChange={() => data.retry()}
        />
      )}
      {dialog?.kind === 'screenshot' && dialog.row.result && (
        <ScreenshotViewer step={dialog.step} label={dialog.row.displayId} run={run} result={dialog.row.result} onClose={() => setDialog(null)} />
      )}
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}

/** SummaryFilterButtons (08): toggle buttons that act as the status filter. Text carries the meaning (rule 7). */
function SummaryButton({ pressed, tone, onClick, children }: { pressed: boolean; tone: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={cn('h-8 rounded-pill border px-3 text-base', tone, pressed && 'font-semibold ring-2 ring-text ring-offset-1')}>
      {children}
    </button>
  );
}
