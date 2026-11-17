import { useState } from 'react';
import { Bug, Check, ChevronDown, ChevronRight, CircleX, Lightbulb, Minus, TriangleAlert, X } from 'lucide-react';
import type { Result, ResultStep, Status, TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Checkbox } from '@/components/ui/field';
import { ScreenshotPlaceholder } from '@/components/Screenshot';
import { StatusChip } from '@/components/StatusViews';
import { StatusIcon } from '@/components/StatusIcon';
import { formatDuration, plural } from '@/lib/format';
import { reasonLabels, statusLabels } from '@/lib/labels';
import { dataRowsBreakdown, defaultExpandedStep, failureHeadline, reasonGuidance } from '@/lib/resultRules';
import { rowsPassed } from '@/lib/suiteRules';
import { cn } from '@/lib/utils';

const NOT_RECORDED = 'Not recorded';
const stepDuration = (ms: number) => (ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : formatDuration(ms));

/**
 * 6.1 › Steps and evidence: failure summary card (BR-REASON-04) · "Show technical details" (remembered) · step list
 * (3 levels, failed step expanded) · data rows breakdown (BR-STATUS-04) · visual flags per step (→ 6.2).
 */
export function StepsEvidence({
  result,
  test,
  showTechnical,
  setShowTechnical,
  onOpenScreenshot,
  onOpenVisual,
  onCopyBugReport,
}: {
  result: Result;
  test: TestCase | null;
  showTechnical: boolean;
  setShowTechnical: (on: boolean) => void;
  onOpenScreenshot: (step: ResultStep) => void;
  onOpenVisual: (stepIndex: number) => void;
  /** Failed results only (D63); shown next to the recommendation (D79). */
  onCopyBugReport?: () => void;
}) {
  const headline = failureHeadline(result);
  const failed = result.aiVerdict.status === 'failed';
  const reason = result.aiVerdict.reason;
  const rows = result.dataRows ? dataRowsBreakdown(result.dataRows, test?.testData) : null;
  const rollup = rowsPassed(result);

  return (
    <div className="flex flex-col gap-4">
      {headline && result.failure && (
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
              <p className="mt-1 break-words font-mono text-label font-normal leading-[18px]">{result.failure.expected}</p>
            </div>
            <div className={cn('min-w-0 rounded-control px-3 py-2.5', failed ? 'bg-failed-fill text-failed-text' : 'bg-cc-fill text-cc-text')}>
              <p className="text-label uppercase tracking-wide">Found</p>
              <p className="mt-1 break-words font-mono text-label font-normal leading-[18px]">{result.failure.found}</p>
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-text-muted">
          {result.stepsSource === 'ai_derived' ? (
            <>
              <Chip tone="info">AI-derived</Chip> The test is one paragraph, so the AI split it into steps.
            </>
          ) : (
            plural(result.steps.length, 'step')
          )}
        </p>
        <Checkbox label="Show technical details" checked={showTechnical} onChange={(e) => setShowTechnical(e.target.checked)} />
      </div>

      <ol aria-label="Steps" className="overflow-hidden rounded-card border border-border bg-surface">
        {result.steps.map((s) => (
          <StepItem key={`${result.id}-${s.index}`} step={s} result={result} showTechnical={showTechnical} defaultOpen={defaultExpandedStep(result.steps) === s.index} onOpenScreenshot={onOpenScreenshot} onOpenVisual={onOpenVisual} />
        ))}
      </ol>

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

/** Intent step row → expanded: Actions · Check · AI reasoning · Technical (with the toggle) · screenshot. */
function StepItem({
  step: s,
  result,
  showTechnical,
  defaultOpen,
  onOpenScreenshot,
  onOpenVisual,
}: {
  step: ResultStep;
  result: Result;
  showTechnical: boolean;
  defaultOpen: boolean;
  onOpenScreenshot: (step: ResultStep) => void;
  onOpenVisual: (stepIndex: number) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ran = s.status !== 'not_run';
  const panelId = `step-${result.id}-${s.index}`;
  const v = s.visual;
  return (
    <li className={cn('border-b border-border last:border-b-0', open && (s.status === 'failed' || s.status === 'couldnt_complete') && 'bg-surface-muted')}>
      <div className="flex items-center gap-3 px-3.5 py-3">
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
        {v && v.changedAreas > 0 && (
          <button type="button" onClick={() => onOpenVisual(s.index)} className="shrink-0 rounded-pill">
            <Chip tone={v.dismissed ? 'passed' : 'cc'}>{v.dismissed ? 'Looks fine' : `${plural(v.changedAreas, 'area')} changed`}</Chip>
            <span className="sr-only"> on step {s.index}: open Visual compare</span>
          </button>
        )}
        {v && v.changedAreas === 0 && v.previousScreenshotId && (
          <button type="button" onClick={() => onOpenVisual(s.index)} className="shrink-0 rounded-pill">
            <Chip>No visual change</Chip>
            <span className="sr-only"> on step {s.index}: open Visual compare</span>
          </button>
        )}
        {s.screenshotId && <ScreenshotPlaceholder size="thumb" caption={`Screenshot of step ${s.index}`} openLabel={`Open screenshot of step ${s.index}`} onOpen={() => onOpenScreenshot(s)} />}
      </div>
      <div id={panelId} hidden={!open} className={cn(open && 'grid', 'gap-4 pb-4 pl-[50px] pr-3.5 md:grid-cols-[1fr_minmax(0,240px)]')}>
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
            {showTechnical && (
              <div className="rounded-control border border-border bg-bg p-3">
                <h4 className="text-label text-text-muted">Technical</h4>
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
        {s.screenshotId && <ScreenshotPlaceholder caption={`[Screenshot · step ${s.index} · click for full viewer]`} openLabel={`Open screenshot of step ${s.index}`} onOpen={() => onOpenScreenshot(s)} />}
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
