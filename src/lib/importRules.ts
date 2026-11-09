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
  return { rows, rowsRead: dataRows.length, ignoredColumns };
}

/** Suite ID prefix from a test ID: "CNT-04" → "CNT", "CONS-02" → "CONS". BR-TEST-01 */
export function idPrefixOf(testId: string): string {
  const i = testId.lastIndexOf('-');
  return i > 0 ? testId.slice(0, i) : testId;
}
