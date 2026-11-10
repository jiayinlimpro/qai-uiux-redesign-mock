import { useState } from 'react';
import { markKnownIssue } from '@/data/api';
import type { TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { errorText } from '@/components/StatusLine';
import { useSuites } from './suitesContext';

/** More › Mark known issue (glossary: failing for a known, reported reason; still runs and is recorded). Optional note + ticket. */
export function KnownIssueDialog({ test, onClose }: { test: TestCase; onClose: () => void }) {
  const s = useSuites();
  const [note, setNote] = useState('');
  const [ticketRef, setTicketRef] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function mark() {
    try {
      // The data layer stores who marked it and when (BR-ACTION-02, CLAUDE.md rule 10).
      await markKnownIssue([test.id], { note, ticketRef });
      s.reload();
      s.showToast({ text: `${test.testId} marked as a known issue` });
      onClose();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <Dialog
      title={`Mark ${test.testId} as a known issue`}
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
      <p className="text-text-muted">The test still runs and its results are recorded; they are labelled “Known issue”.</p>
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
