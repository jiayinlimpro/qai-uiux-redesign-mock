import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject, DuplicateProjectNameError, listProjects } from '@/data/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { AppsEnvironmentsGrid, type GridValue } from '@/components/AppsEnvironmentsGrid';
import { ProjectModelSelect } from '@/components/ProjectModelSelect';
import { useAsync } from '@/app/hooks/useAsync';
import { to } from '@/app/routes';
import { hasErrors, isProjectNameTaken, toProjectApps, validateNewProject } from '@/lib/projectRules';

const newKey = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const DEFAULT_ENVIRONMENTS = ['Dev', 'UAT', 'Prod'];

/** 1.3 New project (screens/01-global.md): dialog over Projects. Create → 1.4 Overview. */
export function NewProjectDialog() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [grid, setGrid] = useState<GridValue>(() => ({
    environments: DEFAULT_ENVIRONMENTS.map((n) => ({ id: newKey('env'), name: n })),
    apps: [{ id: newKey('app'), name: '', urls: {} }],
  }));
  const [model, setModel] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const projects = useAsync(listProjects, []);
  const [takenOnSave, setTakenOnSave] = useState<string[]>([]);
  const existingNames = [...(projects.status === 'ready' ? projects.data.map((p) => p.name) : []), ...takenOnSave];
  const errors = validateNewProject({ name, ...grid }, existingNames);
  // Other errors show after Create; a duplicate name shows inline as you type (BR-PROJECT-01).
  const duplicate = name.trim() !== '' && isProjectNameTaken(name, existingNames);
  const shown = submitted ? errors : { environmentNames: {}, appNames: {}, ...(duplicate ? { name: errors.name } : {}) };
  const close = () => navigate(to.projects());

  async function create() {
    setSubmitted(true);
    if (hasErrors(errors) || !model) return;
    setSaving(true);
    setSaveError(null);
    try {
      const project = await createProject({
        name,
        defaultModel: model,
        environments: grid.environments.map((e) => ({ id: e.id, name: e.name.trim() })),
        apps: toProjectApps(grid.environments, grid.apps),
      });
      navigate(to.overview(project.id));
    } catch (e) {
      setSaving(false);
      if (e instanceof DuplicateProjectNameError) setTakenOnSave((list) => [...list, name]); // shown inline on the name
      else setSaveError(e instanceof Error ? e.message : String(e));
    }
  }

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
          <AppsEnvironmentsGrid
            value={grid}
            onChange={setGrid}
            errors={shown}
            heading={
              <h3 id="apps-envs-heading" className="text-label text-text-muted">
                Apps and environments (optional, can add later)
              </h3>
            }
          />
          <p className="mt-2 text-label font-normal text-text-muted">
            Environment names and number are up to you (e.g. SIT, Staging, Pre-prod). Accounts, documents and skills are added in Knowledge.
          </p>
        </section>

        <ProjectModelSelect
          label="Default AI model"
          hint="From your AI providers in Global settings. You can choose another model for each run."
          value={model}
          onChange={setModel}
        />

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
