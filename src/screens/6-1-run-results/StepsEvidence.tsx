import { useState } from 'react';
import { Bug, Check, ChevronDown, ChevronRight, CircleX, Lightbulb, Minus, TriangleAlert, X } from 'lucide-react';
import type { Browser, Result, ResultStep, Status, TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Checkbox } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented';
import { ScreenshotPlaceholder, VisualMarkBadge, visualMarkText } from '@/components/Screenshot';
import { StatusChip } from '@/components/StatusViews';
import { StatusIcon, statusIcons } from '@/components/StatusIcon';
import { formatDuration, plural } from '@/lib/format';
import { browserLabels, reasonLabels, statusLabels } from '@/lib/labels';
import { browserEvidence, browserNotRunNote, dataRowsBreakdown, defaultExpandedStep, failureHeadline, leadBrowser, reasonGuidance, visualMark } from '@/lib/resultRules';
import { rowsPassed } from '@/lib/suiteRules';
import { cn } from '@/lib/utils';

const NOT_RECORDED = 'Not recorded';
const stepDuration = (ms: number) => (ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : formatDuration(ms));

/**
 * 6.1 › Steps and evidence: failure summary card (BR-REASON-04) · "Show raw actions and locators" (remembered) · step list
 * (3 levels, failed step expanded) · data rows breakdown (BR-STATUS-04) · visual mark on each step's screenshot (D88; → 6.2).
 * D86: a multi-browser result has a Browser switcher; the failure card and steps are the selected browser's evidence.
 */
export function StepsEvidence({
  result,
  test,
  browser,
  onBrowserChange,
  showRawActions,
  setShowRawActions,
  onOpenVisual,
  onCopyBugReport,
}: {
  result: Result;
  test: TestCase | null;
  /** The selected browser (D86); default: the lead browser, the one the status comes from. */
  browser?: Browser;
  onBrowserChange: (browser: Browser) => void;
  showRawActions: boolean;
  setShowRawActions: (on: boolean) => void;
  /** Opens the screenshot viewer on a step: side by side when the step was compared, else one screenshot (D88). */
  onOpenVisual: (stepIndex: number) => void;
  /** Failed results only (D63); shown next to the recommendation (D79). */
  onCopyBugReport?: () => void;
}) {
  const multi = result.perBrowser.length > 1;
  const ev = browserEvidence(result, browser);
  // The AI verdict describes the lead browser's evidence; other browsers carry their own status and reason (D86).
  const evStatus = ev.lead ? result.aiVerdict.status : ev.status;
  const steps = ev.steps;
  const failure = ev.failure;
  const headline = steps ? failureHeadline({ aiVerdict: { ...result.aiVerdict, status: evStatus }, failure, steps }) : null;
  const failed = evStatus === 'failed';
  const reason = ev.lead ? result.aiVerdict.reason : ev.reason;
  const lead = leadBrowser(result.perBrowser);
  const rows = result.dataRows ? dataRowsBreakdown(result.dataRows, test?.testData) : null;
  const rollup = rowsPassed(result);

  return (
    <div className="flex flex-col gap-4">
      {multi && (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-label text-text-muted">Browser</span>
          <SegmentedControl
            label="Browser"
            value={ev.browser}
            onChange={onBrowserChange}
            options={result.perBrowser.map((b) => ({
              value: b.browser,
              label: browserLabels[b.browser],
              icon: statusIcons[b.status].Icon,
              iconClassName: statusIcons[b.status].className,
              ariaLabel: `${browserLabels[b.browser]}: ${statusLabels[b.status]}`,
            }))}
          />
        </div>
      )}

      {multi && steps && ev.status !== result.status && lead && (
        <p className="flex items-start gap-2 rounded-card border border-border bg-surface-muted px-4 py-3">
          <StatusIcon status={ev.status} className="mt-0.5" />
          <span>
            <span className="font-semibold">
              {statusLabels[ev.status]} in {browserLabels[ev.browser]}.
            </span>{' '}
            <span className="text-text-muted">
              The result is {statusLabels[result.status]} because {browserLabels[lead]} {result.status === 'failed' ? 'failed' : result.status === 'couldnt_complete' ? "couldn't complete" : statusLabels[result.status].toLowerCase()}.
            </span>
          </span>
        </p>
      )}

      {!steps && (
        <p className="flex items-start gap-2 rounded-card border border-dashed border-border px-4 py-3 text-text-muted">
          <StatusIcon status={ev.status} className="mt-0.5" />
          {ev.status === 'not_run' ? browserNotRunNote(result, ev.browser) : `${statusLabels[ev.status]} in ${browserLabels[ev.browser]}. Steps: ${NOT_RECORDED}.`}
        </p>
      )}

      {headline && failure && (
        <section aria-label="Failure summary" className={cn('flex flex-col gap-3 rounded-card border bg-surface p-4', failed ? 'border-failed-border' : 'border-cc-border')}>
          <h3 className="flex items-center gap-2.5 font-semibold">
            <span className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-control', failed ? 'bg-failed-fill text-failed-dot' : 'bg-cc-fill text-cc-dot')}>
              {failed ? <CircleX aria-hidden="true" className="size-4" /> : <TriangleAlert aria-hidden="true" className="size-4" />}
            </span>
            {headline}
          </h3>
          {/* Expected next to Found, so the difference reads at a glance (D79). */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="min-w-0 rounded-control border border-border bg-surface-muted px-3 py-2.5">
              <p className="text-label uppercase tracking-wide text-text-muted">Expected</p>
              <p className="mt-1 break-words font-mono text-label font-normal leading-[18px]">{failure.expected}</p>
            </div>
            <div className={cn('min-w-0 rounded-control px-3 py-2.5', failed ? 'bg-failed-fill text-failed-text' : 'bg-cc-fill text-cc-text')}>
              <p className="text-label uppercase tracking-wide">Found</p>
              <p className="mt-1 break-words font-mono text-label font-normal leading-[18px]">{failure.found}</p>
            </div>
          </div>
          {(reason || onCopyBugReport) && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              {reason && (
                <>
                  <Lightbulb aria-hidden="true" className="size-[18px] shrink-0 text-accent" />
                  <p className="min-w-0 flex-[1_1_16rem] text-dense text-text-muted">
                    <span className="font-semibold text-text">{reasonLabels[reason]}:</span> {reasonGuidance[reason].explanation}{' '}
                    <span className="font-semibold text-text">Recommended: {reasonGuidance[reason].action}</span>
                  </p>
                </>
              )}
              {onCopyBugReport && (
                <Button size="sm" icon={Bug} onClick={onCopyBugReport} className={cn(!reason && 'ml-auto')}>
                  Copy bug report
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      {steps && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-text-muted">
              {result.stepsSource === 'ai_derived' ? (
                <>
                  <Chip tone="info">AI-derived</Chip> The test is one paragraph, so the AI split it into steps.
                </>
              ) : (
                plural(steps.length, 'step')
              )}
            </p>
            <Checkbox label="Show raw actions and locators" checked={showRawActions} onChange={(e) => setShowRawActions(e.target.checked)} />
          </div>

          <ol aria-label={multi ? `Steps in ${browserLabels[ev.browser]}` : 'Steps'} className="overflow-hidden rounded-card border border-border bg-surface">
            {steps.map((s) => (
              <StepItem key={`${result.id}-${ev.browser}-${s.index}`} step={s} result={result} showRawActions={showRawActions} defaultOpen={defaultExpandedStep(steps) === s.index} onOpenVisual={onOpenVisual} />
            ))}
          </ol>
        </>
      )}

      {rows && (
        <section aria-labelledby={`rows-${result.id}`}>
          <h3 id={`rows-${result.id}`} className="font-semibold">
            Data rows{rollup ? ` · ${rollup.passed}/${rollup.total} rows passed` : ''}
          </h3>
          <table className="mt-2 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-label text-text-muted">
                <th scope="col" className="py-1 pr-3">Row</th>
                <th scope="col" className="py-1 pr-3">Varied field / value</th>
                <th scope="col" className="py-1 pr-3">Expected</th>
                <th scope="col" className="py-1">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rowId} className="border-b border-border last:border-b-0">
                  <td className="py-1 pr-3">{r.index ?? '–'}</td>
                  <td className="py-1 pr-3">{r.varied}</td>
                  <td className="py-1 pr-3">{r.expected}</td>
                  <td className="py-1">
                    <StatusChip status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

/** Intent step row → expanded: Actions · Check · AI reasoning · As recorded (with "Show raw actions and locators"); the screenshot grows from thumbnail to preview (D84). */
function StepItem({
  step: s,
  result,
  showRawActions,
  defaultOpen,
  onOpenVisual,
}: {
  step: ResultStep;
  result: Result;
  showRawActions: boolean;
  defaultOpen: boolean;
  onOpenVisual: (stepIndex: number) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ran = s.status !== 'not_run';
  const panelId = `step-${result.id}-${s.index}`;
  const mark = visualMark(s);
  const markText = visualMarkText(mark, Boolean(s.visual?.previousScreenshotId));
  return (
    <li className={cn('border-b border-border last:border-b-0', open && (s.status === 'failed' || s.status === 'couldnt_complete') && 'bg-surface-muted')}>
      {/* D84: one screenshot per step, at the right; it grows from a thumbnail into a preview when the step opens. */}
      <div className="flex items-start gap-4 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-h-[45px] items-center gap-3">
            <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-3 rounded-control text-left">
              <StepDot status={s.status} />
              <span className="min-w-0 flex-1">
                <span className={cn('block', open ? 'font-semibold' : 'font-medium')}>
                  {s.index}. {s.text}
                </span>
                <span className="block text-label font-normal tabular-nums text-text-muted">{ran ? `${plural(s.actions.length, 'action')} · ${stepDuration(s.durationMs)}` : 'Not run'}</span>
              </span>
              {open ? <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-text-muted" /> : <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-text-muted" />}
            </button>
          </div>
          <div id={panelId} hidden={!open} className="mt-3 pl-9">
            {!ran ? (
              <p className="text-text-muted">Not run: the test ended before this step.</p>
            ) : (
              <div className="flex min-w-0 flex-col gap-3">
                <div>
                  <h4 className="text-label text-text-muted">Actions</h4>
                  {s.actions.length === 0 ? (
                    <p className="text-text-muted">{NOT_RECORDED}</p>
                  ) : (
                    <ul className="ml-4 list-disc">
                      {s.actions.map((a, i) => (
                        <li key={i}>{a.text}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {s.check && (
                  <div>
                    <h4 className="text-label text-text-muted">Check</h4>
                    <p>
                      <StatusIcon status={s.check.ok ? 'passed' : 'failed'} className="mr-1 align-[-3px]" />
                      Expected <span className="font-mono">{s.check.expected}</span> → found <span className="font-mono">{s.check.found}</span>
                    </p>
                  </div>
                )}
                {s.aiReasoning && (
                  <div>
                    <h4 className="text-label text-text-muted">AI reasoning</h4>
                    <p>{s.aiReasoning}</p>
                  </div>
                )}
                {showRawActions && (
                  <div className="rounded-control border border-border bg-bg p-3">
                    <h4 className="text-label text-text-muted">As recorded</h4>
                    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-label font-normal">
                      {s.actions.map((a, i) => (
                        <TechRow key={i} term={`Action ${i + 1}`} value={`${a.raw}${a.locator ? ` · locator ${a.locator}` : ' · locator: Not recorded'}`} mono />
                      ))}
                      <TechRow term="URL" value={s.url} mono />
                      <TechRow term="AI thought" value={s.aiThought} />
                    </dl>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {s.screenshotId && (
          // D88: one screenshot viewer (compares when the step was compared); the visual mark sits in the top-right corner.
          <ScreenshotPlaceholder
            size={open ? 'preview' : 'thumb'}
            caption={open ? `[Screenshot · step ${s.index} · click for full viewer]` : `Screenshot of step ${s.index}`}
            openLabel={`Open screenshot of step ${s.index}${markText ? `, ${markText}` : ''}`}
            onOpen={() => onOpenVisual(s.index)}
          >
            {mark && <VisualMarkBadge mark={mark} size={open ? 'preview' : 'thumb'} />}
          </ScreenshotPlaceholder>
        )}
      </div>
    </li>
  );
}

const stepDot: Record<Status, { Icon: typeof Check; className: string }> = {
  passed: { Icon: Check, className: 'bg-passed-fill text-passed-dot' },
  failed: { Icon: X, className: 'bg-failed-fill text-failed-dot' },
  couldnt_complete: { Icon: TriangleAlert, className: 'bg-cc-fill text-cc-dot' },
  not_run: { Icon: Minus, className: 'border border-border text-notrun' },
};

/** Round step marker: the status's tint and glyph (D79), with the status as text for screen readers. */
function StepDot({ status }: { status: Status }) {
  const { Icon, className } = stepDot[status];
  return (
    <span className={cn('inline-flex size-6 shrink-0 items-center justify-center rounded-pill', className)}>
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
      <span className="sr-only">{statusLabels[status]}</span>
    </span>
  );
}

function TechRow({ term, value, mono }: { term: string; value: string | undefined; mono?: boolean }) {
  return (
    <>
      <dt className="text-text-muted">{term}</dt>
      <dd className={cn('min-w-0 break-words', mono && value && 'font-mono', !value && 'text-text-muted')}>{value || NOT_RECORDED}</dd>
    </>
  );
}
