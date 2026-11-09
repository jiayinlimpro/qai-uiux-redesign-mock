/**
 * Suites rules (screens/04-suites.md): list order and filters (BR-LIST-01), test IDs (BR-TEST-01), clone (BR-CLONE),
 * move (BR-TEST-05), suites (BR-SUITE), and what a saved change does to version and script (BR-VERSION-01, BR-SCRIPT-02, BR-DATA-07).
 */
import type { ID, Result, Status, Suite, TestCase, TestData } from '@/data/types';

// ---------- BR-LIST-01 order and filters ----------
/** Test IDs sort naturally: CNT-2 < CNT-10. */
export const compareTestIds = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export interface TestFilters {
  search: string;
  status: Status | 'all';
}

export function hasActiveFilters(f: TestFilters): boolean {
  return f.search.trim() !== '' || f.status !== 'all';
}

/** Search matches ID or title (case-insensitive); status matches the latest status (BR-STATUS-01: never run → Not run). */
export function matchesFilters(test: Pick<TestCase, 'id' | 'testId' | 'title'>, latest: Status, f: TestFilters): boolean {
  const q = f.search.trim().toLowerCase();
  if (q && !test.testId.toLowerCase().includes(q) && !test.title.toLowerCase().includes(q)) return false;
  return f.status === 'all' || latest === f.status;
}

export interface SuiteGroup {
  /** null = Not in a suite */
  suite: Suite | null;
  name: string;
  /** All tests of the group, by ID. */
  total: number;
  /** Tests passing the filters, by ID. */
  tests: TestCase[];
}

/** Tree by suite (alphabetical by name), "Not in a suite" last; tests by ID. Groups without matches drop out while filtering. */
export function buildSuiteTree(suites: Suite[], tests: TestCase[], statusOf: (testId: ID) => Status, f: TestFilters): SuiteGroup[] {
  const filtering = hasActiveFilters(f);
  const raw: { suite: Suite | null; name: string; tests: TestCase[] }[] = [...suites]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((s) => ({ suite: s, name: s.name, tests: tests.filter((t) => t.suiteId === s.id) }));
  raw.push({ suite: null, name: 'Not in a suite', tests: tests.filter((t) => t.suiteId === null) });
  const groups: SuiteGroup[] = raw.map((g) => {
      const sorted = [...g.tests].sort((a, b) => compareTestIds(a.testId, b.testId));
      return { ...g, total: sorted.length, tests: sorted.filter((t) => matchesFilters(t, statusOf(t.id), f)) };
    });
  // "Not in a suite" only shows when it has tests; while filtering, only groups with matches show.
  return groups.filter((g) => (filtering ? g.tests.length > 0 : g.suite !== null || g.total > 0));
}

// ---------- BR-TEST-01 IDs ----------
export const NOT_IN_A_SUITE_PREFIX = 'T';

/** Suite prefix + next number, two digits at least (CNT-05, T-03). Numbers already used with that prefix are skipped. */
export function nextTestId(prefix: string, existingIds: string[]): string {
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`, 'i');
  const max = existingIds.reduce((m, id) => Math.max(m, Number(id.match(re)?.[1] ?? 0)), 0);
  return `${prefix}-${String(max + 1).padStart(2, '0')}`;
}

export const prefixOf = (suite: Pick<Suite, 'idPrefix'> | null) => suite?.idPrefix ?? NOT_IN_A_SUITE_PREFIX;

// ---------- BR-CLONE ----------
/**
 * BR-CLONE-01/02: a copy has the template fields + test data + linked knowledge, the same title, a new ID, v1,
 * and none of: script, results/history, visual history and settings, overrides, known-issue marks.
 * BR-CLONE-03 (D41): it stays in the same suite and sorts by ID like any test; clonedFromId is informational.
 */
export function cloneTestCase(original: TestCase, id: ID, testId: string, now: string): TestCase {
  return {
    id,
    projectId: original.projectId,
    suiteId: original.suiteId,
    testId,
    title: original.title,
    ...(original.description !== undefined ? { description: original.description } : {}),
    ...(original.preconditions !== undefined ? { preconditions: original.preconditions } : {}),
    steps: [...original.steps],
    ...(original.expectedResult !== undefined ? { expectedResult: original.expectedResult } : {}),
    ...(original.expectedKeywords !== undefined ? { expectedKeywords: original.expectedKeywords } : {}),
    ...(original.startPage !== undefined ? { startPage: original.startPage } : {}),
    ...(original.browserPreference ? { browserPreference: [...original.browserPreference] } : {}),
    linkedKnowledge: [...original.linkedKnowledge],
    ...(original.testData ? { testData: structuredClone(original.testData) } : {}),
    version: 1,
    source: 'clone',
    clonedFromId: original.id,
    isNew: false,
    script: { state: 'none' },
    visual: { excluded: false, ignoreAreas: [] },
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- BR-TEST-05 move ----------
/**
 * BR-TEST-05 (D42): moving keeps a test's ID, except tests from Not in a suite ("T-" IDs), which get the destination
 * prefix + next number (T-01 → CNT-05). Everything refers to tests by internal id, so references follow.
 */
export function idAfterMove(test: Pick<TestCase, 'testId'>, destination: Pick<Suite, 'idPrefix'> | null, takenIds: string[]): string {
  const isT = new RegExp(`^${NOT_IN_A_SUITE_PREFIX}-\\d+$`, 'i').test(test.testId);
  if (!isT || destination === null) return test.testId;
  return nextTestId(destination.idPrefix, takenIds);
}

// ---------- BR-SUITE ----------
export interface SuiteInput { name: string; idPrefix: string }

/** BR-SUITE-01: name required and unique; prefix 1–6 capital letters/digits starting with a letter, unique, not "T". */
export function validateSuite(input: SuiteInput, suites: Pick<Suite, 'id' | 'name' | 'idPrefix'>[], exceptId?: ID): { name?: string; idPrefix?: string } {
  const errors: { name?: string; idPrefix?: string } = {};
  const others = suites.filter((s) => s.id !== exceptId);
  const name = input.name.trim();
  const prefix = input.idPrefix.trim();
  if (!name) errors.name = 'Enter a suite name.';
  else if (others.some((s) => s.name.trim().toLowerCase() === name.toLowerCase())) errors.name = 'A suite with this name already exists.';
  if (!/^[A-Z][A-Z0-9]{0,5}$/.test(prefix)) errors.idPrefix = 'Use 1 to 6 capital letters or digits, starting with a letter (e.g. CNT).';
  else if (prefix === NOT_IN_A_SUITE_PREFIX) errors.idPrefix = '"T" is used for tests not in a suite.';
  else if (others.some((s) => s.idPrefix === prefix)) errors.idPrefix = 'Another suite uses this prefix.';
  return errors;
}

/** A suite prefix suggestion from its name: "09 Contact Us" → "CU", "Footer" → "FOO". */
export function suggestPrefix(name: string): string {
  const words = name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words.map((w) => w[0]!).join('').slice(0, 6).toUpperCase();
}

// ---------- what a save does (BR-VERSION-01, BR-SCRIPT-02, BR-DATA-07) ----------
export interface ChangeEffect {
  bumpVersion: boolean;
  resetScript: boolean;
  /** Field names that caused a reset, for the warning text. */
  resetBecause: string[];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const withoutUse = (rows: TestData['rows']) => rows.map(({ use: _u, ...r }) => r);

/**
 * BR-SCRIPT-02 / BR-DATA-07 (D44):
 * - steps, preconditions, expected result, expected keywords, test data fields, or row 1 (recorded row) → new version + script reset;
 * - title, description, start page, browser preference, linked knowledge, rows 2+ (add/edit/delete/suggested) → new version only;
 * - "Use" on a row, visual settings, known issue, New badge, suite/ID (move) → neither.
 */
export function changeEffect(before: TestCase, after: TestCase): ChangeEffect {
  const resetBecause: string[] = [];
  if (!same(before.steps, after.steps)) resetBecause.push('steps');
  if (!same(before.preconditions, after.preconditions)) resetBecause.push('preconditions');
  if (!same(before.expectedResult, after.expectedResult)) resetBecause.push('expected result');
  if (!same(before.expectedKeywords, after.expectedKeywords)) resetBecause.push('expected keywords');
  const bFields = before.testData?.fields ?? [];
  const aFields = after.testData?.fields ?? [];
  if (!same(bFields, aFields)) resetBecause.push('test data fields');
  const row1 = (t: TestCase) => {
    const r = t.testData?.rows.find((x) => x.index === 1);
    return r ? { values: r.values, expected: r.expected, pageShows: r.pageShows } : null;
  };
  if (!same(row1(before), row1(after))) resetBecause.push('the recorded row');

  const otherRows = (t: TestCase) => withoutUse((t.testData?.rows ?? []).filter((r) => r.index !== 1));
  const versionOnly =
    !same(before.title, after.title) ||
    !same(before.description, after.description) ||
    !same(before.startPage, after.startPage) ||
    !same(before.browserPreference, after.browserPreference) ||
    !same([...before.linkedKnowledge].sort(), [...after.linkedKnowledge].sort()) ||
    !same(otherRows(before), otherRows(after));

  const resetScript = resetBecause.length > 0;
  return { bumpVersion: resetScript || versionOnly, resetScript, resetBecause };
}

/** BR-DATA-04: the field(s) a row changes compared with the recorded row; one field = the highlighted "varied" field. */
export function variedFields(row: Pick<TestData['rows'][number], 'values'>, recorded: Pick<TestData['rows'][number], 'values'>): string[] {
  return Object.keys({ ...recorded.values, ...row.values }).filter((k) => (row.values[k] ?? '') !== (recorded.values[k] ?? ''));
}

/** BR-STATUS-04: data rows roll-up text "k/n rows" from a result. */
export function rowsPassed(result: Pick<Result, 'dataRows'> | undefined): { passed: number; total: number } | null {
  if (!result?.dataRows?.length) return null;
  return { passed: result.dataRows.filter((r) => r.status === 'passed').length, total: result.dataRows.length };
}

/** Placeholders used in steps (BR-TEST-03): "{name}" → "name", in order of first use. */
export function placeholdersIn(steps: string[]): string[] {
  const seen: string[] = [];
  for (const s of steps) for (const m of s.matchAll(/\{([A-Za-z0-9_]+)\}/g)) if (!seen.includes(m[1]!)) seen.push(m[1]!);
  return seen;
}

// ---------- Visual check tab (BR-VISUAL-02) ----------
/**
 * The latest visual comparison of a test: its newest script replay that has step comparisons, and the previous
 * replay of the same environment it was compared with (null → "No previous run to compare").
 * `history` is newest first.
 */
export function latestComparison<R extends Pick<Result, 'runId' | 'mode' | 'steps'>, Rn extends { id: ID; environmentId: ID }>(
  history: R[],
  runs: Rn[],
): { result: R; run: Rn; previousRun: Rn | null } | null {
  const runOf = (r: R) => runs.find((x) => x.id === r.runId);
  const i = history.findIndex((r) => r.mode === 'script' && r.steps.some((s) => s.visual));
  if (i < 0) return null;
  const result = history[i]!;
  const run = runOf(result);
  if (!run) return null;
  const prev = history.slice(i + 1).find((r) => r.mode === 'script' && runOf(r)?.environmentId === run.environmentId);
  return { result, run, previousRun: (prev && runOf(prev)) ?? null };
}

// ---------- deleting a test (BR-TEST-06, D46) ----------
/** What deleting a test affects, for the confirmation: knowledge scoped to it, and its results (which stay in their runs). */
export function deleteImpact(
  testId: ID,
  knowledge: { kind: 'document' | 'skill'; scope: { kind: string; testId?: ID } }[],
  results: { testId: ID }[],
): { documents: number; skills: number; results: number } {
  const scoped = knowledge.filter((k) => k.scope.kind === 'test' && k.scope.testId === testId);
  return {
    documents: scoped.filter((k) => k.kind === 'document').length,
    skills: scoped.filter((k) => k.kind === 'skill').length,
    results: results.filter((r) => r.testId === testId).length,
  };
}

/**
 * How a result names its test: the current display ID and title while the test exists (so a moved test shows its new ID,
 * D42); the snapshot taken when it ran once the test is deleted (D46).
 */
export function resultTestLabel(
  result: Pick<Result, 'testId' | 'testSnapshot'>,
  testsById: Map<ID, Pick<TestCase, 'testId' | 'title'>>,
): { testId: string; title: string; deleted: boolean } {
  const t = testsById.get(result.testId);
  return t ? { testId: t.testId, title: t.title, deleted: false } : { ...result.testSnapshot, deleted: true };
}

// ---------- row 1 changes (BR-DATA-08, D47) ----------
/** Rows 2+ that still use row 1's old value for a field (they vary another field, so they should follow row 1). */
export function rowsUsingOldValue(rows: TestData['rows'], field: string, oldValue: string): TestData['rows'] {
  return rows.filter((r) => r.index !== 1 && (r.values[field] ?? '') === oldValue);
}

/** "Also update <n> rows": give those rows row 1's new value, so each keeps varying only its intended field. */
export function followRecordedValue(rows: TestData['rows'], field: string, oldValue: string, newValue: string): TestData['rows'] {
  return rows.map((r) => (r.index !== 1 && (r.values[field] ?? '') === oldValue ? { ...r, values: { ...r.values, [field]: newValue } } : r));
}
