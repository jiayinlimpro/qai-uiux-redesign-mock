/**
 * Mock of the AI "Suggest rows" (BR-DATA-06): deterministic rows from the fields and the recorded row,
 * one field changed per row (BR-DATA-04). The real product asks the AI, using a linked FRS or the user's hint.
 */
import type { ID, TestData } from '../types';

export type Technique = 'boundary' | 'equivalence' | 'pairwise';
type Row = TestData['rows'][number];

export function suggestRows(testData: TestData, techniques: Technique[], newId: () => ID): Omit<Row, 'index'>[] {
  const recorded = testData.rows.find((r) => r.index === 1);
  if (!recorded) return [];
  const out: Omit<Row, 'index'>[] = [];
  const add = (field: string, value: string, expected: Row['expected'], pageShows?: string) => {
    const values = { ...recorded.values, [field]: value };
    const exists = [...testData.rows, ...out].some((r) => JSON.stringify(r.values) === JSON.stringify(values));
    if (!exists) out.push({ id: newId(), values, expected, ...(pageShows ? { pageShows } : {}), use: true, generated: true, variedField: field });
  };
  for (const f of testData.fields) {
    const isEmail = /mail/i.test(f.name);
    if (f.type === 'text' && techniques.includes('equivalence')) {
      if (isEmail) add(f.name, 'user@', 'rejected', 'valid email');
      add(f.name, '', 'rejected', 'required');
    }
    if (f.type === 'text' && techniques.includes('boundary')) {
      add(f.name, 'x'.repeat(256), 'rejected', 'too long');
      if (isEmail) add(f.name, 'a@b.co', 'accepted');
      else add(f.name, 'A', 'accepted');
    }
    if (f.type === 'select' && (techniques.includes('pairwise') || techniques.includes('equivalence'))) {
      for (const o of f.options ?? []) if (o !== recorded.values[f.name]) add(f.name, o, 'accepted');
    }
  }
  return out;
}
