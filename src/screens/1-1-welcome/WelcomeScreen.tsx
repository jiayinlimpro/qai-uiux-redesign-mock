import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { saveGlobalSettings, saveProvider } from '@/data/api';
import { Button } from '@/components/ui/button';
import { ProviderFields } from '@/components/ProviderFields';
import { CostSavingFields } from '@/components/CostSavingFields';
import { useGlobalSettings } from '@/app/settings';
import { to } from '@/app/routes';
import { emptyProviderForm, isCostSavingComplete, isProviderFormComplete, providerLabel, type CostSavingForm, type ProviderForm } from '@/lib/providers';

/**
 * 1.1 Welcome setup (screens/01-global.md): first launch only, no shell, centered card max 560 px.
 * Continue is disabled until required fields are filled. No test connection.
 */
export function WelcomeScreen() {
  const { settings, reload } = useGlobalSettings();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderForm>(emptyProviderForm);
  const [cost, setCost] = useState<CostSavingForm>({ ...settings.costSaving, typeSafeKey: '' });
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  const complete = isProviderFormComplete(provider) && isCostSavingComplete(cost);

  async function onContinue() {
    if (!complete || !provider.kind) return;
    setState({ kind: 'saving' });
    try {
      await saveProvider(
        {
          kind: provider.kind,
          label: providerLabel(provider.kind),
          defaultModel: provider.defaultModel.trim(),
          ...(provider.baseUrl.trim() ? { baseUrl: provider.baseUrl.trim() } : {}),
          ...(provider.region.trim() ? { region: provider.region.trim() } : {}),
        },
        { apiKey: provider.apiKey, accessKeyId: provider.accessKeyId, secretAccessKey: provider.secretAccessKey },
      );
      const { typeSafeKey, ...costSaving } = cost;
      await saveGlobalSettings({ ...settings, costSaving: { ...costSaving, hasKey: settings.costSaving.hasKey } }, { typeSafeKey });
      await reload();
      navigate(to.projects(), { replace: true });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <main id="main" className="flex min-h-full items-center justify-center bg-bg p-6">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void onContinue();
        }}
        className="w-full max-w-[560px] rounded-card border border-border bg-surface p-7"
      >
        <h1 className="text-h1">Welcome to QAI</h1>
        <p className="mt-1 text-text-muted">Connect an AI provider so QAI can run and create tests. You can change this later in Global settings.</p>

        <div className="mt-6">
          <ProviderFields form={provider} onChange={setProvider} />
        </div>

        <details className="group mt-5 rounded-control border border-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-90" />
            Optional: save AI cost with Browser Use + Jev
          </summary>
          <div className="border-t border-border px-4 py-4">
            <CostSavingFields form={cost} onChange={setCost} checkboxLabel="Use Browser Use + Jev" />
          </div>
        </details>

        {state.kind === 'error' && (
          <p role="alert" className="mt-4 text-failed-text">
            Couldn't save: {state.message}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          {!complete && <p className="text-label font-normal text-text-muted">Fill in the required fields to continue.</p>}
          <Button type="submit" variant="primary" disabled={!complete || state.kind === 'saving'}>
            {state.kind === 'saving' ? 'Saving…' : 'Continue to projects'}
          </Button>
        </div>
      </form>
    </main>
  );
}
