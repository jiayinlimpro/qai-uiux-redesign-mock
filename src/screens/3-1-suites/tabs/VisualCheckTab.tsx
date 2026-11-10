import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { getTestHistory } from '@/data/api';
import type { TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { StatusLine, errorText, type SaveStatus } from '@/components/StatusLine';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { plural } from '@/lib/format';
import { latestComparison } from '@/lib/suiteRules';
import { VisualCompare } from '@/components/VisualCompare';
import { useSuites } from '../suitesContext';
import type { SaveTest } from '../TestDetail';

/**
 * Visual check tab (screens/04-suites.md, BR-VISUAL-*): project on/off · Exclude this test · latest comparison
 * (Step · No change / n areas changed / No previous run · Compare) · Ignore areas · Pin a reference (Later, display only).
 * Visual settings never create a new version.
 */
export function VisualCheckTab({ test, save }: { test: TestCase; save: SaveTest }) {
  const project = useProject();
  const s = useSuites();
  const history = useAsync(() => getTestHistory(test.id), [test.id, test.updatedAt]);
  const [status, setStatus] = useState<SaveStatus>(null);
  const [adding, setAdding] = useState(false);
  // 6.2 Visual compare on a step of the latest comparison; `draw` opens it to draw an ignore area (D45).
  const [compare, setCompare] = useState<{ stepIndex: number; draw?: { areaId: string; label: string } } | null>(null);
  const on = project.settings.visualComparison;

  const comparison = history.status === 'ready' ? latestComparison(history.data, s.runs) : null;
  const stepNames = comparison ? comparison.result.steps.map((st) => st.text) : test.steps;
  /** A step can be drawn on when the latest comparison has its screenshot. */
  const drawable = (stepIndex: number) => Boolean(comparison?.result.steps.find((st) => st.index === stepIndex)?.screenshotId);

  async function apply(change: (t: TestCase) => TestCase, text: string) {
    try {
      await save(change);
      setStatus({ tone: 'ok', text });
    } catch (e) {
      setStatus({ tone: 'error', text: `Couldn't save: ${errorText(e)}` });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-start justify-between gap-x-3 rounded-card border border-border bg-surface p-4">
        <div>
          <h3 className="font-semibold">Visual comparison: {on ? 'on' : 'off'} for this project</h3>
          <p className="text-label font-normal text-text-muted">
            {on ? 'Each script replay is compared with the previous run at the end of every step. Changes are flagged, never failed.' : 'Screenshots are not compared.'} Set in{' '}
            <Link to={to.projectSettings(project.id)} className="text-accent underline underline-offset-2">
              Project settings
            </Link>
            .
          </p>
        </div>
        <Checkbox
          label="Exclude this test"
          checked={test.visual.excluded}
          disabled={!on}
          onChange={(e) => {
            const excluded = e.target.checked;
            void apply((t) => ({ ...t, visual: { ...t.visual, excluded } }), excluded ? 'This test is excluded from visual comparison.' : 'This test is compared again.');
          }}
        />
        <div className="w-full">
          <StatusLine status={status} />
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface">
        {history.status === 'loading' && <LoadingState label="Loading comparison…" />}
        {history.status === 'error' && <ErrorState title="Couldn't load the comparison" message={history.error.message} onRetry={history.retry} />}
        {history.status === 'ready' && !comparison && (
          <p className="p-4 text-text-muted">No comparison yet: screenshots are compared on script replays, and this test hasn’t been replayed.</p>
        )}
        {comparison && (
          <>
            <h3 className="p-4 font-semibold">
              Latest comparison · Run #{comparison.run.number}
              {comparison.previousRun ? ` vs Run #${comparison.previousRun.number}` : ''} · {comparison.run.environment.name}
            </h3>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-y border-border text-label text-text-muted">
                  <th scope="col" className="px-4 py-2">
                    Step
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Result
                  </th>
                  <th scope="col" className="px-4 py-2">
                    <span className="sr-only">Compare</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.result.steps.map((st) => {
                  const v = st.visual;
                  return (
                    <tr key={st.index} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2">
                        {st.index}. {st.text}
                      </td>
                      <td className="px-4 py-2">
                        {!v || !v.previousScreenshotId ? (
                          <Chip>No previous run</Chip>
                        ) : v.changedAreas === 0 ? (
                          <Chip tone="passed">No change</Chip>
                        ) : (
                          <Chip tone="cc">{plural(v.changedAreas, 'area')} changed</Chip>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {st.screenshotId ? (
                          <Button size="sm" variant="ghost" className="text-accent underline underline-offset-2" onClick={() => setCompare({ stepIndex: st.index })}>
                            Compare<span className="sr-only"> step {st.index}</span>
                          </Button>
                        ) : (
                          <Link to={to.run(project.id, comparison.run.id, comparison.result.id)} className="text-accent underline underline-offset-2">
                            Open result<span className="sr-only"> of step {st.index}</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Ignored areas</h3>
          <Button size="sm" onClick={() => setAdding(true)}>
            Add area
          </Button>
        </div>
        <p className="text-label font-normal text-text-muted">Parts of a step’s screenshot left out of the comparison, e.g. rotating banners or counters.</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {test.visual.ignoreAreas.length === 0 && <li className="text-text-muted">None</li>}
          {test.visual.ignoreAreas.map((a) => (
            <li key={a.id}>
              <Chip>
                Step {a.stepIndex} · {a.label}
                {!a.rect && <span className="ml-1 text-cc-text">· Not drawn yet</span>}
                {!a.rect && drawable(a.stepIndex) && (
                  <button type="button" className="ml-1 font-semibold text-accent underline underline-offset-2" onClick={() => setCompare({ stepIndex: a.stepIndex, draw: { areaId: a.id, label: a.label } })}>
                    Draw<span className="sr-only"> {a.label}</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ignored area ${a.label}`}
                  className="ml-1 rounded-pill hover:text-text"
                  onClick={() =>
                    void apply((t) => ({ ...t, visual: { ...t.visual, ignoreAreas: t.visual.ignoreAreas.filter((x) => x.id !== a.id) } }), `Removed ${a.label}.`)
                  }
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </Chip>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-border p-4">
        <div>
          <h3 className="font-semibold">
            Pin a reference <Chip className="ml-1">Later · low priority</Chip>
          </h3>
          <p className="text-label font-normal text-text-muted">Optional: keep a signed-off look (e.g. after a release) to also compare against.</p>
        </div>
        <Button size="sm" disabled>
          Pin{comparison ? ` Run #${comparison.run.number}` : ''}
        </Button>
      </section>

      {adding && (
        <AddAreaDialog
          steps={stepNames}
          onClose={() => setAdding(false)}
          onAdd={(stepIndex, label) => {
            setAdding(false);
            const id = `ia-${crypto.randomUUID().slice(0, 8)}`;
            // D45: the area is saved first ("Not drawn yet"), then drawn on the step's screenshot in Visual compare.
            void apply(
              (t) => ({ ...t, visual: { ...t.visual, ignoreAreas: [...t.visual.ignoreAreas, { id, stepIndex, label }] } }),
              drawable(stepIndex) ? `Added ${label}. Draw it on the screenshot.` : `Added ${label} on step ${stepIndex}. It can be drawn after the test's next script replay.`,
            ).then(() => drawable(stepIndex) && setCompare({ stepIndex, draw: { areaId: id, label } }));
          }}
        />
      )}
      {compare && comparison && (
        <VisualCompare
          result={comparison.result}
          run={comparison.run}
          test={test}
          displayId={test.testId}
          stepIndex={compare.stepIndex}
          {...(compare.draw ? { draw: compare.draw } : {})}
          onClose={() => setCompare(null)}
          onResultChange={() => s.reload()}
          onTestChange={() => s.reload()}
        />
      )}
    </div>
  );
}

/** Add an ignore area: step + name (D45). It is saved "Not drawn yet", then Visual compare (6.2) opens on that step to draw it. */
function AddAreaDialog({ steps, onClose, onAdd }: { steps: string[]; onClose: () => void; onAdd: (stepIndex: number, label: string) => void }) {
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState('');
  return (
    <Dialog
      title="Add ignored area"
      size="sm"
      onClose={onClose}
      onSubmit={() => label.trim() && onAdd(step, label.trim())}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!label.trim()}>
            Add area
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Step">
          {(p) => (
            <Select {...p} value={step} onChange={(e) => setStep(Number(e.target.value))}>
              {steps.map((st, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}. {st.length > 70 ? `${st.slice(0, 70)}…` : st}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Area name" required hint="e.g. Hero rotating word">
          {(p) => <Input {...p} value={label} onChange={(e) => setLabel(e.target.value)} />}
        </Field>
        <p className="text-label font-normal text-text-muted">
          The area is drawn on that step’s screenshot in Visual compare. Until then it shows “Not drawn yet” and nothing is left out of the comparison.
        </p>
      </div>
    </Dialog>
  );
}
