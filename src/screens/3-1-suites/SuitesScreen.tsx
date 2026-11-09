import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cloneTests, deleteTests, listKnowledge, listLatestResults, listRuns, listSuites, listTests } from '@/data/api';
import type { ID } from '@/data/types';
import { buttonClasses } from '@/components/ui/button';
import { SplitPane } from '@/components/ui/split-pane';
import { Toast, type ToastMessage } from '@/components/ui/toast';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { RunDialogPlaceholder } from '@/components/RunDialogPlaceholder';
import { errorText } from '@/components/StatusLine';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { plural } from '@/lib/format';
import { SuitesContext, type SuitesContextValue } from './suitesContext';
import { SuiteList } from './SuiteList';
import { MoveDialog } from './MoveDialog';

/**
 * 3.1 Suites (screens/04-suites.md): the test library. Master–detail with a draggable split (BR-LIST-05).
 * Left: tree of suites and tests. Right: test detail (child route `suites/:testId`) or "Select a test".
 */
export function SuitesScreen() {
  const project = useProject();
  const data = useAsync(
    async () => {
      const [suites, tests, latest, runs, knowledge] = await Promise.all([
        listSuites(project.id),
        listTests(project.id),
        listLatestResults(project.id),
        listRuns(project.id),
        listKnowledge(project.id),
      ]);
      return { suites, tests, latest, runs, knowledge };
    },
    [project.id],
    { keepPrevious: true },
  );
  const [selection, setSelection] = useState<Set<ID>>(new Set());
  const [highlight, setHighlight] = useState<Set<ID>>(new Set());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [moving, setMoving] = useState<ID[] | null>(null);
  const [running, setRunning] = useState<ID[] | null>(null);

  const showToast = useCallback((t: Omit<ToastMessage, 'id'>) => setToast({ ...t, id: Date.now() }), []);
  const closeToast = useCallback(() => setToast(null), []);

  // A screen that saved and came back (Edit test, Import) passes a one-time message: show it and reload.
  const location = useLocation();
  const navigate = useNavigate();
  const retry = data.retry;
  useEffect(() => {
    const flash = (location.state as { flash?: string } | null)?.flash;
    if (!flash) return;
    showToast({ text: flash });
    retry();
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location, navigate, retry, showToast]);

  const ctx = useMemo<SuitesContextValue | null>(() => {
    if (data.status !== 'ready') return null;
    const d = data.data;
    return {
      ...d,
      reload: data.retry,
      statusOf: (id) => d.latest[id]?.status ?? 'not_run', // BR-STATUS-01: never run → Not run
      selection,
      setSelection,
      highlight,
      openMove: setMoving,
      openRun: setRunning,
      showToast,
      clone: async (ids) => {
        try {
          const copies = await cloneTests(ids);
          const copyIds = new Set(copies.map((c) => c.id));
          data.retry();
          // D41: copies sort by ID; select, highlight and scroll to them so they are easy to find.
          setSelection(copyIds);
          setHighlight(copyIds);
          setTimeout(() => setHighlight(new Set()), 4000);
          setTimeout(() => document.querySelector(`[data-test-row="${copies[0]?.id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 400);
          showToast({
            text: `${plural(copies.length, 'test')} cloned`,
            action: {
              label: 'Undo',
              onClick: () => {
                void deleteTests([...copyIds]).then(() => {
                  setSelection(new Set());
                  data.retry();
                  showToast({ text: 'Clone undone' });
                });
              },
            },
          });
        } catch (e) {
          showToast({ text: `Couldn't clone: ${errorText(e)}` });
        }
      },
    };
  }, [data, selection, highlight, showToast]);

  if (data.status === 'loading') return <LoadingState label="Loading suites…" />;
  if (data.status === 'error') return <ErrorState title="Couldn't load suites" message={data.error.message} onRetry={data.retry} />;
  if (!ctx) return null;

  if (ctx.tests.length === 0 && ctx.suites.length === 0) {
    return (
      <div className="flex h-full items-start justify-center p-10">
        <div className="max-w-md rounded-card border border-border bg-surface px-8 py-10 text-center">
          <h1 className="text-h2">No tests yet</h1>
          <p className="mt-1 text-text-muted">Bring in your test cases, write one, or let the AI propose tests by exploring your app.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to={to.importTests(project.id)} className={buttonClasses()}>
              Import
            </Link>
            <Link to={to.newTest(project.id)} className={buttonClasses()}>
              New test
            </Link>
            <Link to={to.explore(project.id)} className={buttonClasses({ variant: 'primary' })}>
              Explore with AI
            </Link>
          </div>
        </div>
        <Outlet />
      </div>
    );
  }

  const testsById = new Map(ctx.tests.map((t) => [t.id, t]));
  return (
    <SuitesContext.Provider value={ctx}>
      <SplitPane label="Resize test list" left={<SuiteList />} right={<div className="relative h-full overflow-auto">{<Outlet />}</div>} />
      {moving && (
        <MoveDialog
          testIds={moving}
          onClose={() => setMoving(null)}
          onDone={(text) => {
            setMoving(null);
            setSelection(new Set());
            data.retry();
            showToast({ text });
          }}
        />
      )}
      {running && <RunDialogPlaceholder tests={running.map((id) => testsById.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t))} onClose={() => setRunning(null)} />}
      <Toast toast={toast} onClose={closeToast} />
    </SuitesContext.Provider>
  );
}

/** Right pane when no test is selected. */
export function NoTestSelected() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-text-muted">
      <p>Select a test to see its details.</p>
    </div>
  );
}
