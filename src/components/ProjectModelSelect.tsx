import { useEffect } from 'react';
import { listModels } from '@/data/api';
import type { AiProvider } from '@/data/types';
import { Field, Select } from '@/components/ui/field';
import { useAsync } from '@/app/hooks/useAsync';
import { useGlobalSettings } from '@/app/settings';

/** Models from every configured provider, each provider's default model first. AWS Bedrock offers its typed model ID. */
export async function modelOptions(providers: AiProvider[]): Promise<{ provider: AiProvider; models: string[] }[]> {
  return Promise.all(
    providers.map(async (provider) => {
      const listed = provider.kind === 'aws_bedrock' ? [] : await listModels(provider.kind);
      return { provider, models: [provider.defaultModel, ...listed.filter((m) => m !== provider.defaultModel)] };
    }),
  );
}

interface ProjectModelSelectProps {
  label: string;
  hint?: string;
  /** Empty: the first provider's default model is chosen (New project). */
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

/**
 * Default AI model of a project (1.3, 2.2), from the AI providers in Global settings.
 * A model no provider offers any more (e.g. after removing a provider) stays visible, marked as such.
 */
export function ProjectModelSelect({ label, hint, value, onChange, disabled }: ProjectModelSelectProps) {
  const { settings } = useGlobalSettings();
  const groups = useAsync(() => modelOptions(settings.providers), [settings.providers]);
  const offered = groups.status === 'ready' ? groups.data.flatMap((g) => g.models) : [];
  const first = groups.status === 'ready' ? groups.data[0]?.models[0] : undefined;

  useEffect(() => {
    if (!value && first) onChange(first);
  }, [value, first, onChange]);

  return (
    <Field label={label} required hint={hint} error={groups.status === 'error' ? "Couldn't load the model list." : undefined}>
      {(p) => (
        <Select {...p} value={value} disabled={disabled || groups.status !== 'ready'} onChange={(e) => onChange(e.target.value)}>
          {groups.status === 'loading' && <option value={value}>Loading models…</option>}
          {groups.status === 'ready' && value && !offered.includes(value) && <option value={value}>{value} (not offered by your AI providers)</option>}
          {groups.status === 'ready' &&
            groups.data.map((g) => (
              <optgroup key={g.provider.id} label={g.provider.label}>
                {g.models.map((m) => (
                  <option key={`${g.provider.id}-${m}`} value={m}>
                    {m}
                  </option>
                ))}
              </optgroup>
            ))}
        </Select>
      )}
    </Field>
  );
}
