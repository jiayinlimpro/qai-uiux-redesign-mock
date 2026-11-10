import { useEffect, useState } from 'react';
import { buildBugReport, type BugReport } from '@/data/api';
import type { ID } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { StatusLine, errorText, type SaveStatus } from '@/components/StatusLine';
import { ScreenshotPlaceholder } from '@/components/Screenshot';
import { useAsync } from '@/app/hooks/useAsync';
import { copyText } from '@/app/clipboard';
import { downloadBlob } from '@/app/download';
import { formatBugReport, formatBugReports } from '@/lib/resultRules';
import { plural } from '@/lib/format';

export interface BugReportItem {
  resultId: ID;
  /** Display ID shown in the title, e.g. "CNT-04". */
  label: string;
  /** 6.2 Mark as bug: a report of the visual change at this step. */
  visualStepIndex?: number;
}

/** Steps edited as one numbered line per step; numbers are added back when copying. */
const stepsToText = (steps: string[]) => steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
const textToSteps = (text: string) =>
  text
    .split('\n')
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

/** Prototype: screenshots are placeholders, saved as small SVG images with their caption. */
function placeholderSvg(caption: string): Blob {
  const esc = caption.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return new Blob(
    [`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="100%" height="100%" fill="#F6F7F9"/><text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#5B6370">${esc}</text></svg>`],
    { type: 'image/svg+xml' },
  );
}

/**
 * 6.4 Bug report (dialog, 720 px), BR-ACTION-03: generated per result, editable, Copy. Several results (bulk) give
 * one report per result: each can be copied on its own, or all together.
 */
export function BugReportDialog({ items, onClose }: { items: BugReportItem[]; onClose: () => void }) {
  const loaded = useAsync(() => Promise.all(items.map((i) => buildBugReport(i.resultId, i.visualStepIndex !== undefined ? { visualStepIndex: i.visualStepIndex } : {}))), [items.map((i) => `${i.resultId}:${i.visualStepIndex ?? ''}`).join(',')]);
  const [reports, setReports] = useState<(BugReport & { stepsText: string })[] | null>(null);
  const [status, setStatus] = useState<SaveStatus>(null);

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

  function saveScreenshots() {
    if (!reports) return;
    let n = 0;
    reports.forEach((r, i) =>
      r.screenshots.forEach((s) => {
        n++;
        downloadBlob(placeholderSvg(`${items[i]!.label} · step ${s.stepIndex} (prototype placeholder)`), `${items[i]!.label}-step-${s.stepIndex}.svg`);
      }),
    );
    setStatus({ tone: 'ok', text: n ? `Saved ${plural(n, 'screenshot')}.` : 'There are no screenshots to save.' });
  }

  const single = items.length === 1;
  return (
    <Dialog
      title={single ? `Bug report · ${items[0]!.label}` : `Bug reports · ${items.length} results`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={saveScreenshots} disabled={!reports}>
            Save screenshots
          </Button>
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
            <Field label="Environment" hint="Environment · app · browser · screen size · run · date">
              {(p) => <Input {...p} value={r.environment} onChange={(e) => update(i, { environment: e.target.value })} />}
            </Field>
            <Field label="Steps to reproduce" hint="One step per line">
              {(p) => <Textarea {...p} rows={Math.max(2, r.steps.length + 1)} value={r.stepsText} onChange={(e) => update(i, { stepsText: e.target.value })} />}
            </Field>
            <Field label="Expected">{(p) => <Textarea {...p} value={r.expected} onChange={(e) => update(i, { expected: e.target.value })} />}</Field>
            <Field label="Actual">{(p) => <Textarea {...p} value={r.actual} onChange={(e) => update(i, { actual: e.target.value })} />}</Field>
            <div>
              <h4 className="text-label text-text-muted">Screenshots</h4>
              {r.screenshots.length === 0 ? (
                <p className="text-text-muted">None</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {r.screenshots.map((s) => (
                    <li key={s.screenshotId}>
                      <ScreenshotPlaceholder caption={`Step ${s.stepIndex}`} className="h-16 w-28" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ))}
      <StatusLine status={status} />
    </Dialog>
  );
}
