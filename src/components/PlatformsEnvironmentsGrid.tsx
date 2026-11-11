import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import type { NewProjectPlatform, NewProjectEnvironment } from '@/lib/projectRules';

export interface GridValue {
  environments: NewProjectEnvironment[];
  platforms: NewProjectPlatform[];
}

interface PlatformsEnvironmentsGridProps {
  value: GridValue;
  onChange: (value: GridValue) => void;
  errors: { environmentNames: Record<string, string>; platformNames: Record<string, string>; environments?: string };
  /** Shown left of the Add buttons. */
  heading?: ReactNode;
  /** Asked before removing; return false to keep it (e.g. an environment with accounts or runs, 2.1). */
  confirmRemoveEnvironment?: (env: NewProjectEnvironment) => Promise<boolean> | boolean;
  confirmRemovePlatform?: (platform: NewProjectPlatform) => Promise<boolean> | boolean;
}

const newKey = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Platforms × environments grid (1.3 New project, 2.4 Environments): first column platform name; one column per environment with an
 * editable name and a remove button; URL cells may be empty. A project keeps at least one environment.
 */
export function PlatformsEnvironmentsGrid({ value, onChange, errors, heading, confirmRemoveEnvironment, confirmRemovePlatform }: PlatformsEnvironmentsGridProps) {
  const { environments, platforms } = value;
  const setEnvironments = (next: NewProjectEnvironment[]) => onChange({ environments: next, platforms });
  const setPlatforms = (next: NewProjectPlatform[]) => onChange({ environments, platforms: next });
  const setPlatform = (id: string, patch: Partial<NewProjectPlatform>) => setPlatforms(platforms.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  async function removeEnvironment(env: NewProjectEnvironment) {
    if (confirmRemoveEnvironment && !(await confirmRemoveEnvironment(env))) return;
    onChange({ environments: environments.filter((e) => e.id !== env.id), platforms });
  }
  async function removePlatform(platform: NewProjectPlatform) {
    if (confirmRemovePlatform && !(await confirmRemovePlatform(platform))) return;
    onChange({ environments, platforms: platforms.filter((a) => a.id !== platform.id) });
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>{heading}</div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setEnvironments([...environments, { id: newKey('env'), name: '' }])}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add environment
          </Button>
          <Button size="sm" onClick={() => setPlatforms([...platforms, { id: newKey('platform'), name: '', urls: {} }])}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add platform
          </Button>
        </div>
      </div>
      <div className="relative overflow-x-auto rounded-card border border-border">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="min-w-[140px] px-3 py-2 align-top text-label text-text-muted">
                Platform name
              </th>
              {environments.map((env, i) => (
                <th key={env.id} scope="col" className="min-w-[150px] px-2 py-2 align-top font-normal">
                  <div className="flex items-start gap-1">
                    <Field label={`Environment ${i + 1} name`} hideLabel error={errors.environmentNames[env.id]} className="flex-1">
                      {(p) => (
                        <Input {...p} className="font-semibold" value={env.name} onChange={(e) => setEnvironments(environments.map((x) => (x.id === env.id ? { ...x, name: e.target.value } : x)))} />
                      )}
                    </Field>
                    <Button
                      variant="ghost"
                      iconOnly
                      aria-label={`Remove environment ${env.name.trim() || i + 1}`}
                      disabled={environments.length === 1}
                      title={environments.length === 1 ? 'A project needs at least one environment' : undefined}
                      onClick={() => void removeEnvironment(env)}
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </th>
              ))}
              <th scope="col" className="w-10 px-2 py-2">
                <span className="sr-only">Remove platform</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {platforms.length === 0 && (
              <tr>
                <td colSpan={environments.length + 2} className="px-3 py-3 text-text-muted">
                  No platforms yet. Add the platforms of this project, e.g. Customer website, Admin portal.
                </td>
              </tr>
            )}
            {platforms.map((platform, row) => (
              <tr key={platform.id} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2 align-top">
                  <Field label={`Platform ${row + 1} name`} hideLabel error={errors.platformNames[platform.id]}>
                    {(p) => <Input {...p} placeholder="e.g. Customer website" value={platform.name} onChange={(e) => setPlatform(platform.id, { name: e.target.value })} />}
                  </Field>
                </td>
                {environments.map((env, i) => (
                  <td key={env.id} className="px-2 py-2 align-top">
                    <Field label={`${platform.name.trim() || `Platform ${row + 1}`} URL for ${env.name.trim() || `environment ${i + 1}`}`} hideLabel>
                      {(p) => (
                        <Input
                          {...p}
                          type="url"
                          placeholder="https://…"
                          value={platform.urls[env.id] ?? ''}
                          onChange={(e) => setPlatform(platform.id, { urls: { ...platform.urls, [env.id]: e.target.value } })}
                        />
                      )}
                    </Field>
                  </td>
                ))}
                <td className="px-2 py-2 align-top">
                  <Button variant="ghost" iconOnly aria-label={`Remove platform ${platform.name.trim() || row + 1}`} onClick={() => void removePlatform(platform)}>
                    <X aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {errors.environments && (
        <p role="alert" className="mt-2 text-label text-failed-text">
          {errors.environments}
        </p>
      )}
    </div>
  );
}
