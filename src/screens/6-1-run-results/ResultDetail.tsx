import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { KnowledgeItem, ResultStep, Run, TestCase } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { ReasonChip, StatusChip } from '@/components/StatusViews';
import { StatusIcon } from '@/components/StatusIcon';
import { to } from '@/app/routes';
import { formatDate } from '@/lib/format';
import { browserLabels, modeLabels, reasonLabels, statusLabels } from '@/lib/labels';
import { canOverride, hasBugReport, latestOverride, versionLine, type ResultOverride, type ResultRow } from '@/lib/resultRules';
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
  showTechnical,
  setShowTechnical,
  onRerun,
  onCopyBugReport,
  onOverride,
  onKnownIssue,
  onOpenVisual,
  onOpenScreenshot,
}: {
  row: ResultRow;
  run: Run;
  test: TestCase | null;
  projectId: string;
  knowledge: KnowledgeItem[];
  runs: Run[];
  showTechnical: boolean;
  setShowTechnical: (on: boolean) => void;
  onRerun: () => void;
  onCopyBugReport: () => void;
  onOverride: () => void;
  onKnownIssue: () => void;
  onOpenVisual: (stepIndex: number) => void;
  onOpenScreenshot: (step: ResultStep) => void;
}) {
  const [tab, setTab] = useState<DetailTab>('steps');
  const r = row.result;
  const multi = (r?.perBrowser.length ?? 0) > 1;
  const idPrefix = `result-${row.key}`;
  // D62: every override is kept; the newest applies, earlier ones are listed under History (newest first).
  const latest = r ? latestOverride(r) : undefined;
  const earlier: ResultOverride[] = r?.overrides ? r.overrides.slice(0, -1).reverse() : [];

  return (
    <div className="flex flex-col gap-3 p-5">
      <div>
        <p className="text-label font-normal text-text-muted">{row.suiteName || (row.deleted ? 'Deleted test' : '')}</p>
        <h2 className="text-h2">
          {row.displayId} · {row.title}
          {row.deleted && <span className="ml-2 text-base font-normal text-text-muted">(deleted)</span>}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-1.5">
          <StatusChip status={row.status} />
          {r?.reason && <ReasonChip reason={r.reason} />}
          {r && <Chip>{modeLabels[r.mode]}</Chip>}
          {r &&
            r.perBrowser.map((b) => (
              <Chip key={b.browser}>
                {browserLabels[b.browser]}
                {multi && (
                  <>
                    <StatusIcon status={b.status} className="ml-1" />
                  </>
                )}
              </Chip>
            ))}
          {r?.aiVerdict.confidence === 'low' && <Chip tone="cc">Low confidence</Chip>}
          {r?.flags.scriptReRecorded && <Chip tone="info">Script re-recorded</Chip>}
          {test?.knownIssue && <Chip tone="cc">Known issue{test.knownIssue.ticketRef ? ` · ${test.knownIssue.ticketRef}` : ''}</Chip>}
        </p>
        <p className="mt-1 text-text-muted">
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
        {row.note && <p className="mt-1 text-text-muted">Note: {row.note}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onRerun} disabled={!test} title={test ? undefined : 'The test was deleted'}>
          Re-run
        </Button>
        {r && hasBugReport(r) && <Button onClick={onCopyBugReport}>Copy bug report</Button>}
        {test && (
          <Link to={to.editTest(projectId, test.id, r?.id)} className={buttonClasses()}>
            Edit test
          </Link>
        )}
        {r && canOverride(r) && <Button onClick={onOverride}>Override</Button>}
        {test && (
          <Menu
            label="More"
            accessibleLabel={`More actions for ${row.displayId}`}
            variant="secondary"
            items={[{ label: test.knownIssue ? 'Update known issue' : 'Mark known issue', onSelect: onKnownIssue }]}
          />
        )}
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
              { id: 'steps', label: 'Steps and evidence' },
              { id: 'technical', label: 'Technical' },
            ]}
          />
          <TabPanel idPrefix={idPrefix} id={tab}>
            {tab === 'steps' ? (
              <StepsEvidence result={r} test={test} showTechnical={showTechnical} setShowTechnical={setShowTechnical} onOpenScreenshot={onOpenScreenshot} onOpenVisual={onOpenVisual} />
            ) : (
              <TechnicalTab result={r} run={run} test={test} knowledge={knowledge} runs={runs} />
            )}
          </TabPanel>
        </div>
      )}
    </div>
  );
}
