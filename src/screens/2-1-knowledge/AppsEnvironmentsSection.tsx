import { useState } from 'react';
import { getProject, updateProject } from '@/data/api';
import type { Account, Project, Run } from '@/data/types';
import { Button } from '@/components/ui/button';
import { AppsEnvironmentsGrid, type GridValue } from '@/components/AppsEnvironmentsGrid';
import { SectionCard } from '@/components/SectionCard';
import { StatusLine, errorText, type SaveStatus } from '@/components/StatusLine';
import { useConfirm } from '@/components/useConfirm';
import { useProject, useReloadProject } from '@/app/projectContext';
import { appAccountCount, environmentUsage } from '@/lib/knowledge';
import { hasErrors, toProjectApps, validateAppsEnvironments } from '@/lib/projectRules';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function gridOf(project: Project): GridValue {
  return {
    environments: project.environments.map((e) => ({ ...e })),
    apps: project.apps.map((a) => ({ id: a.id, name: a.name, urls: Object.fromEntries(Object.entries(a.urls).map(([k, v]) => [k, v ?? ''])) })),
  };
}

/**
 * Knowledge › Apps and environments: interactive grid (screens/03-knowledge.md).
 * Edits are kept as a draft and saved with Save / Cancel. Removing an environment that has accounts or runs
 * (or an app that has accounts) asks for confirmation first; on Save its accounts are removed, runs keep their record.
 */
export function AppsEnvironmentsSection({ accounts, runs, onSaved }: { accounts: Account[]; runs: Run[]; onSaved: () => void }) {
  const project = useProject();
  const reloadProject = useReloadProject();
  const [draft, setDraft] = useState<GridValue>(() => gridOf(project));
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<SaveStatus>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  const saved = gridOf(project);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const errors = validateAppsEnvironments(draft.environments, draft.apps);
  const shown = submitted ? errors : { environmentNames: {}, appNames: {} };

  async function confirmRemoveEnvironment(env: { id: string; name: string }): Promise<boolean> {
    const use = environmentUsage(env.id, accounts, runs);
    if (use.accounts === 0 && use.runs === 0) return true;
    const name = project.environments.find((e) => e.id === env.id)?.name ?? env.name;
    return confirm({
      title: `Remove ${name}?`,
      danger: true,
      confirmLabel: 'Remove environment',
      body: (
        <ul className="list-disc space-y-1 pl-5">
          {use.accounts > 0 && <li>{plural(use.accounts, 'account')} for {name} will be deleted when you save.</li>}
          {use.runs > 0 && <li>{plural(use.runs, 'run')} used {name}. They keep their results and still show {name}.</li>}
        </ul>
      ),
    });
  }

  async function confirmRemoveApp(app: { id: string; name: string }): Promise<boolean> {
    const n = appAccountCount(app.id, accounts);
    if (n === 0) return true;
    return confirm({
      title: `Remove ${app.name.trim() || 'this app'}?`,
      danger: true,
      confirmLabel: 'Remove app',
      body: <p>Its {plural(n, 'account')} will be deleted when you save.</p>,
    });
  }

  async function save() {
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setSaving(true);
    try {
      const latest = await getProject(project.id);
      await updateProject({ ...latest, environments: draft.environments.map((e) => ({ id: e.id, name: e.name.trim() })), apps: toProjectApps(draft.environments, draft.apps) });
      const next = await reloadProject();
      if (next) setDraft(gridOf(next));
      setSubmitted(false);
      setStatus({ tone: 'ok', text: 'Saved.' });
      onSaved();
    } catch (e) {
      setStatus({ tone: 'error', text: `Couldn't save: ${errorText(e)}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard id="apps-environments" title="Apps and environments" description="Name environments the way your company does. Add, rename or remove columns.">
      <AppsEnvironmentsGrid
        value={draft}
        onChange={(v) => {
          setDraft(v);
          setStatus(null);
        }}
        errors={shown}
        confirmRemoveEnvironment={confirmRemoveEnvironment}
        confirmRemoveApp={confirmRemoveApp}
      />
      <p className="mt-2 text-label font-normal text-text-muted">
        The run dialog lists these environments; every app resolves to the chosen environment's URL. Leave a cell empty if an app has no such environment.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="primary" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          size="sm"
          disabled={!dirty || saving}
          onClick={() => {
            setDraft(saved);
            setSubmitted(false);
            setStatus(null);
          }}
        >
          Cancel
        </Button>
        {dirty && <span className="text-label font-normal text-cc-text">Unsaved changes</span>}
      </div>
      {submitted && hasErrors(errors) && (
        <p role="alert" className="mt-2 text-label text-failed-text">
          Check the highlighted fields.
        </p>
      )}
      <StatusLine status={status} />
      {confirmDialog}
    </SectionCard>
  );
}
