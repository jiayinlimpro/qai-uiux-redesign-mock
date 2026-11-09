/**
 * Mock run engine (prototype only): drives running runs with a timer, step by step, and writes results like a real run
 * would. Developers replace it with the real engine; api.ts is the only caller.
 *
 * Simulated outcome ("the app has not changed"): a test repeats its last failure / couldn't-complete; a never-run
 * Likely bug test fails (the run confirms the finding); everything else passes.
 */
import type { Browser, ID, Result, ResultStep, Run, Status, TestCase } from '../types';
import { planTest, type TestPlan } from '@/lib/runPlan';
import { sumCost } from '@/lib/status';
import { deriveSteps, SEED_RUN_PACE } from './seed';
import { getDb, mutate } from './store';

export interface Narration {
  runId: ID;
  testId: ID;
  displayId: string;
  title: string;
  mode: TestPlan['mode'];
  step: number;
  stepCount: number;
  stepText: string;
  doing: string;
  why: string;
  checks: { text: string; status: 'passed' | 'waiting' }[];
  aiSteps?: { used: number; max: number };
  reasoning: string;
  url: string;
  browser: Browser;
}

export type EngineEvent = { kind: 'progress'; run: Run } | { kind: 'narration'; narration: Narration } | { kind: 'result'; result: Result };

interface Active {
  testId: ID;
  plan: TestPlan;
  steps: string[];
  step: number; // 0-based current step
  ticksInStep: number;
  /** Timer ticks since the test started (drives the narration's "Doing" line on paced runs). */
  beats: number;
  aiSteps: number;
  version: number;
  startedMs: number;
}
interface RunMemory {
  active: Active[];
  /** Timer ticks seen by this run; a paced run advances once every `pace` ticks. */
  beat: number;
}

/** Ticks per work tick: 1 for normal runs; seeded demo runs can be slower (SEED_RUN_PACE). */
const paceOf = (runId: ID) => SEED_RUN_PACE[runId] ?? 1;

const memory = new Map<ID, RunMemory>();
const listeners = new Map<ID, Set<(e: EngineEvent) => void>>();
let timer: ReturnType<typeof setInterval> | null = null;
let tickMs = 500;

/** Tests: speed up or slow down the simulated run (ms per tick). */
export function setMockRunSpeed(ms: number): void {
  tickMs = ms;
  if (timer) {
    clearInterval(timer);
    timer = null;
    ensureEngine();
  }
}

export function subscribe(runId: ID, cb: (e: EngineEvent) => void): () => void {
  const set = listeners.get(runId) ?? new Set();
  set.add(cb);
  listeners.set(runId, set);
  ensureEngine();
  return () => set.delete(cb);
}

function emit(runId: ID, e: EngineEvent): void {
  for (const cb of listeners.get(runId) ?? []) cb(structuredClone(e));
}

/** Start the timer while any run is running (also after a reload: the run continues). */
export function ensureEngine(): void {
  if (timer || typeof setInterval === 'undefined') return;
  if (!getDb().runs.some((r) => r.state === 'running')) return;
  timer = setInterval(tick, tickMs);
}

const intentSteps = (t: TestCase): string[] => (t.steps.length > 1 ? t.steps : deriveSteps(t.steps[0] ?? ''));
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const aiCost = (key: string) => Math.round(5 + (hash(key) % 20)) / 100; // $0.05–$0.24
const ticksPerStep = (mode: TestPlan['mode'], step: number) => (mode === 'script' ? 1 : step === 0 && mode === 'data_rows' ? 3 : mode === 'data_rows' ? 1 : 3);
const quoted = (text: string) => text.match(/'([^']{2,40})'/)?.[1];

function runNumberOf(id: ID): number | undefined {
  return getDb().runs.find((r) => r.id === id)?.number;
}

function remainingTests(run: Run, mem: RunMemory): ID[] {
  const done = new Set(getDb().results.filter((r) => r.runId === run.id).map((r) => r.testId));
  const active = new Set(mem.active.map((a) => a.testId));
  return run.testIds.filter((id) => !done.has(id) && !active.has(id));
}

function startTest(run: Run, testId: ID): Active | null {
  const test = getDb().tests.find((t) => t.id === testId);
  if (!test) return null;
  const plan = planTest(test, { forceAi: run.forceAi, browsers: run.browsers, runNumber: runNumberOf });
  return { testId, plan, steps: intentSteps(test), step: 0, ticksInStep: 0, beats: 0, aiSteps: 0, version: test.version, startedMs: 0 };
}

function tick(): void {
  const running = getDb().runs.filter((r) => r.state === 'running');
  if (running.length === 0) {
    if (timer) clearInterval(timer);
    timer = null;
    return;
  }
  for (const run of running) tickRun(run.id);
}

function tickRun(runId: ID): void {
  const run = getDb().runs.find((r) => r.id === runId);
  if (!run || run.state !== 'running') return;
  const mem = memory.get(runId) ?? { active: [], beat: 0 };
  memory.set(runId, mem);
  const workers = run.advanced?.parallel ? Math.max(1, run.advanced.workers) : 1; // BR-RUN-04

  // Fill free workers; tests with no allowed browser are Not run straight away (D53).
  const fill = () => {
    for (const next of remainingTests(run, mem)) {
      if (mem.active.length >= workers) break;
      const a = startTest(run, next);
      if (!a) continue;
      if (a.plan.notRunReason) {
        finish(run.id, a, 'not_run', a.plan.notRunReason);
        continue;
      }
      mem.active.push(a);
    }
  };
  fill();

  mem.beat++;
  const advance = mem.beat % paceOf(runId) === 0;
  for (const a of [...mem.active]) {
    a.startedMs += tickMs;
    a.beats++;
    if (!advance) continue;
    a.ticksInStep++;
    if (a.plan.mode !== 'script') a.aiSteps++;
    if (a.ticksInStep >= ticksPerStep(a.plan.mode, a.step)) {
      a.step++;
      a.ticksInStep = 0;
    }
    if (a.step >= a.steps.length) {
      mem.active = mem.active.filter((x) => x !== a);
      finish(run.id, a);
    }
  }
  fill(); // the next test starts at once, so the narration never shows a test that has ended

  const fresh = mutate((db) => {
    const r = db.runs.find((x) => x.id === runId)!;
    r.durationMs = (r.durationMs ?? 0) + tickMs;
    r.progress.currentTestId = mem.active[0]?.testId;
    if (!r.progress.currentTestId) delete r.progress.currentTestId;
    if (mem.active.length === 0 && remainingTests(r, mem).length === 0) {
      r.state = 'completed';
      r.finishedAt = new Date().toISOString();
      delete r.progress.currentTestId;
    }
    return structuredClone(r);
  });
  emit(runId, { kind: 'progress', run: fresh });
  const shown = mem.active[0];
  if (shown && fresh.state === 'running') emit(runId, { kind: 'narration', narration: narrate(fresh, shown) });
  if (fresh.state !== 'running') memory.delete(runId);
}

function narrate(run: Run, a: Active): Narration {
  const test = getDb().tests.find((t) => t.id === a.testId)!;
  const stepText = a.steps[Math.min(a.step, a.steps.length - 1)] ?? '';
  const target = quoted(stepText);
  const phase = (paceOf(run.id) > 1 ? Math.floor(a.beats / 6) : a.ticksInStep) % 3;
  const doing =
    a.plan.mode === 'script'
      ? `Replaying the recorded actions for step ${a.step + 1}`
      : phase === 0
        ? 'Reading the page'
        : phase === 1 && target
          ? `Looking for ‘${target}’`
          : target && /click|open|choose|select/i.test(stepText)
            ? `Clicking ‘${target}’`
            : 'Checking what the step asks for';
  const app = run.environment.apps.find((x) => x.url);
  return {
    runId: run.id,
    testId: a.testId,
    displayId: test.testId,
    title: test.title,
    mode: a.plan.mode,
    step: a.step + 1,
    stepCount: a.steps.length,
    stepText,
    doing,
    why: `The step asks: ${stepText.length > 110 ? `${stepText.slice(0, 110)}…` : stepText}`,
    checks: a.steps.slice(0, a.step + 1).map((s, i) => ({ text: `Step ${i + 1}: ${s.length > 60 ? `${s.slice(0, 60)}…` : s.replace(/\.$/, '')}`, status: i < a.step ? 'passed' : 'waiting' })),
    ...(a.plan.mode !== 'script' ? { aiSteps: { used: a.aiSteps, max: run.advanced?.maxAiSteps ?? 40 } } : {}),
    reasoning: `I am on step ${a.step + 1} of ${a.steps.length}. ${doing}. When the page matches what the step describes, I move to the next step; if it does not, I record what I found.`,
    url: app?.url ?? 'No URL for this environment',
    browser: a.plan.browsers.includes('chrome') || a.plan.mode !== 'script' ? 'chrome' : a.plan.browsers[0]!,
  };
}

/** Previous result of this test before this run (the "app has not changed" outcome comes from it). */
function previousResult(testId: ID, runNumber: number): Result | undefined {
  const db = getDb();
  const number = new Map(db.runs.map((r) => [r.id, r.number]));
  return db.results
    .filter((r) => r.testId === testId && (number.get(r.runId) ?? 0) < runNumber && r.status !== 'not_run')
    .sort((x, y) => (number.get(y.runId) ?? 0) - (number.get(x.runId) ?? 0))[0];
}

/** Write the result of a test that ended (finished, skipped, or not run). */
function finish(runId: ID, a: Active, forced?: 'not_run', note?: string): void {
  const result = mutate((db) => {
    const run = db.runs.find((r) => r.id === runId)!;
    const test = db.tests.find((t) => t.id === a.testId)!;
    const prev = previousResult(test.id, run.number);
    let status: Status = 'passed';
    let reason: Result['reason'];
    let failure: Result['failure'];
    if (forced) status = 'not_run';
    else if (prev && (prev.status === 'failed' || prev.status === 'couldnt_complete')) {
      status = prev.status;
      reason = prev.reason;
      failure = prev.failure;
    } else if (!prev && test.aiExploreFinding?.kind === 'likely_bug') {
      status = 'failed';
      reason = 'product_bug';
      failure = { stepIndex: a.steps.length, expected: test.expectedResult ?? 'What the test expects', found: 'The page did not do this' };
    }
    const stopAt = status === 'passed' ? a.steps.length + 1 : forced ? Math.min(a.step + 1, a.steps.length) : Math.min(failure?.stepIndex ?? a.steps.length, a.steps.length);
    const scriptFrom = test.script.fromRunId ? (db.runs.find((r) => r.id === test.script.fromRunId)?.number ?? 0) : 0;
    const prevReplay = a.plan.mode === 'script' && !test.visual.excluded ? previousReplay(db, test.id, run, scriptFrom) : undefined;
    const steps: ResultStep[] = a.steps.map((text, i) => {
      const index = i + 1;
      const s: Status = forced ? (index <= a.step ? 'passed' : 'not_run') : index < stopAt ? 'passed' : index === stopAt ? status : 'not_run';
      const ran = s !== 'not_run';
      const step: ResultStep = {
        index,
        text,
        status: s,
        durationMs: ran ? tickMs * ticksPerStep(a.plan.mode, i) : 0,
        actions: ran ? [{ text: a.plan.mode === 'script' ? 'Replayed the recorded actions' : `Did what the step asks: ${text.slice(0, 80)}`, raw: a.plan.mode === 'script' ? 'replay()' : 'act()' }] : [],
        ...(ran ? { screenshotId: `shot-${run.number}-${test.testId.toLowerCase()}-${index}` } : {}),
      };
      if (!forced && index === stopAt && failure) step.check = { expected: failure.expected, found: failure.found, ok: false };
      if (ran && prevReplay) step.visual = { previousScreenshotId: prevReplay.steps[i]?.screenshotId ?? `shot-prev-${index}`, changedAreas: 0 };
      return step;
    });
    const usedRows = test.testData?.rows.filter((r) => r.use) ?? [];
    const browsers = a.plan.browsers;
    const perBrowser = browsers.map((browser) => ({
      browser,
      // BR-RUN-03: AI runs use Chrome; other browsers replay only if the AI run passed.
      status: status === 'not_run' ? ('not_run' as Status) : a.plan.mode === 'script' || browser === 'chrome' || status === 'passed' ? status : ('not_run' as Status),
    }));
    const replayCost = 0.02;
    const cost = forced
      ? a.plan.mode === 'script'
        ? 0
        : sumCost([aiCost(`${run.id}${test.id}`) * Math.min(1, a.step / Math.max(1, a.steps.length))]).valueOf()
      : a.plan.mode === 'script'
        ? sumCost(browsers.map(() => replayCost))
        : a.plan.mode === 'data_rows'
          ? sumCost([test.script.state === 'recorded' && !run.forceAi ? replayCost : aiCost(`${run.id}${test.id}`), ...usedRows.slice(1).map(() => replayCost)])
          : sumCost([aiCost(`${run.id}${test.id}`), ...browsers.filter((b) => b !== 'chrome' && status === 'passed').map(() => replayCost)]);
    const r: Result = {
      id: `res-${run.number}-${test.testId.toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`,
      runId,
      testId: test.id,
      testSnapshot: { testId: test.testId, title: test.title },
      testVersion: a.version,
      mode: a.plan.mode,
      status,
      ...(reason ? { reason } : {}),
      aiVerdict: { status, ...(reason ? { reason } : {}), confidence: 'high' },
      perBrowser,
      ...(a.plan.mode === 'data_rows' && !forced ? { dataRows: usedRows.map((row) => ({ rowId: row.id, status: row.index === 1 ? status : ('passed' as Status) })) } : {}),
      ...(failure && !forced ? { failure } : {}),
      steps,
      cost: Math.round(cost * 100) / 100,
      durationMs: a.startedMs,
      flags: {},
      ...(note ? { note } : {}),
    };
    db.results.push(r);
    run.progress.done = db.results.filter((x) => x.runId === runId).length;
    run.cost = sumCost(db.results.filter((x) => x.runId === runId).map((x) => x.cost));
    // BR-SCRIPT-01: a script is only created from a passing AI run.
    if (!forced && a.plan.mode !== 'script' && !(a.plan.mode === 'data_rows' && test.script.state === 'recorded' && !run.forceAi)) {
      if (status === 'passed') test.script = { state: 'recorded', fromRunId: run.id };
      else if (status === 'failed') test.script = { state: 'failed_ai' };
    }
    return r;
  });
  emit(runId, { kind: 'result', result });
}

/** BR-VISUAL-02/05: the previous replay of this test on the same environment, after its script was recorded. */
function previousReplay(db: ReturnType<typeof getDb>, testId: ID, run: Run, scriptFromNumber: number): Result | undefined {
  const number = new Map(db.runs.map((r) => [r.id, r.number]));
  const env = new Map(db.runs.map((r) => [r.id, r.environmentId]));
  return db.results
    .filter((r) => r.testId === testId && r.mode === 'script' && env.get(r.runId) === run.environmentId && (number.get(r.runId) ?? 0) < run.number && (number.get(r.runId) ?? 0) >= scriptFromNumber)
    .sort((x, y) => (number.get(y.runId) ?? 0) - (number.get(x.runId) ?? 0))[0];
}

// ---------- controls ----------
export function pause(runId: ID): void {
  mutate((db) => {
    const r = db.runs.find((x) => x.id === runId);
    if (r && r.state === 'running') r.state = 'paused';
  });
  emitProgress(runId);
}

export function resume(runId: ID): void {
  mutate((db) => {
    const r = db.runs.find((x) => x.id === runId);
    if (r && (r.state === 'paused' || r.state === 'interrupted') && !r.stoppedAt) {
      r.state = 'running';
      delete r.pauseReason;
    }
  });
  emitProgress(runId);
  ensureEngine();
}

/** BR-RUN-15 / D55: Stop → Completed with stoppedAt; the remaining tests are Not run; it cannot be resumed. */
export function stop(runId: ID): void {
  memory.delete(runId);
  mutate((db) => {
    const r = db.runs.find((x) => x.id === runId);
    if (!r || r.state === 'completed') return;
    r.state = 'completed';
    r.stoppedAt = { done: r.progress.done, total: r.progress.total, at: new Date().toISOString() };
    r.finishedAt = r.stoppedAt.at;
    delete r.progress.currentTestId;
    delete r.pauseReason;
  });
  emitProgress(runId);
}

/** BR-RUN-14 / D54: Skip test → the current test ends as Not run "Skipped by user"; the run continues. */
export function skip(runId: ID, testId: ID): void {
  const mem = memory.get(runId);
  const a = mem?.active.find((x) => x.testId === testId);
  if (!mem || !a) return;
  mem.active = mem.active.filter((x) => x !== a);
  finish(runId, a, 'not_run', 'Skipped by user');
  const run = getDb().runs.find((r) => r.id === runId);
  if (run?.state === 'running') {
    // Start the next test now so the narration moves on straight away.
    const next = remainingTests(run, mem)[0];
    const b = next ? startTest(run, next) : null;
    if (b && !b.plan.notRunReason) {
      mem.active.push(b);
      mutate((db) => {
        db.runs.find((r) => r.id === runId)!.progress.currentTestId = b.testId;
      });
      emit(runId, { kind: 'narration', narration: narrate(getDb().runs.find((r) => r.id === runId)!, b) });
    }
  }
  emitProgress(runId);
}

function emitProgress(runId: ID): void {
  const r = getDb().runs.find((x) => x.id === runId);
  if (r) emit(runId, { kind: 'progress', run: structuredClone(r) });
}
