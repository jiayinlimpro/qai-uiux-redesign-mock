import { useState } from 'react';
import type { ExistingProjectChoice } from '@/data/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

/**
 * BR-PROJECT-02: importing a project that is already on this computer.
 * Replace it (local runs and changes are lost) · Import as a copy ("<name> (copy)") · Cancel.
 */
export function ImportExistingDialog({
  projectName,
  copyAs,
  onChoose,
  onClose,
}: {
  projectName: string;
  copyAs: string;
  onChoose: (choice: ExistingProjectChoice) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<ExistingProjectChoice | null>(null);
  const choose = async (choice: ExistingProjectChoice) => {
    setBusy(choice);
    await onChoose(choice);
  };

  return (
    <Dialog
      title="This project already exists on this computer"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={busy !== null} onClick={() => void choose('copy')}>
            {busy === 'copy' ? 'Importing…' : 'Import as a copy'}
          </Button>
          <Button variant="danger" disabled={busy !== null} onClick={() => void choose('replace')}>
            {busy === 'replace' ? 'Replacing…' : 'Replace it'}
          </Button>
        </>
      }
    >
      <p>
        <span className="font-semibold">{projectName}</span> is already here. Choose what to do with the imported file.
      </p>
      <dl className="mt-4 space-y-3">
        <div>
          <dt className="font-semibold">Replace it</dt>
          <dd className="mt-1 rounded-control border border-cc-border bg-cc-fill px-3 py-2 text-cc-text">
            The project on this computer is overwritten by the file. Runs and changes made here since the export are lost.
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Import as a copy</dt>
          <dd className="mt-1 text-text-muted">
            Both are kept. The imported one is added as <span className="font-semibold text-text">{copyAs}</span>.
          </dd>
        </div>
      </dl>
    </Dialog>
  );
}
