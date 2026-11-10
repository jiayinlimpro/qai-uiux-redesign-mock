import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { deleteTests, getTest, getTestHistory, restoreTests, saveTest } from '@/data/api';
import type { TestCase } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Menu } from '@/components/ui/menu';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { ErrorState } from '@/components/StateViews';
import { ReasonChip, StatusChip } from '@/components/StatusViews';
import { errorText } from '@/components/StatusLine';
import { useConfirm } from '@/components/useConfirm';
import { useProject } from '@/app/projectContext';
import { OverviewLink } from '@/app/WayBackLink';
import { to, type TestTab } from '@/app/routes';
import { showsLikelyBugBadge } from '@/lib/exploreRules';
import { formatDate, plural } from '@/lib/format';
import { deleteImpact } from '@/lib/suiteRules';
import { browserLabels, scriptLabels, sourceLabels } from '@/lib/labels';
import { useSuites } from './suitesContext';
import { DefinitionTab } from './tabs/DefinitionTab';
import { TestDataTab } from './tabs/TestDataTab';
import { VisualCheckTab } from './tabs/VisualCheckTab';
import { HistoryTab } from './tabs/HistoryTab';
import { KnownIssueDialog } from './KnownIssueDialog';

const tabs: { id: TestTab; label: string }[] = [
  { id: 'definition', label: 'Definition' },
  { id: 'test-data', label: 'Test data' },
  { id: 'visual-check', label: 'Visual check' },
  { id: 'history', label: 'History' },
];

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
  const likelyBug = showsLikelyBugBadge(test, Boolean(latest));
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
    <article className="p-6" aria-labelledby="test-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label font-normal text-text-muted">
            {suite?.name ?? 'Not in a suite'} › {test.testId}
          </p>
          <h2 id="test-title" className="text-h1">
            {test.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip>v{test.version}</Chip>
            <Chip>{test.source === 'clone' ? `Source: Clone of ${original?.testId ?? 'a deleted test'}` : sourceLabels[test.source]}</Chip>
            <Chip>{scriptLabels[test.script.state]}</Chip>
            {test.knownIssue && <Chip tone="cc">Known issue{test.knownIssue.ticketRef ? ` · ${test.knownIssue.ticketRef}` : ''}</Chip>}
            {likelyBug && test.aiExploreFinding && (
              <>
                <span title="Found during AI explore, not yet confirmed by a run">
                  <Chip tone="failed">Likely bug</Chip>
                </span>
                <span className="text-label font-normal text-text-muted">Found during AI explore, not yet confirmed by a run.</span>
                <Link to={to.exploreChat(project.id, test.aiExploreFinding.chatId, test.aiExploreFinding.messageIndex)} className="text-label text-accent underline underline-offset-2">
                  View in AI explore
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => s.openRun([test.id])}>
            Run
          </Button>
          <Link to={to.editTest(project.id, test.id)} className={buttonClasses()}>
            Edit
          </Link>
          <Button onClick={() => void s.clone([test.id])}>Clone</Button>
          <Menu
            label="More"
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
        </div>
      </div>

      {/* Latest strip: one line, no full result here (results live in Runs). */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface px-4 py-3">
        <span className="font-semibold">Latest</span>
        {latest && latestRun ? (
          <>
            <StatusChip status={latest.status} />
            {latest.reason && <ReasonChip reason={latest.reason} />}
            <span className="text-text-muted">
              Run #{latestRun.number} · {latestRun.environment.name} · {latest.perBrowser.map((b) => browserLabels[b.browser]).join(', ')} · {formatDate(latestRun.startedAt)}
            </span>
            <Link to={to.run(project.id, latestRun.id, latest.id)} className="ml-auto text-accent underline underline-offset-2">
              Open result
            </Link>
          </>
        ) : (
          <>
            <StatusChip status="not_run" />
            <span className="text-text-muted">This test hasn’t run yet.</span>
          </>
        )}
      </div>

      <div className="mt-5">
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
