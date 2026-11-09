import { useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getGlobalSettings, saveGlobalSettings, type ModelSwitch } from '@/data/api';
import type { AiProvider, GlobalSettings } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Checkbox, RadioGroup } from '@/components/ui/field';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { CostSavingFields } from '@/components/CostSavingFields';
import { useGlobalSettings } from '@/app/settings';
import { to } from '@/app/routes';
import { canRemoveProvider, isCostSavingComplete, type CostSavingForm } from '@/lib/providers';
import { ProviderDialog } from './ProviderDialog';
import { RemoveProviderDialog } from './RemoveProviderDialog';
import { DataActions } from './DataActions';
import { SampleDataAction } from './SampleDataAction';

export type SaveStatus = { tone: 'ok' | 'error' | 'info'; text: string } | null;
type Save = (change: (current: GlobalSettings) => GlobalSettings, secrets?: { typeSafeKey?: string }) => Promise<SaveStatus>;

/**
 * 2.3 Global settings (screens/01-global.md): header "← Back" + "Global settings · Applies to all projects".
 * Back returns to the screen it was opened from, or Projects.
 * Saving (D32): toggles save at once with "Saved."; providers and the Browser Use + Jev fields use explicit Save / Cancel.
 */
export function GlobalSettingsScreen() {
  const from = (useLocation().state as { from?: string } | null)?.from;
  const { settings, reload } = useGlobalSettings();
  const [editing, setEditing] = useState<AiProvider | 'new' | null>(null);
  const [removing, setRemoving] = useState<AiProvider | null>(null);
  const [providerStatus, setProviderStatus] = useState<SaveStatus>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /**
   * Saves run one after another, each applying its change to the latest saved settings,
   * so quick successive changes neither overtake nor undo each other.
   */
  const save: Save = (change, secrets) => {
    const run = queue.current.then(async (): Promise<SaveStatus> => {
      try {
        await saveGlobalSettings(change(await getGlobalSettings()), secrets);
        await reload();
        return { tone: 'ok', text: 'Saved.' };
      } catch (e) {
        return { tone: 'error', text: `Couldn't save: ${e instanceof Error ? e.message : String(e)}` };
      }
    });
    queue.current = run;
    return run;
  };

  const removable = canRemoveProvider(settings.providers.length); // BR-PROVIDER-02

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-topbar shrink-0 items-center gap-4 border-b border-border bg-surface px-5">
        <Link to={from ?? to.projects()} className={buttonClasses({ size: 'sm' })}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-h3">Global settings</h1>
        <p className="text-text-muted">Applies to all projects</p>
      </header>
      <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-auto bg-bg focus:outline-none">
        <div className="mx-auto flex max-w-[900px] flex-col gap-5 p-6">
          <Section
            title="AI providers"
            action={
              <Button size="sm" onClick={() => setEditing('new')}>
                Add provider
              </Button>
            }
          >
            <Table>
              <thead>
                <tr>
                  <Th>Provider</Th>
                  <Th>Key</Th>
                  <Th>Default model</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {settings.providers.map((p) => (
                  <Tr key={p.id}>
                    <Td>{p.label}</Td>
                    <Td>{p.hasSecret ? <span aria-label="Saved">••••••••</span> : <span className="text-text-muted">Not set</span>}</Td>
                    <Td>{p.defaultModel}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" onClick={() => setEditing(p)}>
                          Edit<span className="sr-only"> {p.label}</span>
                        </Button>
                        <Button size="sm" variant="danger" disabled={!removable} aria-describedby={removable ? undefined : 'last-provider-note'} onClick={() => setRemoving(p)}>
                          Remove<span className="sr-only"> {p.label}</span>
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            {!removable && (
              <p id="last-provider-note" className="mt-2 text-label font-normal text-text-muted">
                QAI needs at least one AI provider, so the last one can’t be removed.
              </p>
            )}
            <StatusLine status={providerStatus} />
          </Section>

          <Section title="Cost saving (optional)" description="Browser Use + Jev: a cheaper, faster agent for AI runs and failure classification.">
            <CostSavingSection settings={settings} save={save} />
          </Section>

          <Section title="Appearance">
            <AutoSave>
              {(report) => (
                <RadioGroup
                  legend="Theme"
                  hideLegend
                  name="theme"
                  value={settings.theme}
                  options={[
                    { value: 'system', label: 'Follow system' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  onChange={(theme) => void save((s) => ({ ...s, theme })).then(report)}
                />
              )}
            </AutoSave>
          </Section>

          <Section title="Data on this computer">
            <DataActions />
          </Section>

          <Section title="Advanced">
            <AutoSave>
              {(report) => (
                <div>
                  <Checkbox
                    label="Developer mode"
                    checked={settings.developerMode}
                    aria-describedby="dev-mode-help"
                    onChange={(e) => {
                      const developerMode = e.target.checked;
                      void save((s) => ({ ...s, developerMode })).then(report);
                    }}
                  />
                  <p id="dev-mode-help" className="ml-6 text-label font-normal text-text-muted">
                    Opens a log window during runs.
                  </p>
                </div>
              )}
            </AutoSave>
            {settings.developerMode && <SampleDataAction />}
          </Section>
        </div>
      </main>

      {editing && (
        <ProviderDialog
          provider={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setProviderStatus({ tone: 'ok', text: 'Saved.' });
            void reload();
          }}
        />
      )}
      {removing && (
        <RemoveProviderDialog
          provider={removing}
          providers={settings.providers}
          onClose={() => setRemoving(null)}
          onRemoved={(switched) => {
            setRemoving(null);
            setProviderStatus({ tone: 'ok', text: removedMessage(removing.label, switched) });
            void reload();
          }}
        />
      )}
    </div>
  );
}

/** BR-PROVIDER-03: tell the user which projects switched model. */
function removedMessage(label: string, switched: ModelSwitch[]): string {
  if (switched.length === 0) return `Removed ${label}.`;
  const names = switched.map((s) => s.projectName).join(', ');
  return `Removed ${label}. ${names} ${switched.length === 1 ? 'now uses' : 'now use'} ${switched[0]!.to} as the default model.`;
}

function Section({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id={id} className="text-h3">
            {title}
          </h2>
          {description && <p className="text-label font-normal text-text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Shows "Saved." / errors for a toggle that saves on change. */
function AutoSave({ children }: { children: (report: (s: SaveStatus) => void) => ReactNode }) {
  const [status, setStatus] = useState<SaveStatus>(null);
  return (
    <>
      {children(setStatus)}
      <StatusLine status={status} />
    </>
  );
}

export function StatusLine({ status }: { status: SaveStatus }) {
  const tone = status?.tone === 'error' ? 'text-failed-text' : status?.tone === 'info' ? 'text-cc-text' : 'text-passed-text';
  return (
    <p role="status" aria-live="polite" className={`mt-2 min-h-5 text-label font-normal ${tone}`}>
      {status?.text ?? ''}
    </p>
  );
}

/**
 * Browser Use + Jev (D32). The on/off box saves at once when that leaves a working setup:
 * turning off always; turning on only if a TypeSafe key is already saved. The key, model and reasoning use Save / Cancel,
 * and Save stays disabled until the required fields are filled, so partial secrets are never saved.
 */
function CostSavingSection({ settings, save }: { settings: GlobalSettings; save: Save }) {
  const saved = settings.costSaving;
  const fromSaved = (enabled: boolean): CostSavingForm => ({ enabled, typeSafeModel: saved.typeSafeModel, reasoning: saved.reasoning, typeSafeKey: '' });
  const [form, setForm] = useState<CostSavingForm>(() => fromSaved(saved.enabled));
  const [status, setStatus] = useState<SaveStatus>(null);
  const [busy, setBusy] = useState(false);

  const dirty = form.enabled !== saved.enabled || form.typeSafeKey !== '' || form.typeSafeModel !== saved.typeSafeModel || form.reasoning !== saved.reasoning;
  const complete = isCostSavingComplete(form, { keySaved: saved.hasKey });

  async function persist(next: CostSavingForm) {
    setBusy(true);
    const { typeSafeKey, ...rest } = next;
    const result = await save((s) => ({ ...s, costSaving: { ...rest, typeSafeModel: rest.typeSafeModel.trim(), hasKey: s.costSaving.hasKey } }), { typeSafeKey });
    setBusy(false);
    if (result?.tone === 'ok') setForm({ ...next, typeSafeKey: '' });
    setStatus(result);
  }

  function onToggle(enabled: boolean) {
    if (!enabled) return void persist(fromSaved(false)); // off: saved at once, unsaved field edits dropped
    if (saved.hasKey && saved.typeSafeModel.trim() !== '') return void persist(fromSaved(true)); // on with a saved key
    setForm(fromSaved(true));
    setStatus({ tone: 'info', text: 'Enter the TypeSafe API key, then Save to turn this on.' });
  }

  return (
    <>
      <CostSavingFields
        form={form}
        checkboxLabel="Browser Use + Jev"
        keySaved={saved.hasKey}
        onChange={(next) => {
          if (next.enabled !== form.enabled) return onToggle(next.enabled);
          setForm(next);
          setStatus(null); // an earlier "Saved." must not suggest these new edits are saved
        }}
      />
      {form.enabled && (
        <div className="ml-6 mt-3 flex gap-2">
          <Button variant="primary" size="sm" disabled={!dirty || !complete || busy} onClick={() => void persist(form)}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
          <Button
            size="sm"
            disabled={!dirty || busy}
            onClick={() => {
              setForm(fromSaved(saved.enabled));
              setStatus(null);
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      <StatusLine status={status} />
    </>
  );
}
