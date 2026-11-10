import { useRef, useState } from 'react';
import { dismissVisualFlag, getTest, getTestHistory, listRuns, saveTest } from '@/data/api';
import type { ID, Result, Run, TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { StatusLine, errorText, type SaveStatus } from '@/components/StatusLine';
import { AreaOutline, CHANGED_AREA_SPOTS, ScreenshotPlaceholder } from '@/components/Screenshot';
import { BugReportDialog } from '@/components/BugReportDialog';
import { useAsync } from '@/app/hooks/useAsync';
import { browserLabels } from '@/lib/labels';
import { formatDate, plural } from '@/lib/format';
import { clampRect, rectFromCorners, type Rect } from '@/lib/resultRules';

const DEFAULT_RECT: Rect = { x: 0.35, y: 0.35, width: 0.3, height: 0.2 };
/** D64: outline the regions the engine returned; without them, the prototype's placeholder positions. */
const changedOutlines = (v: { changedAreas: number; changedRegions?: { x: number; y: number; w: number; h: number }[] }): Rect[] =>
  v.changedRegions?.length ? v.changedRegions.map((r) => ({ x: r.x, y: r.y, width: r.w, height: r.h })) : CHANGED_AREA_SPOTS.slice(0, v.changedAreas);
const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * 6.2 Visual compare (overlay, screens/07-results.md; BR-VISUAL-*): previous run vs this run for one step, changed areas
 * outlined. Actions: Mark as bug (→ 6.4) · Ignore an area… (draw on this step's screenshot, D45) · Looks fine (D59).
 * `draw` opens straight in drawing mode (Suites › Visual check › Add area / Draw, D45).
 */
export function VisualCompare({
  result,
  run,
  test,
  displayId,
  stepIndex,
  draw,
  onClose,
  onResultChange,
  onTestChange,
}: {
  result: Result;
  run: Run;
  /** null when the test was deleted: ignore areas can't be added. */
  test: TestCase | null;
  displayId: string;
  stepIndex: number;
  draw?: { areaId?: ID; label?: string };
  onClose: () => void;
  onResultChange?: (r: Result) => void;
  onTestChange?: (t: TestCase) => void;
}) {
  const ran = result.steps.filter((s) => s.screenshotId);
  const [index, setIndex] = useState(stepIndex);
  const [current, setCurrent] = useState(result);
  const [currentTest, setCurrentTest] = useState(test);
  const [drawing, setDrawing] = useState<{ areaId?: ID; label: string; rect: Rect } | null>(test && draw ? { ...(draw.areaId ? { areaId: draw.areaId } : {}), label: draw.label ?? '', rect: DEFAULT_RECT } : null);
  const [status, setStatus] = useState<SaveStatus>(null);
  const [bugReport, setBugReport] = useState(false);
  const surface = useRef<HTMLDivElement>(null);

  // Which run the previous screenshot came from (Previous run · Run #9).
  const previous = useAsync(async () => {
    const [history, runs] = await Promise.all([getTestHistory(result.testId), listRuns(run.projectId)]);
    return (screenshotId: ID | undefined) => {
      const r = screenshotId ? history.find((h) => h.steps.some((s) => s.screenshotId === screenshotId)) : undefined;
      return r ? runs.find((x) => x.id === r.runId) : undefined;
    };
  }, [result.testId, run.projectId]);

  const step = current.steps.find((s) => s.index === index) ?? current.steps[0]!;
  const v = step.visual;
  const prevRun = v?.previousScreenshotId && previous.status === 'ready' ? previous.data(v.previousScreenshotId) : undefined;
  const pos = ran.findIndex((s) => s.index === index);
  const browser = browserLabels[current.perBrowser[0]?.browser ?? 'chrome'];
  const ignored = (currentTest?.visual.ignoreAreas ?? []).filter((a) => a.stepIndex === index && a.rect && a.id !== drawing?.areaId);

  async function setLooksFine(dismissed: boolean) {
    try {
      const next = await dismissVisualFlag(current.id, index, dismissed);
      setCurrent(next);
      onResultChange?.(next);
      setStatus({ tone: 'ok', text: dismissed ? 'Marked as looks fine. The flag no longer counts.' : 'The flag is back.' });
    } catch (e) {
      setStatus({ tone: 'error', text: `Couldn't save: ${errorText(e)}` });
    }
  }

  async function saveArea() {
    if (!drawing || !currentTest || !drawing.label.trim()) return;
    const label = drawing.label.trim();
    try {
      const fresh = await getTest(currentTest.id); // never overwrite changes made since this view opened
      const area = { id: drawing.areaId ?? `ia-${crypto.randomUUID().slice(0, 8)}`, stepIndex: index, label, rect: drawing.rect };
      const areas = fresh.visual.ignoreAreas.some((a) => a.id === area.id)
        ? fresh.visual.ignoreAreas.map((a) => (a.id === area.id ? area : a))
        : [...fresh.visual.ignoreAreas, area];
      // Visual settings never create a new version (BR-VERSION-01).
      const saved = await saveTest({ ...fresh, visual: { ...fresh.visual, ignoreAreas: areas } });
      setCurrentTest(saved);
      onTestChange?.(saved);
      setDrawing(null);
      setStatus({ tone: 'ok', text: `Ignoring “${label}” on step ${index} from the next comparison.` });
    } catch (e) {
      setStatus({ tone: 'error', text: `Couldn't save: ${errorText(e)}` });
    }
  }

  const pointAt = (e: React.PointerEvent) => {
    const box = surface.current!.getBoundingClientRect();
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height };
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawing) return;
    e.preventDefault();
    const start = pointAt(e);
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => setDrawing((d) => d && { ...d, rect: rectFromCorners(start, pointAt(ev as unknown as React.PointerEvent)) });
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    setDrawing((d) => d && { ...d, rect: rectFromCorners(start, start) });
  };
  const onAreaKey = (e: React.KeyboardEvent) => {
    if (!drawing) return;
    const d = e.altKey ? 0.01 : 0.05;
    const delta = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
    if (!delta) return;
    e.preventDefault();
    const r = drawing.rect;
    const next = e.shiftKey ? { ...r, width: r.width + delta[0]!, height: r.height + delta[1]! } : { ...r, x: r.x + delta[0]!, y: r.y + delta[1]! };
    setDrawing({ ...drawing, rect: clampRect(next) });
  };

  return (
    <>
      <Dialog title={`Step ${index} of ${current.steps.length} · ${step.text}`} size="lg" onClose={onClose}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-label font-normal text-text-muted">
            {displayId} · Run #{run.number} · {browser} {run.viewport.width}×{run.viewport.height}
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={pos <= 0 || !!drawing} onClick={() => setIndex(ran[pos - 1]!.index)}>
              Previous step
            </Button>
            <Button size="sm" disabled={pos < 0 || pos >= ran.length - 1 || !!drawing} onClick={() => setIndex(ran[pos + 1]!.index)}>
              Next step
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!v?.previousScreenshotId ? (
            <Chip>No previous run to compare</Chip>
          ) : v.changedAreas === 0 ? (
            <Chip tone="passed">No change since the previous run</Chip>
          ) : (
            <Chip tone="cc">{plural(v.changedAreas, 'area')} changed since the previous run</Chip>
          )}
          {v?.dismissed && (
            <>
              <Chip tone="passed">
                Looks fine · {v.dismissed.by} · {formatDate(v.dismissed.at)}
              </Chip>
              <Button size="sm" variant="ghost" onClick={() => void setLooksFine(false)}>
                Undo<span className="sr-only"> looks fine</span>
              </Button>
            </>
          )}
        </div>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <figure>
            <figcaption className="mb-1 text-label">Previous run{prevRun ? ` · Run #${prevRun.number}` : ''}</figcaption>
            {v?.previousScreenshotId ? <ScreenshotPlaceholder caption={`Screenshot · Run #${prevRun?.number ?? ''} · step ${index}`} /> : <ScreenshotPlaceholder caption="No previous run to compare" />}
          </figure>
          <figure>
            <figcaption className="mb-1 text-label">This run · Run #{run.number}</figcaption>
            <div ref={surface} onPointerDown={onPointerDown} className={drawing ? 'relative cursor-crosshair touch-none select-none' : 'relative'}>
              <ScreenshotPlaceholder caption={v && v.changedAreas > 0 ? `Screenshot with ${plural(v.changedAreas, 'changed area')} outlined` : `Screenshot · Run #${run.number} · step ${index}`}>
                {v && !v.dismissed && changedOutlines(v).map((r, i) => <AreaOutline key={i} rect={r} label={`Change ${i + 1}`} tone="changed" />)}
                {ignored.map((a) => (
                  <AreaOutline key={a.id} rect={a.rect!} label={`Ignored: ${a.label}`} tone="ignored" />
                ))}
              </ScreenshotPlaceholder>
              {drawing && (
                <div
                  tabIndex={0}
                  role="group"
                  aria-roledescription="area"
                  aria-label={`Area to ignore: left ${pct(drawing.rect.x)}, top ${pct(drawing.rect.y)}, width ${pct(drawing.rect.width)}, height ${pct(drawing.rect.height)}. Arrow keys move it, Shift and arrow keys resize it.`}
                  onKeyDown={onAreaKey}
                  className="absolute rounded-sm border-2 border-accent bg-accent-soft opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ left: pct(drawing.rect.x), top: pct(drawing.rect.y), width: pct(drawing.rect.width), height: pct(drawing.rect.height) }}
                >
                  <span className="p-0.5 text-[11px] text-accent-soft-text">{drawing.label || 'New area'}</span>
                </div>
              )}
            </div>
          </figure>
        </div>

        {drawing ? (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-card border border-border p-3">
            <Field label="Area name" required className="min-w-[240px] flex-1" hint="Drag on this run's screenshot to draw it. Keyboard: focus the area, arrow keys move it, Shift + arrow keys resize it.">
              {(p) => <Input {...p} value={drawing.label} onChange={(e) => setDrawing({ ...drawing, label: e.target.value })} data-autofocus />}
            </Field>
            <div className="flex gap-2 pb-6">
              <Button onClick={() => setDrawing(null)}>Cancel</Button>
              <Button variant="primary" disabled={!drawing.label.trim()} onClick={() => void saveArea()}>
                Save area
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-label font-normal text-text-muted">A visual change is a flag, never a failure. Ignored areas are not compared.</p>
          {!drawing && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setBugReport(true)}>Mark as bug</Button>
              <Button disabled={!currentTest} title={currentTest ? undefined : 'The test was deleted'} onClick={() => setDrawing({ label: '', rect: DEFAULT_RECT })}>
                Ignore an area…
              </Button>
              {v && v.changedAreas > 0 && !v.dismissed && (
                <Button variant="primary" onClick={() => void setLooksFine(true)}>
                  Looks fine
                </Button>
              )}
            </div>
          )}
        </div>
        <StatusLine status={status} />
      </Dialog>
      {bugReport && <BugReportDialog items={[{ resultId: current.id, label: displayId, visualStepIndex: index }]} onClose={() => setBugReport(false)} />}
    </>
  );
}
