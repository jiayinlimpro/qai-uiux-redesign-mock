import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { createTest, DuplicateTestIdError, getResult, getRun, listKnowledge, listSuites, listTests, saveTest } from '@/data/api';
import type { Browser, KnowledgeItem, Result, Run, Suite, TestCase } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { SplitPane } from '@/components/ui/split-pane';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { RunDialog } from '@/components/RunDialog';
import { errorText } from '@/components/StatusLine';
import { useConfirm } from '@/components/useConfirm';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { OverviewLink } from '@/app/WayBackLink';
import { defaultTitle, fieldChanges, syncTestDataFields, validateTestForm } from '@/lib/editorRules';
import { changeEffect, idAfterMove, nextTestId, prefixOf } from '@/lib/suiteRules';
import { cn } from '@/lib/utils';
import { plural } from '@/lib/format';
import { browserLabels } from '@/lib/labels';
import { EditorTestList } from './EditorTestList';

interface Data {
  suites: Suite[];
  tests: TestCase[];
  knowledge: KnowledgeItem[];
  from: { result: Result; run: Run } | null;
}

/** 3.2 New / edit test (screens/04-suites.md): compact list on the left, editor form on the right. */
export function EditTestScreen({ mode }: { mode: 'new' | 'edit' }) {
  const project = useProject();
  const { testId = '' } = useParams();
  const fromResultId = useSearchParams()[0].get('from');
  const data = useAsync<Data>(async () => {
    const [suites, tests, knowledge] = await Promise.all([listSuites(project.id), listTests(project.id), listKnowledge(project.id)]);
    let from: Data['from'] = null;
    if (mode === 'edit' && fromResultId) {
      const result = await getResult(fromResultId);
      from = { result, run: await getRun(result.runId) };
    }
    return { suites, tests, knowledge, from };
  }, [project.id, mode, fromResultId]);

  if (data.status === 'loading') return <LoadingState label="Loading the test…" />;
  if (data.status === 'error') return <ErrorState title="Couldn't load the test" message={data.error.message} onRetry={data.retry} />;
  const test = mode === 'edit' ? data.data.tests.find((t) => t.id === testId) : undefined;
  if (mode === 'edit' && !test) {
    return (
      <ErrorState title="Test not found" message="It may have been deleted.">
        <OverviewLink projectId={project.id} projectName={project.name} />
      </ErrorState>
    );
  }
  return (
    <SplitPane
      label="Resize test list"
      defaultLeft={340}
      left={<EditorTestList suites={data.data.suites} tests={data.data.tests} currentId={test?.id} />}
      right={
        <div className="relative h-full overflow-auto">
          <EditorForm key={test?.id ?? 'new'} test={test} data={data.data} />
        </div>
      }
    />
  );
}

interface FormState {
  testId: string;
  suiteId: string | null;
  title: string;
  description: string;
  startPage: string;
  browserPreference: Browser[];
  preconditions: string;
  steps: string[];
  expectedResult: string;
  expectedKeywords: string;
  linkedKnowledge: string[];
}

const NONE = '__none__';

function EditorForm({ test, data }: { test?: TestCase; data: Data }) {
  const project = useProject();
  const navigate = useNavigate();
  const [confirm, confirmDialog] = useConfirm();
  const others = data.tests.filter((t) => t.id !== test?.id);
  const suiteOf = useCallback((id: string | null) => data.suites.find((s) => s.id === id) ?? null, [data.suites]);
  const initial: FormState = useMemo(
    () => ({
      testId: test?.testId ?? nextTestId('T', others.map((t) => t.testId)),
      suiteId: test?.suiteId ?? null,
      title: test?.title ?? '',
      description: test?.description ?? '',
      startPage: test?.startPage ?? '',
      browserPreference: [...(test?.browserPreference ?? [])],
      preconditions: test?.preconditions ?? '',
      steps: test?.steps.length ? [...test.steps] : [''],
      expectedResult: test?.expectedResult ?? '',
      expectedKeywords: test?.expectedKeywords ?? '',
      linkedKnowledge: [...(test?.linkedKnowledge ?? [])],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the form starts from the test once
    [test?.id],
  );
  const [form, setForm] = useState<FormState>(initial);
  const [idTouched, setIdTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rerun, setRerun] = useState<TestCase | null>(null);
  const leaving = useRef(false);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const steps = form.steps.map((s) => s.trim()).filter(Boolean);
  // Optional fields are rebuilt from the form, so clearing one removes it.
  const base = test
    ? (({ preconditions: _p, expectedResult: _e, expectedKeywords: _k, testData: _t, description: _d, startPage: _s, browserPreference: _b, ...rest }) => rest)(test)
    : null;
  const candidate: TestCase | null = test && base
    ? {
        ...base,
        testId: form.testId.trim(),
        suiteId: form.suiteId,
        title: form.title.trim(),
        ...optional('description', form.description),
        ...optional('startPage', form.startPage),
        ...browsers(form.browserPreference),
        ...optional('preconditions', form.preconditions),
        steps,
        ...optional('expectedResult', form.expectedResult),
        ...optional('expectedKeywords', form.expectedKeywords),
        linkedKnowledge: form.linkedKnowledge,
        ...withTestData(syncTestDataFields(test.testData, steps, () => `row-${crypto.randomUUID().slice(0, 8)}`)),
      }
    : null;
  const effect = test && candidate ? changeEffect(test, candidate) : null;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const errors = validateTestForm({ testId: form.testId, steps: form.steps }, others.map((t) => t.testId));
  const shown = submitted ? errors : {};
  const fields = fieldChanges(test?.testData, steps);
  const fromRun = data.from;
  const nextVersion = test ? test.version + (effect?.bumpVersion ? 1 : 0) : 1;
  const resetWarning = Boolean(test && effect?.resetScript && test.script.state === 'recorded');

  // Leaving with unsaved changes asks first.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    void confirm({ title: 'Discard your changes?', body: <p>The test is not saved. Leaving discards your changes.</p>, confirmLabel: 'Discard changes', cancelLabel: 'Keep editing', danger: true }).then((ok) =>
      ok ? blocker.proceed() : blocker.reset(),
    );
  }, [blocker, confirm]);

  const backTo = fromRun ? to.run(project.id, fromRun.run.id, fromRun.result.id) : test ? to.suiteTest(project.id, test.id) : to.suites(project.id);

  /** Suite change: a new test's untouched ID follows the suite prefix; an existing T- test follows BR-TEST-05. */
  function changeSuite(value: string) {
    const suiteId = value === NONE ? null : value;
    const taken = others.map((t) => t.testId);
    if (!test && !idTouched) set({ suiteId, testId: nextTestId(prefixOf(suiteOf(suiteId)), taken) });
    else if (test && !idTouched && suiteId !== test.suiteId) set({ suiteId, testId: suiteId === test.suiteId ? test.testId : idAfterMove(test, suiteOf(suiteId), taken) });
    else set({ suiteId });
  }

  async function save(andRerun: boolean) {
    setSubmitted(true);
    if (errors.testId || errors.steps) return;
    setSaving(true);
    setError(null);
    try {
      const saved = test && candidate
        ? await saveTest(candidate)
        : await createTest({
            projectId: project.id,
            suiteId: form.suiteId,
            testId: form.testId,
            title: form.title,
            steps,
            linkedKnowledge: form.linkedKnowledge,
            ...optional('description', form.description),
            ...optional('startPage', form.startPage),
            ...browsers(form.browserPreference),
            ...optional('preconditions', form.preconditions),
            ...optional('expectedResult', form.expectedResult),
            ...optional('expectedKeywords', form.expectedKeywords),
            ...withTestData(syncTestDataFields(undefined, steps, () => `row-${crypto.randomUUID().slice(0, 8)}`)),
          });
      leaving.current = true;
      if (andRerun) {
        setRerun(saved);
        return;
      }
      const flash = test ? (saved.version !== test.version ? `Saved as v${saved.version}` : 'Saved') : `Created ${saved.testId}`;
      navigate(to.suiteTest(project.id, saved.id), { state: { flash } });
    } catch (e) {
      setSaving(false);
      setError(e instanceof DuplicateTestIdError ? e.message : errorText(e));
    }
  }

  return (
    <form
      noValidate
      className="p-6"
      aria-labelledby="editor-title"
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label font-normal text-text-muted">
            {fromRun ? (
              <>
                Opened from{' '}
                <Link to={to.run(project.id, fromRun.run.id, fromRun.result.id)} className="text-accent underline underline-offset-2">
                  Run #{fromRun.run.number} result
                </Link>{' '}
                ·{' '}
              </>
            ) : test ? (
              'Editing · '
            ) : (
              'New test · '
            )}
            {suiteOf(form.suiteId)?.name ?? 'Not in a suite'} › {form.testId || '—'}
            {test && ` · v${test.version}${nextVersion !== test.version ? ` → v${nextVersion}` : ''}`}
          </p>
          <h1 id="editor-title" className="text-h1">
            {test ? 'Edit test' : 'New test'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={backTo} className={buttonClasses()}>
            Cancel
          </Link>
          <Button type="submit" variant={fromRun ? 'secondary' : 'primary'} disabled={saving || (Boolean(test) && !dirty)}>
            {saving ? 'Saving…' : test ? (effect?.bumpVersion ? `Save as v${nextVersion}` : 'Save') : 'Create test'}
          </Button>
          {fromRun && (
            <Button variant="primary" disabled={saving || !dirty} onClick={() => void save(true)}>
              Save and re-run
            </Button>
          )}
        </div>
      </div>

      {resetWarning && (
        <p role="status" className="mt-4 rounded-card border border-cc-border bg-cc-fill px-4 py-3 text-cc-text">
          You changed the {effect!.resetBecause.join(' and ')}. Saving resets the recorded script and visual history; the next run of this test uses AI.
        </p>
      )}
      {(fields.added.length > 0 || fields.removed.length > 0) && (
        // D49: shown before saving. Renaming a placeholder is a removal + an addition, so both lines show.
        <div role="status" className={cn('mt-3 rounded-card border px-4 py-3', fields.removed.length > 0 ? 'border-cc-border bg-cc-fill text-cc-text' : 'border-border bg-surface text-text-muted')}>
          {fields.added.length > 0 && <p>Test data: adds {fields.added.map((f) => `{${f}}`).join(', ')}.</p>}
          {fields.removed.length > 0 && (
            <p>
              Test data: removes {fields.removed.map((f) => `{${f}}`).join(', ')} and {fields.removed.length === 1 ? 'its' : 'their'} values in{' '}
              {plural(test?.testData?.rows.length ?? 0, 'row')}.
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-failed-text">
          Couldn't save: {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Test ID" required error={shown.testId ?? (form.testId.trim() && errors.testId ? errors.testId : undefined)}>
            {(p) => (
              <Input
                {...p}
                value={form.testId}
                onChange={(e) => {
                  setIdTouched(true);
                  set({ testId: e.target.value });
                }}
              />
            )}
          </Field>
          <Field label="Suite">
            {(p) => (
              <Select {...p} value={form.suiteId ?? NONE} onChange={(e) => changeSuite(e.target.value)}>
                {[...data.suites]
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                <option value={NONE}>Not in a suite</option>
              </Select>
            )}
          </Field>
        </div>
        <Field label="Title" hint={form.title.trim() ? undefined : `Leave empty to use the start of the first step: “${defaultTitle(form.steps)}”`}>
          {(p) => <Input {...p} value={form.title} onChange={(e) => set({ title: e.target.value })} />}
        </Field>
        <Field label="Preconditions">{(p) => <Textarea {...p} value={form.preconditions} onChange={(e) => set({ preconditions: e.target.value })} />}</Field>
        <StepsEditor steps={form.steps} onChange={(steps) => set({ steps })} error={shown.steps} />
        <Field label="Expected result">{(p) => <Textarea {...p} value={form.expectedResult} onChange={(e) => set({ expectedResult: e.target.value })} />}</Field>
        <details className="group">
          <summary className="cursor-pointer font-semibold text-text-muted">More options</summary>
          <div className="mt-3 flex flex-col gap-4">
            <Field label="Description">{(p) => <Textarea {...p} value={form.description} onChange={(e) => set({ description: e.target.value })} />}</Field>
            <Field label="Start page" hint="Optional URL the test starts from. Empty: the app's URL for the run's environment (BR-ENV-02).">
              {(p) => <Input {...p} type="url" placeholder="https://…" value={form.startPage} onChange={(e) => set({ startPage: e.target.value })} />}
            </Field>
            <fieldset>
              <legend className="mb-2 text-label text-text-muted">Browser preference (for replays)</legend>
              <div className="flex flex-wrap gap-5">
                {(['chrome', 'firefox', 'webkit'] as const).map((b) => (
                  <label key={b} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent"
                      checked={form.browserPreference.includes(b)}
                      onChange={(e) =>
                        set({ browserPreference: (['chrome', 'firefox', 'webkit'] as const).filter((x) => (x === b ? e.target.checked : form.browserPreference.includes(x))) })
                      }
                    />
                    {browserLabels[b]}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-label font-normal text-text-muted">None ticked: the browsers chosen in the run dialog. AI runs always use Chrome (BR-RUN-03).</p>
            </fieldset>
            <Field label="Text that must appear" hint="Expected keywords. Use | for “or” and & for “and”. Case-sensitive.">
              {(p) => <Input {...p} value={form.expectedKeywords} onChange={(e) => set({ expectedKeywords: e.target.value })} />}
            </Field>
            <fieldset>
              <legend className="mb-2 text-label text-text-muted">Linked knowledge</legend>
              {data.knowledge.length === 0 && <p className="text-text-muted">This project has no documents or skills yet.</p>}
              <ul className="space-y-1">
                {data.knowledge.map((k) => {
                  const viaScope = k.scope.kind === 'project' || (k.scope.kind === 'suite' && k.scope.suiteId === form.suiteId) || (k.scope.kind === 'test' && test && k.scope.testId === test.id);
                  return (
                    <li key={k.id}>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-accent"
                          checked={Boolean(viaScope) || form.linkedKnowledge.includes(k.id)}
                          disabled={Boolean(viaScope)}
                          onChange={(e) => set({ linkedKnowledge: e.target.checked ? [...form.linkedKnowledge, k.id] : form.linkedKnowledge.filter((x) => x !== k.id) })}
                        />
                        {k.name}
                        {viaScope && <span className="text-label font-normal text-text-muted">applies through its scope (set in Knowledge)</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          </div>
        </details>
      </div>
      {submitted && (errors.testId || errors.steps) && (
        <p role="alert" className="mt-3 text-failed-text">
          Check the highlighted fields.
        </p>
      )}
      {confirmDialog}
      {/* Save and re-run: the run dialog with this test (5.1). Closing without starting goes to the test. */}
      {rerun && <RunDialog testIds={[rerun.id]} presetModel={fromRun?.run.model} presetEnvironmentId={fromRun?.run.environmentId} onClose={() => navigate(to.suiteTest(project.id, rerun.id), { state: { flash: `Saved as v${rerun.version}` } })} />}
    </form>
  );
}

/** One input per step; add, reorder, delete. Hint about {field} placeholders (BR-TEST-03). */
function StepsEditor({ steps, onChange, error }: { steps: string[]; onChange: (s: string[]) => void; error?: string }) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...steps];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    onChange(next);
  };
  return (
    <fieldset aria-describedby="steps-hint">
      <legend className="text-label text-text-muted">
        Steps <span aria-hidden="true">*</span>
      </legend>
      <ol className="mt-1 flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-2 w-5 shrink-0 text-right text-text-muted" aria-hidden="true">
              {i + 1}
            </span>
            <Textarea
              aria-label={`Step ${i + 1}`}
              rows={Math.min(8, Math.max(2, Math.ceil(step.length / 90)))} // long imported paragraphs stay readable
              className={cn('flex-1', error && 'border-failed-dot')}
              value={step} onChange={(e) => onChange(steps.map((s, j) => (j === i ? e.target.value : s)))} />
            <div className="flex shrink-0 gap-0.5">
              <Button variant="ghost" size="sm" iconOnly aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" iconOnly aria-label={`Move step ${i + 1} down`} disabled={i === steps.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" iconOnly aria-label={`Delete step ${i + 1}`} disabled={steps.length === 1} onClick={() => onChange(steps.filter((_, j) => j !== i))}>
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <Button size="sm" className="mt-2" onClick={() => onChange([...steps, ''])}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add step
      </Button>
      <p id="steps-hint" className="mt-1 text-label font-normal text-text-muted">
        Use {'{field}'} to insert values from the Test data tab.
      </p>
      {error && <p className="text-label text-failed-text">{error}</p>}
    </fieldset>
  );
}

/** Optional text fields: empty → absent (so an untouched empty field is not a change). */
function optional<K extends string>(key: K, value: string): Partial<Record<K, string>> {
  return value.trim() ? ({ [key]: value.trim() } as Record<K, string>) : {};
}

function browsers(list: Browser[]): { browserPreference?: Browser[] } {
  return list.length ? { browserPreference: list } : {};
}

function withTestData(testData: TestCase['testData']): { testData?: TestCase['testData'] } {
  return testData ? { testData } : {};
}
