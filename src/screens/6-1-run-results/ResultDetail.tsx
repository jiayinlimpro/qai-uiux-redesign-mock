import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bug, Code, Ellipsis, Folder, ListChecks, Pencil, RotateCcw, ShieldCheck } from 'lucide-react';
import type { Browser, KnowledgeItem, Run, TestCase } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { BrowserChip, ModeChip, ReasonChip, StatusChip } from '@/components/StatusViews';
import { to } from '@/app/routes';
import { formatDate } from '@/lib/format';
import { reasonLabels, statusLabels } from '@/lib/labels';
import { canOverride, failureHeadline, hasBugReport, latestOverride, versionLine, type ResultOverride, type ResultRow } from '@/lib/resultRules';
import { Menu } from '@/components/ui/menu';
import { StepsEvidence } from './StepsEvidence';
import { TechnicalTab } from './TechnicalTab';

type DetailTab = 'steps' | 'technical';

/**
 * 6.1 right: result detail (screens/07-results.md). Suite · "<ID> · <title>" · chips · version line with Open test /
 * View test history · Re-run (primary) · Copy bug report · Edit test · Override · banners · tabs.
 */
export function ResultDetail({
  row,
  run,
  test,
  projectId,
  knowledge,
  runs,
  browser,
  onBrowserChange,
  showRawActions,
  setShowRawActions,
  onRerun,
  onCopyBugReport,
  onOverride,
  onKnownIssue,
  onOpenVisual,
}: {
  row: ResultRow;
  run: Run;
  test: TestCase | null;
  projectId: string;
  knowledge: KnowledgeItem[];
  runs: Run[];
  /** The selected browser of a multi-browser result (D86). */
  browser?: Browser;
  onBrowserChange: (browser: Browser) => void;
  showRawActions: boolean;
  setShowRawActions: (on: boolean) => void;
  onRerun: () => void;
  onCopyBugReport: () => void;
  onOverride: () => void;
  onKnownIssue: () => void;
  onOpenVisual: (stepIndex: number) => void;
}) {
  const [tab, setTab] = useState<DetailTab>('steps');
  const r = row.result;
  const multi = (r?.perBrowser.length ?? 0) > 1;
  const idPrefix = `result-${row.key}`;
  // D62: every override is kept; the newest applies, earlier ones are listed under History (newest first).
  const latest = r ? latestOverride(r) : undefined;
  const earlier: ResultOverride[] = r?.overrides ? r.overrides.slice(0, -1).reverse() : [];
  // D79: Copy bug report sits in the failure card, next to the recommendation; the header keeps it only without a card.
  const bugReport = Boolean(r && hasBugReport(r));
  const failureCard = Boolean(r && r.failure && failureHeadline(r));

  return (
    <div className="flex flex-col gap-4 px-6 pb-8 pt-5">
      {/* First line: where the test lives, and the actions (primary last, D79). The title gets the full width below. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="inline-flex items-center gap-1.5 text-label font-normal text-text-muted">
            {row.suiteName && <Folder aria-hidden="true" className="size-3.5" />}
            {row.suiteName || (row.deleted ? 'Deleted test' : '')}
          </p>
          <div className="flex flex-wrap gap-2">
            {bugReport && !failureCard && (
              <Button icon={Bug} onClick={onCopyBugReport}>
                Copy bug report
              </Button>
            )}
            {test && (
              <Link to={to.editTest(projectId, test.id, r?.id)} className={buttonClasses()}>
                <Pencil aria-hidden="true" />
                Edit test
              </Link>
            )}
            {r && canOverride(r) && (
              <Button icon={ShieldCheck} onClick={onOverride}>
                Override
              </Button>
            )}
            {test && (
              <Menu
                label={<Ellipsis aria-hidden="true" />}
                iconOnly
                size="md"
                accessibleLabel={`More actions for ${row.displayId}`}
                variant="secondary"
                items={[{ label: test.knownIssue ? 'Update known issue' : 'Mark known issue', onSelect: onKnownIssue }]}
              />
            )}
            <Button variant="primary" icon={RotateCcw} onClick={onRerun} disabled={!test} title={test ? undefined : 'The test was deleted'}>
              Re-run
            </Button>
          </div>
        </div>
        <h2 className="text-h2">
          <span className="font-mono text-[17px] font-medium text-text-muted">{row.displayId}</span> <span className="sr-only">· </span>
          {row.title}
          {row.deleted && <span className="ml-2 text-base font-normal text-text-muted">(deleted)</span>}
        </h2>
        <p className="flex flex-wrap items-center gap-1.5">
          <StatusChip status={row.status} />
          {r?.reason && <ReasonChip reason={r.reason} />}
          {r && <ModeChip mode={r.mode} />}
          {r && r.perBrowser.map((b) => <BrowserChip key={b.browser} browser={b.browser} status={multi ? b.status : undefined} />)}
          {r?.aiVerdict.confidence === 'low' && <Chip tone="cc">Low confidence</Chip>}
          {r?.flags.scriptReRecorded && <Chip tone="info">Script re-recorded</Chip>}
          {test?.knownIssue && <Chip tone="cc">Known issue{test.knownIssue.ticketRef ? ` · ${test.knownIssue.ticketRef}` : ''}</Chip>}
        </p>
        <p className="text-dense text-text-muted">
          {r ? versionLine(r.testVersion, test?.version ?? null) : `Not run in Run #${run.number}`}
          {test && (
            <>
              {' · '}
              <Link to={to.suiteTest(projectId, test.id)} className="text-accent underline underline-offset-2">
                Open test
              </Link>
              {' · '}
              <Link to={to.suiteTest(projectId, test.id, 'history')} className="text-accent underline underline-offset-2">
                View test history
              </Link>
            </>
          )}
        </p>
        {row.note && <p className="text-dense text-text-muted">Note: {row.note}</p>}
      </div>

      {r?.flags.worthALook && (
        <div role="note" className="rounded-card border border-accent-soft bg-accent-soft px-4 py-2 text-accent-soft-text">
          Worth a look: {r.flags.worthALook}
        </div>
      )}
      {r && latest && (
        <div role="note" className="rounded-card border border-border bg-surface-muted px-4 py-2">
          <span className="font-semibold">
            Overridden to {statusLabels[latest.status]} by {latest.by} · {formatDate(latest.at)}
          </span>
          <span className="text-text-muted">
            {' '}
            · AI verdict: {statusLabels[r.aiVerdict.status]}
            {r.aiVerdict.reason ? ` · ${reasonLabels[r.aiVerdict.reason]}` : ''}
          </span>
          <p>Reason: {latest.reason}</p>
          <p className="text-text-muted">Proof: {latest.proofName}</p>
          {earlier.length > 0 && (
            <section aria-labelledby={`${idPrefix}-override-history`} className="mt-2 border-t border-border pt-2">
              <h3 id={`${idPrefix}-override-history`} className="text-label text-text-muted">
                History · earlier overrides
              </h3>
              <ol className="mt-1 flex flex-col gap-1">
                {earlier.map((o, i) => (
                  <li key={i} className="text-text-muted">
                    {statusLabels[o.status]} by {o.by} · {formatDate(o.at)} · Reason: {o.reason} · Proof: {o.proofName}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
      {test?.knownIssue && (test.knownIssue.note || test.knownIssue.by) && (
        <p className="text-text-muted">
          Known issue{test.knownIssue.note ? `: ${test.knownIssue.note}` : ''}
          {test.knownIssue.by ? ` · marked by ${test.knownIssue.by} · ${formatDate(test.knownIssue.markedAt)}` : ` · ${formatDate(test.knownIssue.markedAt)}`}
        </p>
      )}

      {!r ? (
        <p className="rounded-card border border-border bg-surface p-4 text-text-muted">
          This test did not run in Run #{run.number}, so there is no evidence. Select it and use Re-run to run it.
        </p>
      ) : (
        <div>
          <Tabs
            label="Result detail"
            idPrefix={idPrefix}
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'steps', label: 'Steps and evidence', icon: ListChecks },
              { id: 'technical', label: 'Technical', icon: Code },
            ]}
          />
          <TabPanel idPrefix={idPrefix} id={tab}>
            {tab === 'steps' ? (
              <StepsEvidence
                result={r}
                test={test}
                {...(browser ? { browser } : {})}
                onBrowserChange={onBrowserChange}
                showRawActions={showRawActions}
                setShowRawActions={setShowRawActions}
                onOpenVisual={onOpenVisual}
                onCopyBugReport={bugReport ? onCopyBugReport : undefined}
              />
            ) : (
              <TechnicalTab result={r} run={run} test={test} knowledge={knowledge} runs={runs} />
            )}
          </TabPanel>
        </div>
      )}
    </div>
  );
}
