import { useState } from 'react';
import { loadSampleData } from '@/data/api';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';

/**
 * Prototype only: Global settings › Advanced, visible while Developer mode is on.
 * Replaces all projects with the sample data; AI providers and settings are kept. Developers remove it with the mock.
 */
export function SampleDataAction() {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'done' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  async function load() {
    setState({ kind: 'saving' });
    try {
      await loadSampleData();
      setConfirming(false);
      setState({ kind: 'done' });
    } catch (e) {
      setConfirming(false);
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="mt-4 rounded-control border border-dashed border-border p-4">
      <div className="flex items-center gap-2">
        <Chip tone="cc">Prototype only</Chip>
        <Button size="sm" onClick={() => setConfirming(true)}>
          Load sample data
        </Button>
      </div>
      <p className="mt-2 text-label font-normal text-text-muted">
        Replaces all projects on this computer with the sample projects (qcfixer.com, Client HRMS). AI providers and settings are kept.
      </p>
      <p role="status" aria-live="polite" className={state.kind === 'error' ? 'mt-1 text-label text-failed-text' : 'mt-1 text-label font-normal text-passed-text'}>
        {state.kind === 'done' ? 'Sample data loaded.' : state.kind === 'error' ? `Couldn't load sample data: ${state.message}` : ''}
      </p>
      {confirming && (
        <Dialog
          title="Load sample data?"
          size="sm"
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button onClick={() => setConfirming(false)}>Cancel</Button>
              <Button variant="danger" disabled={state.kind === 'saving'} onClick={() => void load()}>
                {state.kind === 'saving' ? 'Loading…' : 'Replace with sample data'}
              </Button>
            </>
          }
        >
          <p>All projects on this computer are replaced by the sample projects. This can’t be undone.</p>
        </Dialog>
      )}
    </div>
  );
}
