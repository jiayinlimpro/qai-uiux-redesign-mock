import type { Browser } from '@/data/types';
import { parseCsv } from './csv';

/** Template columns, BR-IMPORT-03. Only task_content is required. */
export const TEMPLATE_COLUMNS = [
  'task_id',
  'title',
  'description',
  'category',
  'preconditions',
  'task_content',
  'expected_result',
  'expected_keywords',
  'base_url',
  'browser_type',
] as const;
export type TemplateColumn = (typeof TEMPLATE_COLUMNS)[number];

export type TemplateRow = Partial<Record<TemplateColumn, string>>;

// BR-IMPORT-02: header matching is case-insensitive; spaces, hyphens and underscores are equivalent.
export function normaliseHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s\-_]+/g, '_');
}

// BR-IMPORT-04: completely blank rows are removed.
export function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => c.trim() === '');
}

const NUMBERED_LINE = /^\s*\d+[.)]\s+/;

// BR-IMPORT-03: task_content → steps; numbered lines become steps.
// Content without numbered lines becomes a single step (not specified in 05; see Slice 0 report).
// Un-numbered lines after a numbered line are appended to that step.
export function contentToSteps(content: string): string[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
  if (!lines.some((l) => NUMBERED_LINE.test(l))) {
    const whole = lines.join(' ').trim();
    return whole === '' ? [] : [whole];
  }
  const steps: string[] = [];
  for (const line of lines) {
    if (NUMBERED_LINE.test(line)) steps.push(line.replace(NUMBERED_LINE, ''));
    else if (steps.length === 0) steps.push(line);
    else steps[steps.length - 1] += ` ${line}`;
  }
  return steps;
}

const BROWSER_NAMES: Record<string, Browser> = {
  chrome: 'chrome',
  chromium: 'chrome',
  firefox: 'firefox',
  safari: 'webkit',
  webkit: 'webkit',
};

// BR-IMPORT-03: browser_type is a comma list. "safari" maps to WebKit (BR-STATUS-03 labels it "Safari (WebKit)").
// Unknown names are dropped; an empty list means "no preference" (undefined).
export function parseBrowserList(value: string | undefined): Browser[] | undefined {
  if (!value) return undefined;
  const out: Browser[] = [];
  for (const part of value.split(',')) {
    const b = BROWSER_NAMES[part.trim().toLowerCase()];
    if (b && !out.includes(b)) out.push(b);
  }
  return out.length > 0 ? out : undefined;
}

export interface ParsedTemplate {
  /** Header cells as written in the file. */
  header: string[];
  rows: TemplateRow[];
  rowsRead: number;
  /** Header names (as written in the file) that are not template columns. BR-IMPORT-03 */
  ignoredColumns: string[];
}

// BR-IMPORT-02/03/04: read a CSV in the import template format.
export function readTemplateCsv(text: string): ParsedTemplate {
  const [header = [], ...body] = parseCsv(text);
  const known = new Set<string>(TEMPLATE_COLUMNS);
  const columns = header.map((h) => {
    const n = normaliseHeader(h);
    return known.has(n) ? (n as TemplateColumn) : null;
  });
  const ignoredColumns = header.filter((_, i) => columns[i] === null && header[i]!.trim() !== '');
  const dataRows = body.filter((cells) => !isBlankRow(cells));
  const rows = dataRows.map((cells) => {
    const row: TemplateRow = {};
    columns.forEach((col, i) => {
      if (col) row[col] = (cells[i] ?? '').trim();
    });
    return row;
  });
  return { header, rows, rowsRead: dataRows.length, ignoredColumns };
}

/** Suite ID prefix from a test ID: "CNT-04" → "CNT", "CONS-02" → "CONS". BR-TEST-01 */
export function idPrefixOf(testId: string): string {
  const i = testId.lastIndexOf('-');
  return i > 0 ? testId.slice(0, i) : testId;
}

// ---------- import plan (BR-IMPORT-05/06, BR-TEST-01) ----------
export type DuplicateChoice = 'update' | 'skip' | 'import_as_new';

export interface ExistingTest { id: string; testId: string; suiteId: string | null }
export interface ExistingSuite { id: string; name: string; idPrefix: string }

export type PlannedRow =
  | { action: 'create'; row: TemplateRow; testId: string; suite: string | null }
  /** suite null + categoryInFile false → keep the current suite; categoryInFile true + empty cell → Not in a suite (D50). */
  | { action: 'update'; row: TemplateRow; existingId: string; testId: string; suite: string | null; categoryInFile: boolean }
  | { action: 'skip'; row: TemplateRow; reason: 'duplicate' | 'no_steps' };

export interface ImportPlan {
  rows: PlannedRow[];
  /** Suite names (as in the file) to create, with their ID prefix. */
  newSuites: { name: string; idPrefix: string }[];
  /** Test IDs in the file that already exist in the project. */
  duplicates: string[];
  /** Test IDs written more than once in the file: later copies get new IDs. */
  repeatedInFile: string[];
  rowsWithoutSteps: number;
}

const norm = (s: string) => s.trim().toLowerCase();

function uniquePrefix(wanted: string, taken: Set<string>): string {
  const base = (wanted.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'S').replace(/^[^A-Z]+/, 'S').slice(0, 6);
  let candidate = base === 'T' ? 'TS' : base;
  for (let i = 2; taken.has(candidate); i++) candidate = `${base.slice(0, 5)}${i}`;
  return candidate;
}

/**
 * What an import will do (BR-IMPORT-05/06): categories create or reuse suites (case-insensitive name); rows without a
 * category go to Not in a suite; existing test IDs follow the user's choice once for all; rows without steps are skipped
 * (BR-TEST-02); new tests keep their task_id when free, else get the suite prefix + next number (BR-TEST-01).
 */
export function planImport(rows: TemplateRow[], tests: ExistingTest[], suites: ExistingSuite[], choice: DuplicateChoice): ImportPlan {
  const suiteByName = new Map(suites.map((s) => [norm(s.name), s]));
  const takenPrefixes = new Set(suites.map((s) => s.idPrefix));
  const newSuites: { name: string; idPrefix: string }[] = [];
  const prefixFor = (category: string): string | null => {
    if (!category.trim()) return null;
    const existing = suiteByName.get(norm(category));
    if (existing) return existing.idPrefix;
    const pending = newSuites.find((s) => norm(s.name) === norm(category));
    if (pending) return pending.idPrefix;
    const firstId = rows.find((r) => norm(r.category ?? '') === norm(category) && r.task_id)?.task_id;
    const prefix = uniquePrefix(firstId ? idPrefixOf(firstId) : category.replace(/^[\d\s]+/, '').slice(0, 3), takenPrefixes);
    takenPrefixes.add(prefix);
    newSuites.push({ name: category.trim(), idPrefix: prefix });
    return prefix;
  };

  const byId = new Map(tests.map((t) => [norm(t.testId), t]));
  const usedIds = new Set(tests.map((t) => norm(t.testId)));
  const seenInFile = new Set<string>();
  const duplicates: string[] = [];
  const repeatedInFile: string[] = [];
  let rowsWithoutSteps = 0;
  const nextId = (prefix: string) => {
    let n = 1;
    const re = new RegExp(`^${prefix.toLowerCase()}-(\\d+)$`);
    for (const id of usedIds) n = Math.max(n, Number(id.match(re)?.[1] ?? 0) + 1);
    const id = `${prefix}-${String(n).padStart(2, '0')}`;
    usedIds.add(norm(id));
    return id;
  };

  const out: PlannedRow[] = rows.map((row) => {
    if (contentToSteps(row.task_content ?? '').length === 0) {
      rowsWithoutSteps++;
      return { action: 'skip', row, reason: 'no_steps' };
    }
    const category = row.category ?? '';
    const prefix = prefixFor(category);
    const suite = category.trim() ? category.trim() : null;
    const given = (row.task_id ?? '').trim();
    const key = norm(given);
    if (given && seenInFile.has(key)) {
      repeatedInFile.push(given);
      return { action: 'create', row, testId: nextId(prefix ?? 'T'), suite };
    }
    if (given) seenInFile.add(key);
    const existing = given ? byId.get(key) : undefined;
    if (existing) {
      duplicates.push(existing.testId);
      if (choice === 'skip') return { action: 'skip', row, reason: 'duplicate' };
      if (choice === 'update') return { action: 'update', row, existingId: existing.id, testId: existing.testId, suite, categoryInFile: row.category !== undefined };
      return { action: 'create', row, testId: nextId(prefix ?? 'T'), suite };
    }
    if (given && !usedIds.has(key)) {
      usedIds.add(key);
      return { action: 'create', row, testId: given, suite };
    }
    return { action: 'create', row, testId: nextId(prefix ?? 'T'), suite };
  });
  return { rows: out, newSuites, duplicates, repeatedInFile, rowsWithoutSteps };
}

/** Columns recognised in a header row (as written), for the file check. */
export function recognisedColumns(header: string[]): string[] {
  const known = new Set<string>(TEMPLATE_COLUMNS);
  return header.filter((h) => known.has(normaliseHeader(h)));
}

/** The downloadable template (BR-IMPORT-01): header + one example row. */
export function templateCsv(): string {
  const example = ['LOGIN-01', 'Login with a valid account', '', 'Login', 'Registered customer account exists', '1. Open the login page\n2. Log in as Registered customer\n3. Check the account page opens', 'The account page shows the customer name.', '', '', 'chrome'];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return `${TEMPLATE_COLUMNS.join(',')}\n${example.map(esc).join(',')}\n`;
}

// ---------- import Update: which fields change (BR-IMPORT-06, D50) ----------
export interface UpdatableFields {
  title: string;
  description?: string;
  preconditions?: string;
  expectedResult?: string;
  expectedKeywords?: string;
  startPage?: string;
  browserPreference?: Browser[];
}

const COLUMN_FIELDS: [TemplateColumn, keyof UpdatableFields, string][] = [
  ['title', 'title', 'title'],
  ['description', 'description', 'description'],
  ['preconditions', 'preconditions', 'preconditions'],
  ['expected_result', 'expectedResult', 'expected result'],
  ['expected_keywords', 'expectedKeywords', 'expected keywords'],
  ['base_url', 'startPage', 'start page'],
  ['browser_type', 'browserPreference', 'browser preference'],
];

const hasValue = (v: unknown) => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v !== undefined);

/**
 * D50: Update by import. A column missing from the file keeps the current value; a column present with an empty cell
 * clears it (an empty title falls back to the first step, BR-TEST-02). Returns the updated fields and the names of fields
 * that had a value and are cleared, for "<n> fields will be cleared". Steps always come from task_content.
 */
export function updateFromRow<T extends UpdatableFields>(current: T, row: TemplateRow): { next: T; cleared: string[] } {
  const next: T = { ...current };
  const cleared: string[] = [];
  for (const [column, field, label] of COLUMN_FIELDS) {
    const cell = row[column];
    if (cell === undefined) continue; // column not in the file: keep
    const value = field === 'browserPreference' ? parseBrowserList(cell) : cell.trim() || undefined;
    if (value === undefined) {
      if (hasValue(current[field])) cleared.push(label);
      if (field === 'title') (next as UpdatableFields).title = '';
      else delete (next as Partial<UpdatableFields>)[field];
    } else {
      (next as Record<string, unknown>)[field] = value;
    }
  }
  return { next, cleared };
}
