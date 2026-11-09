/**
 * New / edit test rules (screens/04-suites.md 3.2): test data fields follow the steps' {placeholders} (BR-DATA-01,
 * BR-TEST-03), and form validation (BR-TEST-01/02).
 */
import type { TestData } from '@/data/types';
import { placeholdersIn } from './suiteRules';

/**
 * BR-DATA-01: test data fields are the placeholders used in the steps. On save: new placeholders become text fields
 * (empty values in every row); removed placeholders drop their field and values; existing fields keep their type.
 * No placeholders left → no test data. A first placeholder creates test data with an empty recorded row (row 1).
 */
export function syncTestDataFields(testData: TestData | undefined, steps: string[], newRowId: () => string): TestData | undefined {
  const names = placeholdersIn(steps);
  if (names.length === 0) return undefined;
  const fields = names.map((n) => testData?.fields.find((f) => f.name === n) ?? { name: n, type: 'text' as const });
  const rows = testData?.rows.length
    ? testData.rows.map((r) => ({ ...r, values: Object.fromEntries(names.map((n) => [n, r.values[n] ?? ''])) }))
    : [{ id: newRowId(), index: 1, values: Object.fromEntries(names.map((n) => [n, ''])), expected: 'accepted' as const, use: true, generated: false }];
  return { fields, rows };
}

/** Fields that saving would add or remove (for the editor's warning). */
export function fieldChanges(testData: TestData | undefined, steps: string[]): { added: string[]; removed: string[] } {
  const now = placeholdersIn(steps);
  const before = testData?.fields.map((f) => f.name) ?? [];
  return { added: now.filter((n) => !before.includes(n)), removed: before.filter((n) => !now.includes(n)) };
}

export interface TestFormErrors {
  testId?: string;
  steps?: string;
}

/** BR-TEST-01: ID required and unique in the project (case-insensitive). BR-TEST-02: at least one step. */
export function validateTestForm(form: { testId: string; steps: string[] }, otherTestIds: string[]): TestFormErrors {
  const errors: TestFormErrors = {};
  const id = form.testId.trim();
  if (!id) errors.testId = 'Enter a test ID.';
  else if (otherTestIds.some((x) => x.toLowerCase() === id.toLowerCase())) errors.testId = 'Another test already uses this ID.';
  if (form.steps.every((s) => !s.trim())) errors.steps = 'Add at least one step.';
  return errors;
}

/** BR-TEST-02: title shown/used when empty — the first 40 characters of the first step. */
export function defaultTitle(steps: string[]): string {
  return (steps.find((s) => s.trim()) ?? '').trim().slice(0, 40);
}
