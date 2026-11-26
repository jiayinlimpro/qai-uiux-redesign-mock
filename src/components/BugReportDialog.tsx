import { useEffect, useState } from 'react';
import { ChevronDown, Ellipsis } from 'lucide-react';
import { buildBugReport, type BugReport } from '@/data/api';
import type { Browser, ID } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Menu } from '@/components/ui/menu';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { StatusLine, errorText, type SaveStatus } from '@/components/StatusLine';
import { ScreenshotPlaceholder } from '@/components/Screenshot';
import { useAsync } from '@/app/hooks/useAsync';
import { copyImage, copyText } from '@/app/clipboard';
import { downloadBlob } from '@/app/download';
import { placeholderPng } from '@/app/placeholderImage';
import { formatBugReport, formatBugReports, type BugReportScreenshot } from '@/lib/resultRules';
import { cn } from '@/lib/utils';

export interface BugReportItem {
  resultId: ID;
  /** Display ID shown in the title, e.g. "CNT-04". */
  label: string;
  /** 6.2 Mark as bug: a report of the visual change at this step. */
  visualStepIndex?: number;
  /** Whose evidence (D86); default: the lead browser. */
  browser?: Browser;
}

/** Steps edited as one numbered line per step; numbers are added back when copying. */
const stepsToText = (steps: string[]) => steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
const textToSteps = (text: string) =>
  text
    .split('\n')
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

/**
 * D90: one screenshot of the report with its own ⋯ menu on the caption line: Copy image (paste into the ClickUp task;
 * the report text and an image can't share one copy) and Save image (one file, one save dialog).
 */
function ReportScreenshot({ shot, label, onCopy, onSave }: { shot: BugReportScreenshot; label: string; onCopy: () => void; onSave: () => void }) {
  return (
    <li className="w-44">
      <figure>
        <ScreenshotPlaceholder caption={`Step ${shot.stepIndex} screenshot`} />
        <div className="mt-1 flex items-center justify-between gap-1">
          <figcaption className="min-w-0 text-label font-normal text-text-muted">{label}</figcaption>
          <Menu
            label={<Ellipsis aria-hidden="true" />}
            iconOnly
            size="xs"
            variant="ghost"
            accessibleLabel={`Actions for the step ${shot.stepIndex} screenshot`}
            items={[
              { label: 'Copy image', onSelect: onCopy },
              { label: 'Save image', onSelect: onSave },
            ]}
          />
        </div>
      </figure>
    </li>
  );
}

/**
 * 6.4 Bug report (dialog, 720 px), BR-ACTION-03: generated per result, editable, Copy. Several results (bulk) give
 * one report per result: each can be copied on its own, or all together.
 */
export function BugReportDialog({ items, onClose }: { items: BugReportItem[]; onClose: () => void }) {
  const loaded = useAsync(
    () => Promise.all(items.map((i) => buildBugReport(i.resultId, { ...(i.visualStepIndex !== undefined ? { visualStepIndex: i.visualStepIndex } : {}), ...(i.browser ? { browser: i.browser } : {}) }))),
    [items.map((i) => `${i.resultId}:${i.visualStepIndex ?? ''}:${i.browser ?? ''}`).join(',')],
  );
  const [reports, setReports] = useState<(BugReport & { stepsText: string })[] | null>(null);
  const [status, setStatus] = useState<SaveStatus>(null);
  /** Reports (by position) whose earlier screenshots are shown. */
  const [showEarlier, setShowEarlier] = useState<ReadonlySet<number>>(new Set());

  // Fill the editable copy once the reports arrive (not on every render, or edits would be lost).
  const arrived = loaded.status === 'ready' ? loaded.data : null;
  useEffect(() => {
    if (arrived) setReports(arrived.map((r) => ({ ...r, stepsText: stepsToText(r.steps) })));
  }, [arrived]);

  const finalReport = (r: BugReport & { stepsText: string }) => ({ ...r, steps: textToSteps(r.stepsText) });
  const update = (i: number, patch: Partial<BugReport & { stepsText: string }>) => setReports((rs) => rs && rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function copy(text: string, what: string) {
    try {
      await copyText(text);
      setStatus({ tone: 'ok', text: `${what} copied. Paste it into a ClickUp task.` });
    } catch (e) {
      setStatus({ tone: 'error', text: errorText(e) });
    }
  }

  // Prototype: a placeholder image stands in for the stored screenshot (D90).
  const imageOf = (i: number, s: BugReportScreenshot) => placeholderPng(`${items[i]!.label} · step ${s.stepIndex} (prototype placeholder)`);

  async function copyShot(i: number, s: BugReportScreenshot) {
    try {
      await copyImage(imageOf(i, s));
      setStatus({ tone: 'ok', text: `Step ${s.stepIndex} screenshot copied. Paste it into the ClickUp task.` });
    } catch (e) {
      setStatus({ tone: 'error', text: errorText(e) });
    }
  }

  async function saveShot(i: number, s: BugReportScreenshot) {
    const fileName = `${items[i]!.label}-step-${s.stepIndex}.png`;
    try {
      downloadBlob(await imageOf(i, s), fileName);
      setStatus({ tone: 'ok', text: `Saved ${fileName}.` });
    } catch (e) {
      setStatus({ tone: 'error', text: errorText(e) });
    }
  }

  const toggleEarlier = (i: number) =>
    setShowEarlier((set) => {
      const next = new Set(set);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  const single = items.length === 1;
  return (
    <Dialog
      title={single ? `Bug report · ${items[0]!.label}` : `Bug reports · ${items.length} results`}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="primary"
            disabled={!reports}
            onClick={() => reports && void copy(single ? formatBugReport(finalReport(reports[0]!)) : formatBugReports(reports.map(finalReport)), single ? 'Report' : `${reports.length} reports`)}
          >
            {single ? 'Copy report' : `Copy ${items.length} reports`}
          </Button>
        </>
      }
    >
      <p className="text-label font-normal text-text-muted">Editable before copying. Paste into a ClickUp task.{single ? '' : ' One report per result.'}</p>
      {loaded.status === 'loading' && <LoadingState label="Writing the bug report…" />}
      {loaded.status === 'error' && <ErrorState title="Couldn't write the bug report" message={loaded.error.message} onRetry={loaded.retry} />}
      {reports?.map((r, i) => (
        <section key={r.resultId + i} aria-label={`Bug report ${items[i]!.label}`} className="mt-4 rounded-card border border-border p-4">
          {!single && (
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold">{items[i]!.label}</h3>
              <Button size="sm" onClick={() => void copy(formatBugReport(finalReport(r)), `${items[i]!.label} report`)}>
                Copy<span className="sr-only"> {items[i]!.label} report</span>
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Field label="Title">{(p) => <Input {...p} value={r.title} onChange={(e) => update(i, { title: e.target.value })} />}</Field>
            <Field label="Environment" hint="Environment · platform · browser · screen size · run · date">
              {(p) => <Input {...p} value={r.environment} onChange={(e) => update(i, { environment: e.target.value })} />}
            </Field>
            <Field label="Steps to reproduce" hint="One step per line">
              {(p) => <Textarea {...p} rows={Math.max(2, r.steps.length + 1)} value={r.stepsText} onChange={(e) => update(i, { stepsText: e.target.value })} />}
            </Field>
            <Field label="Expected">{(p) => <Textarea {...p} value={r.expected} onChange={(e) => update(i, { expected: e.target.value })} />}</Field>
            <Field label="Actual">{(p) => <Textarea {...p} value={r.actual} onChange={(e) => update(i, { actual: e.target.value })} />}</Field>
            <div>
              <h4 className="text-label text-text-muted">Screenshot</h4>
              {!r.screenshot ? (
                <p className="text-text-muted">None recorded</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-3">
                  <ReportScreenshot
                    shot={r.screenshot}
                    label={
                      items[i]!.visualStepIndex !== undefined
                        ? `Step ${r.screenshot.stepIndex} · changed`
                        : r.screenshot.atProblemStep
                          ? `Step ${r.screenshot.stepIndex} · failed`
                          : `Step ${r.screenshot.stepIndex} · last screenshot before the failure`
                    }
                    onCopy={() => void copyShot(i, r.screenshot!)}
                    onSave={() => void saveShot(i, r.screenshot!)}
                  />
                </ul>
              )}
              {r.earlierScreenshots.length > 0 && (
                <>
                  <button
                    type="button"
                    aria-expanded={showEarlier.has(i)}
                    onClick={() => toggleEarlier(i)}
                    className="mt-2 inline-flex items-center gap-1 rounded-control text-label text-accent hover:underline"
                  >
                    <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform', showEarlier.has(i) && 'rotate-180')} />
                    Earlier steps ({r.earlierScreenshots.length})
                  </button>
                  {showEarlier.has(i) && (
                    <ul aria-label="Earlier steps" className="mt-2 flex flex-wrap gap-3">
                      {r.earlierScreenshots.map((s) => (
                        <ReportScreenshot key={s.screenshotId} shot={s} label={`Step ${s.stepIndex}`} onCopy={() => void copyShot(i, s)} onSave={() => void saveShot(i, s)} />
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      ))}
      <StatusLine status={status} />
    </Dialog>
  );
}
