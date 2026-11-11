import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleAlert, CircleCheck, CircleX, LoaderCircle } from 'lucide-react';
import { listSuites, listLibraryTests, planRun, runPreflight, startRun, type PlannedTest } from '@/data/api';
import type { Browser, ID } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { errorText } from '@/components/StatusLine';
import { modelOptions } from '@/components/ProjectModelSelect';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { useGlobalSettings } from '@/app/settings';
import { to } from '@/app/routes';
import { aiStepsWarning, parseRunDefaults, type RunDefaultsForm } from '@/lib/knowledge';
import { browserLabels, modeLabels } from '@/lib/labels';
import { scopeLabel, scopeTitle, visualSummary, type PreflightCheck } from '@/lib/runPlan';
import { plural } from '@/lib/format';

const BROWSERS: Browser[] = ['chrome', 'firefox', 'webkit'];
const modeChip = { ai: { tone: 'info' as const, label: 'AI run' }, script: { tone: 'passed' as const, label: 'Script replay' }, data_rows: { tone: 'neutral' as const, label: modeLabels.data_rows } };

/**
 * 5.1 Run dialog (screens/06-runs.md). Opened from Suites (selection, test Run), Edit test "Save and re-run",
 * Runs "New run" (all tests). Shows how each test will run (BR-RUN-02) before starting. No cost or time estimates (BR-RUN-05).
 */
/** presetModel / presetEnvironmentId: prefilled from a result's run (Save and re-run, Re-run with model). */
export function RunDialog({ testIds, onClose, presetModel, presetEnvironmentId }: { testIds: ID[]; onClose: () => void; presetModel?: string; presetEnvironmentId?: ID }) {
  const project = useProject();
  const { settings } = useGlobalSettings();
  const navigate = useNavigate();
  const data = useAsync(async () => {
    const [tests, suites, models] = await Promise.all([listLibraryTests(project.id), listSuites(project.id), modelOptions(settings.providers)]);
    return { tests, suites, models };
  }, [project.id]);

  const defaultEnv = project.environments.find((e) => project.platforms.some((a) => a.urls[e.id])) ?? project.environments[0];
  const [environmentId, setEnvironmentId] = useState(presetEnvironmentId && project.environments.some((e) => e.id === presetEnvironmentId) ? presetEnvironmentId : (defaultEnv?.id ?? ''));
  const [model, setModel] = useState(presetModel ?? project.defaultModel);
  const [browsers, setBrowsers] = useState<Browser[]>(['chrome']);
  const [forceAi, setForceAi] = useState(false);
  const d = project.settings.runDefaults;
  const [advanced, setAdvanced] = useState<RunDefaultsForm>({ ...d, workers: String(d.workers), maxAiSteps: String(d.maxAiSteps), maxActionsPerStep: String(d.maxActionsPerStep) });
  const [checks, setChecks] = useState<PreflightCheck[] | null>(null);
  const [phase, setPhase] = useState<'idle' | 'checking' | 'starting'>('idle');
  const [error, setError] = useState<string | null>(null);

  const plans = useAsync(() => planRun(testIds, { forceAi, browsers }), [testIds.join(','), forceAi, browsers.join(',')], { keepPrevious: true });
  const parsed = parseRunDefaults(advanced);

  const scope = useMemo(() => {
    if (data.status !== 'ready') return '';
    const label = scopeLabel(testIds, data.data.tests, data.data.suites);
    return scopeTitle(label, testIds.length, data.data.suites.some((s) => s.name === label));
  }, [data, testIds]);

  // Pre-flight results are about the options they ran with; any change asks again.
  useEffect(() => setChecks(null), [environmentId, model, browsers, forceAi]);

  if (data.status !== 'ready') {
    return (
      <Dialog title="Run tests" onClose={onClose} footer={<Button onClick={onClose}>Cancel</Button>}>
        {data.status === 'loading' ? <LoadingState label="Preparing the run…" /> : <ErrorState title="Couldn't prepare the run" message={data.error.message} onRetry={data.retry} />}
      </Dialog>
    );
  }

  const tests = new Map(data.data.tests.map((t) => [t.id, t]));
  const planList: PlannedTest[] = plans.status === 'ready' ? plans.data : [];
  const runnable = planList.filter((p) => !p.notRunReason).length;
  const visual = visualSummary(planList, data.data.tests);
  const showBrowsers = planList.some((p) => !p.notRunReason && p.browsers.join() !== BROWSERS.filter((b) => browsers.includes(b)).join());
  const offered = data.data.models.flatMap((g) => g.models);
  const blocked = checks?.some((c) => c.status === 'block') ?? false;
  const warned = checks?.some((c) => c.status === 'warn') ?? false;
  const canStart = browsers.length > 0 && runnable > 0 && parsed.ok && Boolean(model) && phase === 'idle';

  async function start(skipChecks: boolean) {
    setError(null);
    let result = checks;
    if (!skipChecks) {
      setPhase('checking');
      result = await runPreflight(project.id, environmentId, model);
      setChecks(result);
      // BR-RUN-09: a block stops here; a warning asks before starting.
      if (result.some((c) => c.status !== 'pass')) {
        setPhase('idle');
        return;
      }
    }
    if (!parsed.ok || result?.some((c) => c.status === 'block')) return;
    setPhase('starting');
    try {
      const run = await startRun({ projectId: project.id, testIds, environmentId, browsers, model, forceAi, advanced: parsed.value });
      onClose();
      navigate(to.run(project.id, run.id));
    } catch (e) {
      setError(errorText(e));
      setPhase('idle');
    }
  }

  return (
    <Dialog
      title="Run tests"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {warned && !blocked ? (
            <Button variant="primary" disabled={!canStart} onClick={() => void start(true)}>
              Start anyway
            </Button>
          ) : (
            <Button variant="primary" disabled={!canStart || blocked} onClick={() => void start(false)}>
              {phase === 'checking' ? 'Checking…' : phase === 'starting' ? 'Starting…' : 'Start run'}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-label text-text-muted">Scope</p>
            <p className="font-semibold">{scope}</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              onClose();
              navigate(to.suites(project.id));
            }}
          >
            Change selection
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Environment">
            {(p) => (
              <Select {...p} value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)}>
                {project.environments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="AI model">
            {(p) => (
              <Select {...p} value={model} onChange={(e) => setModel(e.target.value)}>
                <option value={project.defaultModel}>Project default · {project.defaultModel}</option>
                {[...new Set(offered)]
                  .filter((m) => m !== project.defaultModel)
                  .map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-label text-text-muted">Browsers (replays)</legend>
          <div className="flex flex-wrap gap-5">
            {BROWSERS.map((b) => (
              <Checkbox
                key={b}
                label={browserLabels[b]}
                checked={browsers.includes(b)}
                onChange={(e) => setBrowsers(BROWSERS.filter((x) => (x === b ? e.target.checked : browsers.includes(x))))}
              />
            ))}
          </div>
          <p className="mt-1 text-label font-normal text-text-muted">AI runs always use Chrome. A test with a browser preference replays only in the browsers it allows.</p>
          {browsers.length === 0 && <p className="text-label text-failed-text">Choose at least one browser.</p>}
        </fieldset>

        <div className="rounded-card border border-border px-4 py-3">
          {project.settings.visualComparison ? (
            <p>
              <span className="font-semibold">Visual comparison: on</span> · {plural(visual.compared, 'replay')} compared with their previous run
              {visual.excluded > 0 && ` · ${plural(visual.excluded, 'test')} excluded`}
            </p>
          ) : (
            <p>
              <span className="font-semibold">Visual comparison: off</span>
            </p>
          )}
          <Link to={to.projectSettings(project.id)} className="text-label text-accent underline underline-offset-2" onClick={onClose}>
            Project settings
          </Link>
        </div>

        <section aria-labelledby="how-heading" className="rounded-card border border-border">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <h3 id="how-heading" className="font-semibold">
              How each test will run
            </h3>
            <Checkbox label="Force AI for all" checked={forceAi} onChange={(e) => setForceAi(e.target.checked)} />
          </div>
          <div className="relative max-h-72 overflow-auto border-t border-border">
            {plans.status === 'loading' && <LoadingState label="Planning…" />}
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-label text-text-muted">
                  <th scope="col" className="px-4 py-2">
                    Test
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Mode
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Why
                  </th>
                  {showBrowsers && (
                    <th scope="col" className="px-4 py-2">
                      Browsers
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {planList.map((p) => {
                  const t = tests.get(p.testId);
                  return (
                    <tr key={p.testId} className="border-t border-border">
                      <td className="px-4 py-2">
                        {t?.testId} {t?.title}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">{p.notRunReason ? <Chip>Not run</Chip> : <Chip tone={modeChip[p.mode].tone}>{modeChip[p.mode].label}</Chip>}</td>
                      <td className="px-4 py-2 text-text-muted">{p.notRunReason ?? p.reason}</td>
                      {showBrowsers && <td className="px-4 py-2 text-text-muted">{p.browsers.map((b) => browserLabels[b]).join(', ') || '—'}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {runnable === 0 && plans.status === 'ready' && <p className="border-t border-border px-4 py-2 text-failed-text">No test can run with these browsers.</p>}
        </section>

        <details className="rounded-card border border-border">
          <summary className="cursor-pointer px-4 py-3 font-semibold">Advanced</summary>
          <div className="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-2">
            <Checkbox label="Headless (browser hidden)" checked={advanced.headless} onChange={(e) => setAdvanced((a) => ({ ...a, headless: e.target.checked }))} />
            <div className="flex flex-wrap items-start gap-3">
              <Checkbox label="Parallel" checked={advanced.parallel} onChange={(e) => setAdvanced((a) => ({ ...a, parallel: e.target.checked }))} />
              <Field label="Workers" hint="1 to 8" error={parsed.ok ? undefined : parsed.errors.workers} className="w-28">
                {(p) => <Input {...p} inputMode="numeric" disabled={!advanced.parallel} value={advanced.workers} onChange={(e) => setAdvanced((a) => ({ ...a, workers: e.target.value }))} />}
              </Field>
            </div>
            <Field label="Max AI steps per test" error={parsed.ok ? undefined : parsed.errors.maxAiSteps} hint={aiStepsWarning(advanced.maxAiSteps) ? <span className="text-cc-text">{aiStepsWarning(advanced.maxAiSteps)}</span> : '1 to 500'}>
              {(p) => <Input {...p} inputMode="numeric" value={advanced.maxAiSteps} onChange={(e) => setAdvanced((a) => ({ ...a, maxAiSteps: e.target.value }))} />}
            </Field>
            <Field label="Max actions per step" hint="1 to 50" error={parsed.ok ? undefined : parsed.errors.maxActionsPerStep}>
              {(p) => <Input {...p} inputMode="numeric" value={advanced.maxActionsPerStep} onChange={(e) => setAdvanced((a) => ({ ...a, maxActionsPerStep: e.target.value }))} />}
            </Field>
            <p className="text-text-muted sm:col-span-2">
              Browser extension: {project.settings.browserExtensionPath ?? 'none'} (set in Project settings). Defaults come from Project settings › Run defaults.
            </p>
          </div>
        </details>

        <section aria-label="Pre-flight check" className="rounded-card border border-border bg-bg px-4 py-3">
          <p className="text-label text-text-muted">Pre-flight check</p>
          {phase === 'checking' && <LoadingState label="Checking the AI key, the environment and the browser…" />}
          {!checks && phase !== 'checking' && <p className="text-text-muted">When you start, QAI checks the AI key and model, that {project.environments.find((e) => e.id === environmentId)?.name} is reachable, and that the browser launches.</p>}
          {checks && (
            <ul className="mt-1 space-y-1" aria-live="polite">
              {checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  {c.status === 'pass' ? (
                    <CircleCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-passed-dot" />
                  ) : c.status === 'warn' ? (
                    <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-cc-dot" />
                  ) : (
                    <CircleX aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-failed-dot" />
                  )}
                  <span>
                    <span className="sr-only">{c.status === 'pass' ? 'Passed: ' : c.status === 'warn' ? 'Warning: ' : 'Blocked: '}</span>
                    {c.label}
                    {c.detail && <span className="block text-label font-normal text-text-muted">{c.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {blocked && <p className="mt-2 text-failed-text">The run can’t start until this is fixed.</p>}
          {warned && !blocked && <p className="mt-2 text-cc-text">You can start anyway, or change the options above.</p>}
          {phase === 'starting' && (
            <p className="mt-2 flex items-center gap-2 text-text-muted">
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              Starting…
            </p>
          )}
        </section>
        {error && (
          <p role="alert" className="text-failed-text">
            Couldn't start the run: {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
