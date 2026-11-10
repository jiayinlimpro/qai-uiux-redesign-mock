import { useState } from 'react';
import { markKnownIssue, overrideResult } from '@/data/api';
import type { ID, Result, ResultStep, Run, TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, RadioGroup, Textarea } from '@/components/ui/field';
import { ReasonChip, StatusChip } from '@/components/StatusViews';
import { ScreenshotPlaceholder } from '@/components/Screenshot';
import { errorText } from '@/components/StatusLine';
import { browserLabels } from '@/lib/labels';
import { plural } from '@/lib/format';
import { validateOverride } from '@/lib/resultRules';
import { cn } from '@/lib/utils';

/** 6.3 Override (dialog, 720 px), BR-ACTION-01: single result; reason and proof required; the AI verdict is kept for audit. */
export function OverrideDialog({ result, label, onClose, onSaved }: { result: Result; label: string; onClose: () => void; onSaved: (r: Result) => void }) {
  const [status, setStatus] = useState<'passed' | 'failed'>(result.aiVerdict.status === 'passed' ? 'failed' : 'passed');
  const [reason, setReason] = useState('');
  const [proofName, setProofName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const errors = validateOverride({ reason, proofName });
  const ready = !errors.reason && !errors.proof;

  async function save() {
    if (!ready) return;
    setSaving(true);
    try {
      onSaved(await overrideResult(result.id, { status, reason, proofName }));
    } catch (e) {
      setError(errorText(e));
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={`Override result · ${label}`}
      onClose={onClose}
      onSubmit={() => void save()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!ready || saving}>
            Save override
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-label text-text-muted">AI verdict (kept for audit)</h3>
          <p className="mt-1 flex flex-wrap gap-1.5">
            <StatusChip status={result.aiVerdict.status} />
            {result.aiVerdict.reason && <ReasonChip reason={result.aiVerdict.reason} />}
          </p>
        </div>
        <RadioGroup
          legend="New status"
          name="override-status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'passed', label: 'Passed' },
            { value: 'failed', label: 'Failed' },
          ]}
        />
        <Field label="Reason" required>
          {(p) => <Textarea {...p} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. PM confirmed the WhatsApp link is intended." />}
        </Field>
        <Field label="Proof" required hint={proofName ? `Attached: ${proofName}` : 'A screenshot, video or file that shows why.'}>
          {(p) => (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) setProofName(f.name);
              }}
              className={cn('flex flex-wrap items-center justify-center gap-2 rounded-control border border-dashed p-4 text-text-muted', dragging ? 'border-accent bg-accent-soft' : 'border-border')}
            >
              Drop a screenshot, video or file here, or
              <label className="cursor-pointer rounded-control border border-border bg-surface px-3 py-1 font-semibold text-text hover:bg-bg">
                Choose file
                <input
                  {...p}
                  type="file"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setProofName(f.name);
                  }}
                />
              </label>
            </div>
          )}
        </Field>
        <p className="text-label font-normal text-text-muted">The result shows who overrode it, with your reason and proof. The pass rate uses the new status.</p>
        {error && (
          <p role="alert" className="text-failed-text">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

/** Known issue (bulk bar; BR-ACTION-02): single or bulk, optional note and ticket reference. Results keep their status (BR-STATUS-06). */
export function KnownIssueDialog({ testIds, labels, onClose, onDone }: { testIds: ID[]; labels: string[]; onClose: () => void; onDone: (tests: TestCase[]) => void }) {
  const [note, setNote] = useState('');
  const [ticketRef, setTicketRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function mark() {
    try {
      onDone(await markKnownIssue(testIds, { note, ticketRef }));
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <Dialog
      title={testIds.length === 1 ? `Mark ${labels[0]} as a known issue` : `Mark ${plural(testIds.length, 'test')} as a known issue`}
      size="sm"
      onClose={onClose}
      onSubmit={() => void mark()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Mark known issue
          </Button>
        </>
      }
    >
      <p className="text-text-muted">
        The test{testIds.length === 1 ? '' : 's'} still run and their results are recorded; they are labelled “Known issue”.
        {testIds.length > 1 && ` (${labels.join(', ')})`}
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <Field label="Note (optional)">{(p) => <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        <Field label="Ticket reference (optional)" hint="e.g. a ClickUp task ID">
          {(p) => <Input {...p} value={ticketRef} onChange={(e) => setTicketRef(e.target.value)} />}
        </Field>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-failed-text">
          {error}
        </p>
      )}
    </Dialog>
  );
}

/** Screenshot viewer (6.1: screenshot click → viewer). Prototype: a large placeholder. */
export function ScreenshotViewer({ step, label, run, result, onClose }: { step: ResultStep; label: string; run: Run; result: Result; onClose: () => void }) {
  const browser = browserLabels[result.perBrowser[0]?.browser ?? 'chrome'];
  return (
    <Dialog title={`Screenshot · step ${step.index}`} size="lg" onClose={onClose}>
      <p className="mb-2 text-label font-normal text-text-muted">
        {label} · Run #{run.number} · {browser} {run.viewport.width}×{run.viewport.height} · {step.index}. {step.text}
      </p>
      <ScreenshotPlaceholder caption={`Screenshot of step ${step.index}${step.url ? ` · ${step.url}` : ''}`} />
    </Dialog>
  );
}
