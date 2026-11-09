import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { createProject, DuplicateProjectNameError, listModels, listProjects } from '@/data/api';
import type { AiProvider } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { useAsync } from '@/app/hooks/useAsync';
import { useGlobalSettings } from '@/app/settings';
import { to } from '@/app/routes';
import { hasErrors, isEmptyAppRow, isProjectNameTaken, validateNewProject, type NewProjectApp, type NewProjectEnvironment } from '@/lib/projectRules';

const newKey = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const DEFAULT_ENVIRONMENTS = ['Dev', 'UAT', 'Prod'];

/** 1.3 New project (screens/01-global.md): dialog over Projects. Create → 1.4 Overview. */
export function NewProjectDialog() {
  const navigate = useNavigate();
  const { settings } = useGlobalSettings();
  const [name, setName] = useState('');
  const [environments, setEnvironments] = useState<NewProjectEnvironment[]>(() => DEFAULT_ENVIRONMENTS.map((n) => ({ id: newKey('env'), name: n })));
  const [apps, setApps] = useState<NewProjectApp[]>(() => [{ id: newKey('app'), name: '', urls: {} }]);
  const [model, setModel] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const models = useAsync(() => modelOptions(settings.providers), [settings.providers]);
  const chosenModel = model || (models.status === 'ready' ? (models.data[0]?.models[0] ?? '') : '');

  const projects = useAsync(listProjects, []);
  const [takenOnSave, setTakenOnSave] = useState<string[]>([]);
  const existingNames = [...(projects.status === 'ready' ? projects.data.map((p) => p.name) : []), ...takenOnSave];
  const errors = validateNewProject({ name, environments, apps }, existingNames);
  // Other errors show after Create; a duplicate name shows inline as you type (BR-PROJECT-01).
  const duplicate = name.trim() !== '' && isProjectNameTaken(name, existingNames);
  const shown = submitted ? errors : { environmentNames: {}, appNames: {}, ...(duplicate ? { name: errors.name } : {}) };
  const close = () => navigate(to.projects());

  async function create() {
    setSubmitted(true);
    if (hasErrors(errors) || !chosenModel) return;
    setSaving(true);
    setSaveError(null);
    try {
      const project = await createProject({
        name,
        defaultModel: chosenModel,
        environments: environments.map((e) => ({ id: e.id, name: e.name.trim() })),
        apps: apps
          .filter((a) => !isEmptyAppRow(a))
          .map((a) => ({
            id: a.id,
            name: a.name.trim(),
            urls: Object.fromEntries(environments.map((e) => [e.id, a.urls[e.id]?.trim() || null])),
          })),
      });
      navigate(to.overview(project.id));
    } catch (e) {
      setSaving(false);
      if (e instanceof DuplicateProjectNameError) setTakenOnSave((list) => [...list, name]); // shown inline on the name
      else setSaveError(e instanceof Error ? e.message : String(e));
    }
  }

  const renameEnv = (id: string, value: string) => setEnvironments((list) => list.map((e) => (e.id === id ? { ...e, name: value } : e)));
  const removeEnv = (id: string) => setEnvironments((list) => list.filter((e) => e.id !== id));
  const addEnv = () => setEnvironments((list) => [...list, { id: newKey('env'), name: '' }]);
  const setApp = (id: string, patch: Partial<NewProjectApp>) => setApps((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  return (
    <Dialog
      title="New project"
      onClose={close}
      onSubmit={() => void create()}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create project'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Project name" required error={shown.name}>
          {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>

        <section aria-labelledby="apps-envs-heading">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 id="apps-envs-heading" className="text-label text-text-muted">
              Apps and environments (optional, can add later)
            </h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={addEnv}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add environment
              </Button>
              <Button size="sm" onClick={() => setApps((list) => [...list, { id: newKey('app'), name: '', urls: {} }])}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add app
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="min-w-[140px] px-3 py-2 align-top text-label text-text-muted">
                    App name
                  </th>
                  {environments.map((env, i) => (
                    <th key={env.id} scope="col" className="min-w-[150px] px-2 py-2 align-top font-normal">
                      <div className="flex items-start gap-1">
                        <Field label={`Environment ${i + 1} name`} hideLabel error={shown.environmentNames[env.id]} className="flex-1">
                          {(p) => <Input {...p} className="font-semibold" value={env.name} onChange={(e) => renameEnv(env.id, e.target.value)} />}
                        </Field>
                        <Button
                          variant="ghost"
                          iconOnly
                          aria-label={`Remove environment ${env.name.trim() || i + 1}`}
                          disabled={environments.length === 1}
                          title={environments.length === 1 ? 'A project needs at least one environment' : undefined}
                          onClick={() => removeEnv(env.id)}
                        >
                          <X aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </div>
                    </th>
                  ))}
                  <th scope="col" className="w-10 px-2 py-2">
                    <span className="sr-only">Remove app</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app, row) => (
                  <tr key={app.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 align-top">
                      <Field label={`App ${row + 1} name`} hideLabel error={shown.appNames[app.id]}>
                        {(p) => <Input {...p} placeholder="e.g. Customer website" value={app.name} onChange={(e) => setApp(app.id, { name: e.target.value })} />}
                      </Field>
                    </td>
                    {environments.map((env, i) => (
                      <td key={env.id} className="px-2 py-2 align-top">
                        <Field label={`${app.name.trim() || `App ${row + 1}`} URL for ${env.name.trim() || `environment ${i + 1}`}`} hideLabel>
                          {(p) => (
                            <Input
                              {...p}
                              type="url"
                              placeholder="https://…"
                              value={app.urls[env.id] ?? ''}
                              onChange={(e) => setApp(app.id, { urls: { ...app.urls, [env.id]: e.target.value } })}
                            />
                          )}
                        </Field>
                      </td>
                    ))}
                    <td className="px-2 py-2 align-top">
                      <Button variant="ghost" iconOnly aria-label={`Remove app ${app.name.trim() || row + 1}`} onClick={() => setApps((list) => list.filter((a) => a.id !== app.id))}>
                        <X aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown.environments && (
            <p role="alert" className="mt-2 text-label text-failed-text">
              {shown.environments}
            </p>
          )}
          <p className="mt-2 text-label font-normal text-text-muted">
            Environment names and number are up to you (e.g. SIT, Staging, Pre-prod). Accounts, documents and skills are added in Knowledge.
          </p>
        </section>

        <Field label="Default AI model" required error={models.status === 'error' ? "Couldn't load the model list." : undefined} hint="From your AI providers in Global settings. You can choose another model for each run.">
          {(p) => (
            <Select {...p} value={chosenModel} disabled={models.status !== 'ready'} onChange={(e) => setModel(e.target.value)}>
              {models.status === 'loading' && <option value="">Loading models…</option>}
              {models.status === 'ready' &&
                models.data.map((g) => (
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

        {submitted && hasErrors(errors) && (
          <p role="alert" className="text-failed-text">
            Check the highlighted fields.
          </p>
        )}
        {saveError && (
          <p role="alert" className="text-failed-text">
            Couldn't create the project: {saveError}
          </p>
        )}
      </div>
    </Dialog>
  );
}

/** Models from every configured provider, the provider's default model first. AWS Bedrock offers its typed model id. */
async function modelOptions(providers: AiProvider[]): Promise<{ provider: AiProvider; models: string[] }[]> {
  return Promise.all(
    providers.map(async (provider) => {
      const listed = provider.kind === 'aws_bedrock' ? [] : await listModels(provider.kind);
      return { provider, models: [provider.defaultModel, ...listed.filter((m) => m !== provider.defaultModel)] };
    }),
  );
}
