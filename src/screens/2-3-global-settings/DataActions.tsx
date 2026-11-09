import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backUpEverything, factoryReset, resetSettings, restoreFromBackup } from '@/data/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useGlobalSettings } from '@/app/settings';
import { downloadBlob } from '@/app/download';
import { to } from '@/app/routes';

type Confirm = { kind: 'restore'; file: File } | { kind: 'reset' } | { kind: 'factory' };

const backupName = () => `qai-backup-${new Date().toISOString().slice(0, 10)}.json`;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Global settings › Data on this computer. Destructive actions confirm and recommend a backup first (2.3). */
export function DataActions() {
  const { reload } = useGlobalSettings();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function backUp() {
    try {
      downloadBlob(await backUpEverything(), backupName());
      setStatus({ tone: 'ok', text: 'Backup saved.' });
    } catch (e) {
      setStatus({ tone: 'error', text: `Couldn't back up: ${message(e)}` });
    }
  }

  async function run(c: Confirm) {
    setBusy(true);
    try {
      if (c.kind === 'restore') await restoreFromBackup(c.file);
      if (c.kind === 'reset') await resetSettings();
      if (c.kind === 'factory') await factoryReset();
      setConfirm(null);
      const settings = await reload(); // no AI provider left → the first-launch gate shows Welcome
      if (settings.providers.length > 0) {
        if (c.kind === 'restore') navigate(to.projects());
        setStatus({ tone: 'ok', text: c.kind === 'restore' ? 'Restored from backup.' : 'Done.' });
      }
    } catch (e) {
      setStatus({ tone: 'error', text: message(e) });
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  const texts: Record<Confirm['kind'], { title: string; body: string; action: string }> = {
    restore: {
      title: 'Restore from backup?',
      body: 'Everything on this computer (all projects and settings) is replaced by the backup. This can’t be undone.',
      action: 'Restore',
    },
    reset: {
      title: 'Reset settings?',
      body: 'Global settings go back to their defaults and your AI providers are removed, so QAI asks you to connect one again. Projects are kept. This can’t be undone.',
      action: 'Reset settings',
    },
    factory: {
      title: 'Factory reset?',
      body: 'All projects, runs, results, AI explore chats and settings are deleted from this computer, as if QAI was just installed. This can’t be undone.',
      action: 'Factory reset',
    },
  };

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setConfirm({ kind: 'restore', file });
          e.target.value = '';
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void backUp()}>Back up everything</Button>
        <Button onClick={() => fileInput.current?.click()}>Restore from backup</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="danger" onClick={() => setConfirm({ kind: 'reset' })}>
          Reset settings
        </Button>
        <Button variant="danger" onClick={() => setConfirm({ kind: 'factory' })}>
          Factory reset
        </Button>
      </div>
      <p className="mt-3 text-label font-normal text-text-muted">
        Restore and resets can’t be undone; QAI recommends a backup first. To hand over a single project, use Export in Projects or Project settings.
      </p>
      <div role="status" aria-live="polite" className="mt-2 empty:hidden">
        {status && <p className={status.tone === 'error' ? 'text-failed-text' : 'text-passed-text'}>{status.text}</p>}
      </div>

      {confirm && (
        <Dialog
          title={texts[confirm.kind].title}
          size="sm"
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="danger" disabled={busy} onClick={() => void run(confirm)}>
                {busy ? 'Working…' : texts[confirm.kind].action}
              </Button>
            </>
          }
        >
          <p>{texts[confirm.kind].body}</p>
          {confirm.kind === 'restore' && <p className="mt-2 text-text-muted">Backup file: {confirm.file.name}</p>}
          <div className="mt-4 rounded-control border border-cc-border bg-cc-fill px-3 py-2 text-cc-text">
            <p>We recommend backing up first.</p>
            <Button size="sm" className="mt-2" onClick={() => void backUp()}>
              Back up first
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
