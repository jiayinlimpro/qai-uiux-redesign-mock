import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProject, listProjects, updateProject, DuplicateProjectNameError } from '@/data/api';
import type { Project } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/field';
import { ProjectModelSelect } from '@/components/ProjectModelSelect';
import { DeleteProjectDialog } from '@/components/ProjectDialogs';
import { SectionCard } from '@/components/SectionCard';
import { StatusLine, errorText, type SaveStatus } from '@/components/StatusLine';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject, useReloadProject } from '@/app/projectContext';
import { ExportProjectDialog } from '@/components/ExportProjectDialog';
import { to } from '@/app/routes';
import { aiStepsWarning, checkExtensionFolder, parseRunDefaults, type RunDefaultsForm } from '@/lib/knowledge';
import { projectNameError } from '@/lib/projectRules';

type Change = (p: Project) => Project;

/**
 * 2.2 Project settings (screens/02-project.md). Saving follows D32: toggles and choices save at once with "Saved";
 * typed values (name, run default numbers) use Save / Cancel.
 */
export function ProjectSettingsScreen() {
  const project = useProject();
  const reload = useReloadProject();
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /** Saves run in order, each applying its change to the latest saved project. */
  function save(change: Change): Promise<SaveStatus> {
    const run = queue.current.then(async (): Promise<SaveStatus> => {
      try {
        await updateProject(change(await getProject(project.id)));
        await reload();
        return { tone: 'ok', text: 'Saved.' };
      } catch (e) {
        return { tone: 'error', text: e instanceof DuplicateProjectNameError ? e.message : `Couldn't save: ${errorText(e)}` };
      }
    });
    queue.current = run;
    return run;
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <h1 className="text-h1">Project settings</h1>
      <div className="mt-5 flex flex-col gap-5">
        <GeneralSection project={project} save={save} />
        <AiSection project={project} save={save} />
        <BrowserSection project={project} save={save} />
        <SectionCard id="visual" title="Visual comparison">
          <AutoSaveCheckbox
            label="Compare screenshots with the previous run for all tests"
            help="Script replays only. Individual tests can be excluded in their Visual check tab. Changes are flagged, never failed."
            checked={project.settings.visualComparison}
            onSave={(visualComparison) => save((p) => ({ ...p, settings: { ...p.settings, visualComparison } }))}
          />
        </SectionCard>
        <RunDefaultsSection project={project} save={save} />
        <DataSection project={project} />
      </div>
    </div>
  );
}

function GeneralSection({ project, save }: { project: Project; save: (c: Change) => Promise<SaveStatus> }) {
  const [name, setName] = useState(project.name);
  const [status, setStatus] = useState<SaveStatus>(null);
  const others = useAsync(async () => (await listProjects()).filter((p) => p.id !== project.id).map((p) => p.name), [project.id]);
  const error = projectNameError(name, others.status === 'ready' ? others.data : []); // BR-PROJECT-01
  const dirty = name !== project.name;

  return (
    <SectionCard id="general" title="General">
      <Field label="Project name" required error={dirty ? error : undefined} className="max-w-md">
        {(p) => (
          <Input
            {...p}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStatus(null);
            }}
          />
        )}
      </Field>
      <SaveCancel
        dirty={dirty}
        disabled={Boolean(error)}
        onCancel={() => setName(project.name)}
        onSave={async () => {
          const result = await save((p) => ({ ...p, name }));
          setStatus(result);
        }}
      />
      <StatusLine status={status} />
    </SectionCard>
  );
}

function AiSection({ project, save }: { project: Project; save: (c: Change) => Promise<SaveStatus> }) {
  const [status, setStatus] = useState<SaveStatus>(null);
  return (
    <SectionCard id="ai" title="AI">
      <div className="max-w-md">
        <ProjectModelSelect
          label="Default model"
          hint="Can be changed per run in the run dialog."
          value={project.defaultModel}
          onChange={(defaultModel) => {
            if (defaultModel === project.defaultModel) return;
            void save((p) => ({ ...p, defaultModel })).then(setStatus);
          }}
        />
      </div>
      <StatusLine status={status} />
    </SectionCard>
  );
}

/** Browser extension folder (optional): must have chrome, firefox and safari sub-folders. */
function BrowserSection({ project, save }: { project: Project; save: (c: Change) => Promise<SaveStatus> }) {
  const input = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<SaveStatus>(null);
  const current = project.settings.browserExtensionPath;

  async function onFolder(files: File[]) {
    if (files.length === 0) return;
    const { folder, missing } = checkExtensionFolder(files.map((f) => f.webkitRelativePath || f.name));
    if (missing.length > 0) {
      setStatus({ tone: 'error', text: `${folder} can't be used: it needs chrome, firefox and safari sub-folders (missing: ${missing.join(', ')}).` });
      return;
    }
    setStatus(await save((p) => ({ ...p, settings: { ...p.settings, browserExtensionPath: folder } })));
  }

  return (
    <SectionCard id="browser" title="Browser">
      <input
        ref={(el) => {
          input.current = el;
          el?.setAttribute('webkitdirectory', '');
        }}
        type="file"
        hidden
        onChange={(e) => {
          void onFolder(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      <p className="text-label text-text-muted">Browser extension folder (optional)</p>
      <div className="mt-1 flex max-w-md items-center gap-2">
        <p className="flex h-9 min-w-0 flex-1 items-center truncate rounded-control border border-border bg-bg px-3">
          {current ?? <span className="text-text-muted">No extension</span>}
        </p>
        <Button onClick={() => input.current?.click()}>{current ? 'Change' : 'Browse'}</Button>
        {current && (
          <Button
            variant="ghost"
            onClick={() => void save((p) => ({ ...p, settings: { ...p.settings, browserExtensionPath: undefined } })).then(setStatus)}
          >
            Remove
          </Button>
        )}
      </div>
      <p className="mt-1 text-label font-normal text-text-muted">Needs chrome, firefox and safari sub-folders.</p>
      <StatusLine status={status} />
    </SectionCard>
  );
}

/** Run defaults (advanced): pre-fill the run dialog's Advanced section (BR-RUN-12 defaults 40 / 10, workers 2). */
function RunDefaultsSection({ project, save }: { project: Project; save: (c: Change) => Promise<SaveStatus> }) {
  const d = project.settings.runDefaults;
  const fromSaved = (): RunDefaultsForm => ({ ...d, workers: String(d.workers), maxAiSteps: String(d.maxAiSteps), maxActionsPerStep: String(d.maxActionsPerStep) });
  const [form, setForm] = useState<RunDefaultsForm>(fromSaved);
  const [status, setStatus] = useState<SaveStatus>(null);
  const parsed = parseRunDefaults(form);
  const stepsWarning = aiStepsWarning(form.maxAiSteps); // D38: above 100, shown but not blocking
  const errors = parsed.ok ? {} : parsed.errors;
  const numbersDirty = form.workers !== String(d.workers) || form.maxAiSteps !== String(d.maxAiSteps) || form.maxActionsPerStep !== String(d.maxActionsPerStep);
  const setNum = (k: 'workers' | 'maxAiSteps' | 'maxActionsPerStep', v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setStatus(null);
  };
  const toggle = (k: 'headless' | 'parallel', value: boolean) => {
    setForm((f) => ({ ...f, [k]: value }));
    void save((p) => ({ ...p, settings: { ...p.settings, runDefaults: { ...p.settings.runDefaults, [k]: value } } })).then(setStatus);
  };

  return (
    <SectionCard id="run-defaults" title="Run defaults (advanced)" description="Pre-fill the Advanced section of the run dialog.">
      <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Checkbox label="Headless (browser hidden)" checked={form.headless} onChange={(e) => toggle('headless', e.target.checked)} />
        <div className="flex flex-wrap items-start gap-3">
          <Checkbox label="Parallel" checked={form.parallel} onChange={(e) => toggle('parallel', e.target.checked)} />
          <Field label="Workers" error={errors.workers} hint="1 to 8" className="w-28">
            {(p) => <Input {...p} inputMode="numeric" disabled={!form.parallel} value={form.workers} onChange={(e) => setNum('workers', e.target.value)} />}
          </Field>
        </div>
        <Field
          label="Max AI steps per test"
          error={errors.maxAiSteps}
          hint={stepsWarning ? <span className="text-cc-text">{stepsWarning}</span> : '1 to 500'}
        >
          {(p) => <Input {...p} inputMode="numeric" value={form.maxAiSteps} onChange={(e) => setNum('maxAiSteps', e.target.value)} />}
        </Field>
        <Field label="Max actions per step" error={errors.maxActionsPerStep} hint="1 to 50">
          {(p) => <Input {...p} inputMode="numeric" value={form.maxActionsPerStep} onChange={(e) => setNum('maxActionsPerStep', e.target.value)} />}
        </Field>
      </div>
      <SaveCancel
        dirty={numbersDirty}
        disabled={!parsed.ok}
        onCancel={() => setForm((f) => ({ ...f, workers: String(d.workers), maxAiSteps: String(d.maxAiSteps), maxActionsPerStep: String(d.maxActionsPerStep) }))}
        onSave={async () => {
          if (!parsed.ok) return;
          const { workers, maxAiSteps, maxActionsPerStep } = parsed.value;
          setStatus(await save((p) => ({ ...p, settings: { ...p.settings, runDefaults: { ...p.settings.runDefaults, workers, maxAiSteps, maxActionsPerStep } } })));
        }}
      />
      <StatusLine status={status} />
    </SectionCard>
  );
}

function DataSection({ project }: { project: Project }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<SaveStatus>(null);
  return (
    <SectionCard id="data" title="Data" description="Export includes suites, tests, scripts, knowledge, runs and AI explore chats.">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setExporting(true)}>Export project</Button>
        <Button variant="danger" onClick={() => setDeleting(true)}>
          Delete project
        </Button>
      </div>
      <StatusLine status={status} />
      {deleting && <DeleteProjectDialog project={project} onClose={() => setDeleting(false)} onDone={() => navigate(to.projects())} />}
      {exporting && (
        <ExportProjectDialog
          project={project}
          onClose={() => setExporting(false)}
          onDone={(text) => {
            setExporting(false);
            setStatus({ tone: 'ok', text });
          }}
        />
      )}
    </SectionCard>
  );
}

function AutoSaveCheckbox({ label, help, checked, onSave }: { label: string; help: string; checked: boolean; onSave: (v: boolean) => Promise<SaveStatus> }) {
  const [status, setStatus] = useState<SaveStatus>(null);
  return (
    <>
      <Checkbox label={label} checked={checked} aria-describedby="visual-help" onChange={(e) => void onSave(e.target.checked).then(setStatus)} />
      <p id="visual-help" className="ml-6 text-label font-normal text-text-muted">
        {help}
      </p>
      <StatusLine status={status} />
    </>
  );
}

function SaveCancel({ dirty, disabled, onSave, onCancel }: { dirty: boolean; disabled: boolean; onSave: () => Promise<void>; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <div className="mt-3 flex items-center gap-2">
      <Button
        variant="primary"
        size="sm"
        disabled={!dirty || disabled || saving}
        onClick={async () => {
          setSaving(true);
          await onSave();
          setSaving(false);
        }}
      >
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button size="sm" disabled={!dirty || saving} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
