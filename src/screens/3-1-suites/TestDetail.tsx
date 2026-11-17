import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Copy, Ellipsis, Eye, FileCode, FileText, Folder, History, PenLine, Pencil, Play, Table2, Tag, type LucideIcon } from 'lucide-react';
import { deleteTests, getTest, getTestHistory, restoreTests, saveTest } from '@/data/api';
import type { TestCase } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { AiExploreIcon } from '@/components/AiExploreIcon';
import { Chip } from '@/components/ui/chip';
import { Menu } from '@/components/ui/menu';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { ErrorState } from '@/components/StateViews';
import { BrowserMarks, ReasonChip } from '@/components/StatusViews';
import { statusIcons } from '@/components/StatusIcon';
import { errorText } from '@/components/StatusLine';
import { useConfirm } from '@/components/useConfirm';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { OverviewLink } from '@/app/WayBackLink';
import { to, type TestTab } from '@/app/routes';
import { NEEDS_FIXING_TIP, showsNeedsFixingBadge } from '@/lib/exploreRules';
import { formatDate, plural } from '@/lib/format';
import { latestByBrowser } from '@/lib/resultRules';
import { deleteImpact } from '@/lib/suiteRules';
import { browserLabels, browserShortLabels, scriptLabels, sourceLabels, statusLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { useSuites } from './suitesContext';
import { DefinitionTab } from './tabs/DefinitionTab';
import { TestDataTab } from './tabs/TestDataTab';
import { VisualCheckTab } from './tabs/VisualCheckTab';
import { HistoryTab } from './tabs/HistoryTab';
import { KnownIssueDialog } from './KnownIssueDialog';

const tabs: { id: TestTab; label: string; icon: LucideIcon }[] = [
  { id: 'definition', label: 'Definition', icon: FileText },
  { id: 'test-data', label: 'Test data', icon: Table2 },
  { id: 'visual-check', label: 'Visual check', icon: Eye },
  { id: 'history', label: 'History', icon: History },
];

const sourceIcons: Record<TestCase['source'], LucideIcon> = { import: FileText, written: PenLine, ai_explore: AiExploreIcon, clone: Copy };
const latestTile: Record<'passed' | 'failed' | 'couldnt_complete' | 'not_run', string> = {
  passed: 'bg-passed-fill text-passed-dot',
  failed: 'bg-failed-fill text-failed-dot',
  couldnt_complete: 'bg-cc-fill text-cc-dot',
  not_run: 'border border-border text-notrun',
};
const latestText: Record<'passed' | 'failed' | 'couldnt_complete' | 'not_run', string> = {
  passed: 'text-passed-text',
  failed: 'text-failed-text',
  couldnt_complete: 'text-cc-text',
  not_run: 'text-text',
};

/** Saves a change to the latest saved test; the data layer decides version and script (BR-VERSION-01, BR-SCRIPT-02). */
export type SaveTest = (change: (t: TestCase) => TestCase) => Promise<TestCase>;

/** 3.1 right pane: test detail (screens/04-suites.md). */
export function TestDetail() {
  const project = useProject();
  const s = useSuites();
  const navigate = useNavigate();
  const { testId = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const tab = tabs.find((t) => t.id === search.get('tab'))?.id ?? 'definition';
  const test = s.tests.find((t) => t.id === testId);
  const [confirm, confirmDialog] = useConfirm();
  const [knownIssue, setKnownIssue] = useState(false);
  // D86: each browser's most recent result ("By browser"); the test's status stays its latest result.
  const history = useAsync(() => getTestHistory(testId), [testId, s.latest[testId]?.id]);

  const save: SaveTest = useCallback(
    async (change) => {
      const saved = await saveTest(change(await getTest(testId)));
      s.reload();
      return saved;
    },
    [testId, s],
  );

  // BR-TEST-04: the New badge clears when the test is opened (no new version).
  const cleared = useRef<string | null>(null);
  useEffect(() => {
    if (test?.isNew && cleared.current !== test.id) {
      cleared.current = test.id;
      void save((t) => ({ ...t, isNew: false }));
    }
  }, [test, save]);

  if (!test) {
    return (
      // 03 § Not found: something inside an existing project → that project's Overview, no Retry.
      <ErrorState title="Test not found" message="It may have been deleted.">
        <OverviewLink projectId={project.id} projectName={project.name} />
      </ErrorState>
    );
  }

  const suite = s.suites.find((x) => x.id === test.suiteId);
  const latest = s.latest[test.id];
  const latestRun = latest ? s.runs.find((r) => r.id === latest.runId) : undefined;
  const byBrowser = history.status === 'ready' ? latestByBrowser(history.data) : [];
  const needsFixing = showsNeedsFixingBadge(test, Boolean(latest));
  const original = test.clonedFromId ? s.tests.find((t) => t.id === test.clonedFromId) : undefined;

  /** Delete with a confirmation that lists what is affected, and Undo in the toast (BR-TEST-06, D46). */
  async function remove() {
    if (!test) return;
    let history: { testId: string }[] = [];
    try {
      history = await getTestHistory(test.id);
    } catch {
      // the count is informative only
    }
    const impact = deleteImpact(test.id, s.knowledge, history);
    const lines = [
      impact.documents > 0 && `${plural(impact.documents, 'document')} ${impact.documents === 1 ? 'is' : 'are'} scoped to this test; ${impact.documents === 1 ? 'it stays' : 'they stay'} in Knowledge but will apply to no test.`,
      impact.skills > 0 && `${plural(impact.skills, 'skill')} ${impact.skills === 1 ? 'is' : 'are'} scoped to this test; ${impact.skills === 1 ? 'it stays' : 'they stay'} in Knowledge but will apply to no test.`,
      impact.results > 0 && `${plural(impact.results, 'result')} ${impact.results === 1 ? 'stays' : 'stay'} in ${impact.results === 1 ? 'its run' : 'their runs'} and keep${impact.results === 1 ? 's' : ''} showing ${test.testId} ${test.title}.`,
    ].filter((x): x is string => Boolean(x));
    const ok = await confirm({
      title: `Delete ${test.testId}?`,
      danger: true,
      confirmLabel: 'Delete test',
      body: (
        <>
          <p>{test.title} is removed from the library. You can undo this right after.</p>
          {lines.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </>
      ),
    });
    if (!ok) return;
    try {
      const removed = await deleteTests([test.id]);
      s.reload();
      navigate(to.suites(project.id));
      s.showToast({
        text: `Deleted ${test.testId}`,
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreTests(removed).then((restored) => {
              s.reload();
              s.showToast({ text: `Restored ${restored[0]?.testId ?? test.testId}` });
              if (restored[0]) navigate(to.suiteTest(project.id, restored[0].id));
            });
          },
        },
      });
    } catch (e) {
      s.showToast({ text: `Couldn't delete: ${errorText(e)}` });
    }
  }

  return (
    <article className="flex flex-col gap-4 px-7 pb-8 pt-5" aria-labelledby="test-title">
      {/* First line: where the test lives, and the actions (primary last, D80). The title gets the full width below. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="inline-flex items-center gap-1.5 text-label font-normal text-text-muted">
            <Folder aria-hidden="true" className="size-3.5" />
            {suite?.name ?? 'Not in a suite'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to={to.editTest(project.id, test.id)} className={buttonClasses()}>
              <Pencil aria-hidden="true" />
              Edit
            </Link>
            <Button icon={Copy} onClick={() => void s.clone([test.id])}>
              Clone
            </Button>
            <Menu
              label={<Ellipsis aria-hidden="true" />}
              iconOnly
              size="md"
              accessibleLabel={`More actions for ${test.testId}`}
              items={[
                { label: 'Move to suite', onSelect: () => s.openMove([test.id]) },
                test.knownIssue
                  ? {
                      label: 'Remove known issue',
                      onSelect: () => {
                        void save((t) => {
                          const { knownIssue: _k, ...rest } = t;
                          return rest;
                        }).then(() => s.showToast({ text: 'Known issue removed' }));
                      },
                    }
                  : { label: 'Mark known issue', onSelect: () => setKnownIssue(true) },
                { label: 'Delete', onSelect: () => void remove(), danger: true },
              ]}
            />
            <Button variant="primary" icon={Play} onClick={() => s.openRun([test.id])}>
              Run
            </Button>
          </div>
        </div>
        <h2 id="test-title" className="text-h1">
          <span className="font-mono text-[18px] font-medium text-text-muted">{test.testId}</span> <span className="sr-only">· </span>
          {test.title}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip icon={Tag}>v{test.version}</Chip>
          <Chip icon={sourceIcons[test.source]}>{test.source === 'clone' ? `Source: Clone of ${original?.testId ?? 'a deleted test'}` : sourceLabels[test.source]}</Chip>
          <Chip icon={FileCode} tone={test.script.state === 'recorded' ? 'info' : 'neutral'}>
            {scriptLabels[test.script.state]}
          </Chip>
          {test.knownIssue && <Chip tone="cc">Known issue{test.knownIssue.ticketRef ? ` · ${test.knownIssue.ticketRef}` : ''}</Chip>}
          {needsFixing && (
            <>
              <span title={NEEDS_FIXING_TIP}>
                <Chip tone="cc">Needs fixing</Chip>
              </span>
              <span className="text-label font-normal text-text-muted">{NEEDS_FIXING_TIP}</span>
              {test.aiOrigin && (
                <Link to={to.exploreChat(project.id, test.aiOrigin.chatId, test.aiOrigin.messageIndex)} className="text-label text-accent underline underline-offset-2">
                  View in AI explore
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Latest result: one line, no full result here (results live in Runs). */}
      <LatestCard
        status={latest && latestRun ? latest.status : 'not_run'}
        reason={latest && latestRun ? latest.reason : undefined}
        details={
          latest && latestRun ? (
            <>
              Run #{latestRun.number} · {latestRun.environment.name} ·{' '}
              {latest.perBrowser.length > 1 ? (
                <BrowserMarks className="text-text" marks={latest.perBrowser.map((b) => ({ key: b.browser, status: b.status, label: browserShortLabels[b.browser] }))} />
              ) : (
                latest.perBrowser.map((b) => browserLabels[b.browser]).join(', ')
              )}{' '}
              · {formatDate(latestRun.startedAt)}
            </>
          ) : (
            'This test hasn’t run yet.'
          )
        }
        href={latest && latestRun ? to.run(project.id, latestRun.id, latest.id) : undefined}
        byBrowser={
          byBrowser.length > 0 ? (
            <ul aria-label="Most recent result in each browser" className="flex flex-wrap gap-x-4 gap-y-1">
              {byBrowser.map((b) => {
                const run = s.runs.find((r) => r.id === b.result.runId);
                if (!run) return null;
                const { Icon, className } = statusIcons[b.status];
                return (
                  <li key={b.browser}>
                    <Link to={to.run(project.id, run.id, b.result.id, b.browser)} className="inline-flex items-center gap-1 rounded-control text-accent underline underline-offset-2">
                      <Icon aria-hidden="true" className={cn('size-3.5 shrink-0', className)} />
                      <span className="sr-only">{statusLabels[b.status]}: </span>
                      {browserLabels[b.browser]} · #{run.number} {run.environment.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : undefined
        }
      />

      <div>
        <Tabs
          label="Test details"
          idPrefix="test"
          tabs={tabs}
          value={tab}
          onChange={(id) =>
            setSearch(
              (prev) => {
                const next = new URLSearchParams(prev);
                next.set('tab', id);
                return next;
              },
              { replace: true },
            )
          }
        />
        <TabPanel idPrefix="test" id={tab}>
          {tab === 'definition' && <DefinitionTab test={test} save={save} />}
          {tab === 'test-data' && <TestDataTab key={test.id} test={test} save={save} />}
          {tab === 'visual-check' && <VisualCheckTab test={test} save={save} />}
          {tab === 'history' && <HistoryTab test={test} />}
        </TabPanel>
      </div>
      {knownIssue && <KnownIssueDialog test={test} onClose={() => setKnownIssue(false)} />}
      {confirmDialog}
    </article>
  );
}

/** Latest result card (D80): status tile · status, reason and run facts · Open result; By browser (D86). */
function LatestCard({
  status,
  reason,
  details,
  href,
  byBrowser,
}: {
  status: keyof typeof latestTile;
  reason?: Parameters<typeof ReasonChip>[0]['reason'];
  details: ReactNode;
  href?: string;
  /** D86: each browser's most recent result, when the test ran in more than one browser. */
  byBrowser?: ReactNode;
}) {
  const Icon = statusIcons[status].Icon;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-border bg-surface px-4 py-3">
      <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-control', latestTile[status])}>
        <Icon aria-hidden="true" className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-[1_1_16rem]">
        <p className="text-label text-text-muted">Latest result</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('font-semibold', latestText[status])}>{statusLabels[status]}</span>
          {reason && <ReasonChip reason={reason} />}
          <span className="inline-flex flex-wrap items-center gap-x-1 text-text-muted">· {details}</span>
        </p>
        {byBrowser && (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border pt-2 text-dense">
            <span className="text-label text-text-muted">By browser</span>
            {byBrowser}
          </div>
        )}
      </div>
      {href && (
        <Link to={href} className={buttonClasses({ size: 'xs' })}>
          Open result
          <ArrowRight aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
