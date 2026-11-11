import { useState } from 'react';
import { exportProject } from '@/data/api';
import type { Project } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/field';
import { errorText } from '@/components/StatusLine';
import { downloadBlob, safeFileName } from '@/app/download';

/**
 * Export project (1.2 Projects, 2.2 Project settings), D37: "Include account passwords" (default on) with a warning,
 * because the file holds them in readable form. Encryption is an open question (10).
 */
export function ExportProjectDialog({ project, onClose, onDone }: { project: Project; onClose: () => void; onDone: (message: string) => void }) {
  const [includePasswords, setIncludePasswords] = useState(true);
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  async function run() {
    setState({ kind: 'saving' });
    try {
      downloadBlob(await exportProject(project.id, { includePasswords }), `${safeFileName(project.name)}.qai-project.json`);
      onDone(includePasswords ? `Exported ${project.name} with account passwords.` : `Exported ${project.name} without account passwords.`);
    } catch (e) {
      setState({ kind: 'error', message: errorText(e) });
    }
  }

  return (
    <Dialog
      title={`Export ${project.name}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={state.kind === 'saving'} onClick={() => void run()}>
            {state.kind === 'saving' ? 'Exporting…' : 'Export'}
          </Button>
        </>
      }
    >
      <p>One file with the project’s suites, tests, scripts, knowledge, accounts, runs and AI explore chats, to hand over to a colleague.</p>
      <div className="mt-4">
        <Checkbox label="Include account passwords" checked={includePasswords} onChange={(e) => setIncludePasswords(e.target.checked)} aria-describedby="export-pw-note" />
        <p id="export-pw-note" className="ml-6 mt-1 text-label font-normal text-text-muted">
          {includePasswords ? 'The recipient can run tests that log in straight away.' : 'Accounts are exported without passwords; the recipient adds them in Environments.'}
        </p>
      </div>
      {includePasswords && (
        <p role="note" className="mt-3 rounded-control border border-cc-border bg-cc-fill px-3 py-2 text-cc-text">
          The file will contain passwords in readable form. Share it only with trusted colleagues.
        </p>
      )}
      {state.kind === 'error' && (
        <p role="alert" className="mt-3 text-failed-text">
          Couldn't export: {state.message}
        </p>
      )}
    </Dialog>
  );
}
