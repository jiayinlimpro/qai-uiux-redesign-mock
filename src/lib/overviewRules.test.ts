import { createSeed } from '@/data/mock/seed';
import { barScale, CHART_STATUSES, lastCompletedRun, needsAttention, notInASuiteCount, passRateDonut, recentRuns, resumeBannerText, runToResume, suiteRows, totalCounts } from './overviewRules';
import { isLibraryTest } from './exploreRules';

const db = createSeed();
const P = 'p-qcfixer';
const runs = db.runs.filter((r) => r.projectId === P);
const library = db.tests.filter((t) => t.projectId === P && isLibraryTest(t));
const latest = (() => {
  const number = new Map(runs.map((r) => [r.id, r.number]));
  const out: Record<string, (typeof db.results)[number]> = {};
  for (const r of db.results) {
    const prev = out[r.testId];
    if (!prev || (number.get(r.runId) ?? 0) > (number.get(prev.runId) ?? 0)) out[r.testId] = r;
  }
  return out;
})();

describe('Overview (screens/02-project.md 1.4), computed from library tests', () => {
  it('resume banner: the newest Interrupted / Paused run that was not stopped (BR-RUN-10)', () => {
    const r = runToResume(runs)!;
    expect(r.number).toBe(13);
    expect(resumeBannerText(r)).toBe('Run #13 was interrupted at test 34 of 83 · All tests · UAT');
    expect(runToResume(runs.map((x) => (x.number === 13 ? { ...x, stoppedAt: { done: 34, total: 83, at: 'x' }, state: 'completed' as const } : x)))).toBeUndefined();
  });

  it('last completed run and its Needs attention counts', () => {
    const last = lastCompletedRun(runs)!;
    expect(last.number).toBe(12);
    const n = needsAttention(last, db.results.filter((r) => r.runId === last.id));
    expect(n).toMatchObject({ count: 11, worthALook: 3 });
    expect(n.counts).toMatchObject({ passed: 72, failed: 8, couldnt_complete: 3 });
  });

  it('New from AI explore: library tests not in a suite (tray cases do not count)', () => {
    expect(notInASuiteCount(library)).toBe(2);
    expect(notInASuiteCount(db.tests.filter((t) => t.projectId === P))).toBe(7); // the 5 tray cases would wrongly count
  });

  it('suites table: 12 suites alphabetically then Not in a suite; latest status counts and last run', () => {
    const rows = suiteRows(db.suites.filter((s) => s.projectId === P), library, latest, runs);
    expect(rows).toHaveLength(13);
    expect(rows.at(-1)!.name).toBe('Not in a suite');
    expect(rows.at(-1)!.counts.not_run).toBe(2);
    expect(rows.reduce((n, r) => n + r.testIds.length, 0)).toBe(85);
    const nav = rows.find((r) => r.name === '01 Navigation')!;
    expect(nav.counts).toMatchObject({ passed: 15 });
    expect(nav.lastRun?.number).toBe(13);
    const cnt = rows.find((r) => r.name === '09 Contact Us')!;
    expect(cnt.lastRun?.number).toBe(14);
  });

  it('recent runs: newest first', () => {
    expect(recentRuns(runs).map((r) => r.number)).toEqual([14, 13, 12]);
  });

  it('charts (D77): totals are the Suites table counts; donut ring = 3 statuses, figure = BR-STATUS-02 pass rate', () => {
    const rows = suiteRows(db.suites.filter((s) => s.projectId === P), library, latest, runs);
    const total = totalCounts(rows);
    expect(total.passed + total.failed + total.couldnt_complete + total.not_run).toBe(library.length);
    const d = passRateDonut(total);
    expect(d.drawn).toBe(total.passed + total.failed + total.couldnt_complete);
    expect(d.notRun).toBe(total.not_run);
    expect(d.rate).toBeCloseTo(total.passed / (total.passed + total.failed));
    expect(d.segments.map((s) => s.status)).toEqual(['couldnt_complete', 'failed', 'passed'].filter((k) => total[k as keyof typeof total] > 0));
    expect(d.segments[0]!.from).toBe(0);
    expect(d.segments.at(-1)!.to).toBeCloseTo(1);
    expect(CHART_STATUSES).not.toContain('not_run');
    expect(barScale(rows)).toBe(Math.max(...rows.map((r) => r.counts.passed + r.counts.failed + r.counts.couldnt_complete)));
  });

  it("donut: couldn't complete and not run never lower the pass rate; empty statuses get no arc; nothing rated → null", () => {
    const d = passRateDonut({ passed: 3, failed: 1, couldnt_complete: 4, not_run: 9 });
    expect(d.rate).toBe(0.75);
    expect(d.segments).toEqual([
      { status: 'couldnt_complete', count: 4, from: 0, to: 0.5 },
      { status: 'failed', count: 1, from: 0.5, to: 0.625 },
      { status: 'passed', count: 3, from: 0.625, to: 1 },
    ]);
    expect(passRateDonut({ passed: 2, failed: 0, couldnt_complete: 0, not_run: 1 }).segments).toHaveLength(1);
    const none = passRateDonut({ passed: 0, failed: 0, couldnt_complete: 2, not_run: 5 });
    expect(none.rate).toBeNull();
    expect(none.drawn).toBe(2);
    expect(barScale([{ counts: { passed: 0, failed: 0, couldnt_complete: 0, not_run: 4 } }])).toBe(1);
  });
});
