import { useEffect } from 'react';
import { listModels } from '@/data/api';
import { useAsync } from '@/app/hooks/useAsync';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { canLoadModels, fieldsFor, providerKinds, type ProviderForm, type ProviderKind } from '@/lib/providers';

interface ProviderFieldsProps {
  form: ProviderForm;
  onChange: (form: ProviderForm) => void;
  /** Editing a saved provider: empty secret fields keep the saved secret. */
  secretSaved?: boolean;
  /** The provider kind can't be changed when editing. */
  kindLocked?: boolean;
}

/**
 * AI provider + provider-specific fields + default model (1.1 Welcome, 2.3 Global settings › Edit).
 * No test connection and no connection status (1.1 [DECIDED]).
 */
export function ProviderFields({ form, onChange, secretSaved = false, kindLocked = false }: ProviderFieldsProps) {
  const set = (patch: Partial<ProviderForm>) => onChange({ ...form, ...patch });
  const fields = form.kind ? fieldsFor(form.kind) : null;
  const secretPlaceholder = secretSaved ? 'Saved · leave empty to keep it' : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Field label="AI provider" required>
        {(p) => (
          <Select
            {...p}
            value={form.kind}
            disabled={kindLocked}
            onChange={(e) => set({ kind: e.target.value as ProviderKind, defaultModel: '' })}
          >
            <option value="" disabled>
              Choose a provider
            </option>
            {providerKinds.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {fields?.baseUrl && (
        <Field label="Base URL" required hint="The address of your OpenAI-compatible server, e.g. http://localhost:8000/v1">
          {(p) => <Input {...p} type="url" value={form.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} />}
        </Field>
      )}
      {fields?.apiKey && (
        <Field label="API key" required={!secretSaved}>
          {(p) => (
            <Input {...p} type="password" autoComplete="off" placeholder={secretPlaceholder} value={form.apiKey} onChange={(e) => set({ apiKey: e.target.value })} />
          )}
        </Field>
      )}
      {fields?.aws && (
        <>
          <Field label="Region" required hint="e.g. us-east-1">
            {(p) => <Input {...p} value={form.region} onChange={(e) => set({ region: e.target.value })} />}
          </Field>
          <Field label="Access key ID" required={!secretSaved}>
            {(p) => (
              <Input {...p} type="password" autoComplete="off" placeholder={secretPlaceholder} value={form.accessKeyId} onChange={(e) => set({ accessKeyId: e.target.value })} />
            )}
          </Field>
          <Field label="Secret access key" required={!secretSaved}>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="off"
                placeholder={secretPlaceholder}
                value={form.secretAccessKey}
                onChange={(e) => set({ secretAccessKey: e.target.value })}
              />
            )}
          </Field>
        </>
      )}

      {fields?.modelInput === 'text' && (
        <Field label="Default model" required hint="The Bedrock model ID, e.g. anthropic.claude-sonnet-5-5">
          {(p) => <Input {...p} value={form.defaultModel} onChange={(e) => set({ defaultModel: e.target.value })} />}
        </Field>
      )}
      {fields?.modelInput === 'select' && form.kind && canLoadModels(form, { secretSaved }) && (
        <ModelSelect kind={form.kind} value={form.defaultModel} onChange={(defaultModel) => set({ defaultModel })} />
      )}
      {(!fields || (fields.modelInput === 'select' && !canLoadModels(form, { secretSaved }))) && (
        <Field label="Default model" required>
          {(p) => (
            <Select {...p} disabled value="">
              <option value="">{fields ? 'Enter the API key to load models' : 'Choose a provider first'}</option>
            </Select>
          )}
        </Field>
      )}
    </div>
  );
}

/** Model list loads from the provider once the API key is entered; the first model is chosen until the user picks another. */
function ModelSelect({ kind, value, onChange }: { kind: ProviderKind; value: string; onChange: (model: string) => void }) {
  const models = useAsync(() => listModels(kind), [kind]);
  const list = models.status === 'ready' ? models.data : [];

  useEffect(() => {
    if (list.length > 0 && !list.includes(value)) onChange(list[0]!);
  }, [list, value, onChange]);

  return (
    <Field label="Default model" required error={models.status === 'error' ? "Couldn't load the model list." : undefined}>
      {(p) => (
        <div className="flex gap-2">
          <Select {...p} value={list.includes(value) ? value : ''} disabled={models.status !== 'ready'} onChange={(e) => onChange(e.target.value)}>
            {models.status === 'loading' && <option value="">Loading models…</option>}
            {models.status === 'error' && <option value="">No models</option>}
            {list.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          {models.status === 'error' && (
            <Button size="md" onClick={models.retry}>
              Retry
            </Button>
          )}
        </div>
      )}
    </Field>
  );
}
