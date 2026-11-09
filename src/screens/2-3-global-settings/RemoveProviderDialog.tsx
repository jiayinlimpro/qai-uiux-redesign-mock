import { useState } from 'react';
import { listModels, listProjects, removeProvider, type ModelSwitch } from '@/data/api';
import type { AiProvider } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { LoadingState } from '@/components/StateViews';
import { useAsync } from '@/app/hooks/useAsync';
import { projectsToSwitch } from '@/lib/providers';

/** Models a provider offers; AWS Bedrock offers its typed model ID only. */
const modelsOf = async (p: AiProvider) => ({ provider: p, models: p.kind === 'aws_bedrock' ? [] : await listModels(p.kind) });

/**
 * Remove provider (2.3), with confirmation. Shows which projects will switch to another provider's default model
 * before removing (BR-PROVIDER-03). The last provider never gets here (BR-PROVIDER-02).
 */
export function RemoveProviderDialog({
  provider,
  providers,
  onClose,
  onRemoved,
}: {
  provider: AiProvider;
  providers: AiProvider[];
  onClose: () => void;
  onRemoved: (switched: ModelSwitch[]) => void;
}) {
  const remaining = providers.filter((p) => p.id !== provider.id);
  const preview = useAsync(async () => {
    const [projects, removed, rest] = await Promise.all([listProjects(), modelsOf(provider), Promise.all(remaining.map(modelsOf))]);
    return projectsToSwitch(projects, removed, rest);
  }, [provider.id]);
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  async function remove() {
    setState({ kind: 'saving' });
    try {
      onRemoved((await removeProvider(provider.id)).switched);
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <Dialog
      title={`Remove ${provider.label}?`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={preview.status !== 'ready' || state.kind === 'saving'} onClick={() => void remove()}>
            {state.kind === 'saving' ? 'Removing…' : 'Remove provider'}
          </Button>
        </>
      }
    >
      <p>Its saved key is deleted from this computer.</p>
      {preview.status === 'loading' && <LoadingState label="Checking which projects use it…" />}
      {preview.status === 'error' && (
        <p role="alert" className="mt-3 text-failed-text">
          Couldn't check which projects use it: {preview.error.message}
        </p>
      )}
      {preview.status === 'ready' && preview.data.length > 0 && (
        <div className="mt-3 rounded-control border border-cc-border bg-cc-fill px-3 py-2 text-cc-text">
          <p>
            These projects use a model from {provider.label}. Their default model will change to {remaining[0]?.label}’s default,{' '}
            <span className="font-semibold">{preview.data[0]!.newModel}</span>:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {preview.data.map((x) => (
              <li key={x.project.id}>
                {x.project.name} (currently {x.project.defaultModel})
              </li>
            ))}
          </ul>
        </div>
      )}
      {preview.status === 'ready' && preview.data.length === 0 && <p className="mt-2 text-text-muted">No project uses a model from {provider.label}.</p>}
      {state.kind === 'error' && (
        <p role="alert" className="mt-3 text-failed-text">
          Couldn't remove: {state.message}
        </p>
      )}
    </Dialog>
  );
}
