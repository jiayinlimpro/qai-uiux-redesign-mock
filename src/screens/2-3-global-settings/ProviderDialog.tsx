import { useState } from 'react';
import { saveProvider } from '@/data/api';
import type { AiProvider } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ProviderFields } from '@/components/ProviderFields';
import { emptyProviderForm, isProviderFormComplete, providerLabel, type ProviderForm } from '@/lib/providers';

/** Global settings › AI providers › Add provider / Edit: provider-specific fields as in 1.1. No test connection. */
export function ProviderDialog({ provider, onClose, onSaved }: { provider?: AiProvider; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ProviderForm>(() =>
    provider ? { ...emptyProviderForm, kind: provider.kind, baseUrl: provider.baseUrl ?? '', region: provider.region ?? '', defaultModel: provider.defaultModel } : emptyProviderForm,
  );
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const secretSaved = provider?.hasSecret ?? false;
  const complete = isProviderFormComplete(form, { secretSaved });

  async function save() {
    if (!complete || !form.kind) return;
    setState({ kind: 'saving' });
    try {
      await saveProvider(
        {
          ...(provider ? { id: provider.id } : {}),
          kind: form.kind,
          label: providerLabel(form.kind),
          defaultModel: form.defaultModel.trim(),
          ...(form.baseUrl.trim() ? { baseUrl: form.baseUrl.trim() } : {}),
          ...(form.region.trim() ? { region: form.region.trim() } : {}),
        },
        { apiKey: form.apiKey, accessKeyId: form.accessKeyId, secretAccessKey: form.secretAccessKey },
      );
      onSaved();
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <Dialog
      title={provider ? `Edit ${provider.label}` : 'Add provider'}
      onClose={onClose}
      onSubmit={() => void save()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!complete || state.kind === 'saving'}>
            {state.kind === 'saving' ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <ProviderFields form={form} onChange={setForm} secretSaved={secretSaved} kindLocked={Boolean(provider)} />
      {state.kind === 'error' && (
        <p role="alert" className="mt-4 text-failed-text">
          Couldn't save: {state.message}
        </p>
      )}
    </Dialog>
  );
}
