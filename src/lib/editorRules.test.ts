import { defaultTitle, fieldChanges, syncTestDataFields, validateTestForm } from './editorRules';

const td = {
  fields: [
    { name: 'name', type: 'text' as const },
    { name: 'topic', type: 'select' as const, options: ['A', 'B'] },
  ],
  rows: [
    { id: 'r1', index: 1, values: { name: 'QA', topic: 'A' }, expected: 'accepted' as const, use: true, generated: false },
    { id: 'r2', index: 2, values: { name: '', topic: 'A' }, expected: 'rejected' as const, use: true, generated: false },
  ],
};
let n = 0;
const newId = () => `row-${++n}`;

describe('BR-DATA-01 syncTestDataFields', () => {
  it('adds new placeholders as text fields with empty values, keeps types, drops removed ones', () => {
    const next = syncTestDataFields(td, ['Fill {name} and {email}'], newId)!;
    expect(next.fields).toEqual([{ name: 'name', type: 'text' }, { name: 'email', type: 'text' }]);
    expect(next.rows.map((r) => r.values)).toEqual([{ name: 'QA', email: '' }, { name: '', email: '' }]);
  });
  it('keeps a field type when the placeholder stays', () => {
    expect(syncTestDataFields(td, ['Pick {topic}'], newId)!.fields).toEqual([{ name: 'topic', type: 'select', options: ['A', 'B'] }]);
  });
  it('no placeholders → no test data; first placeholder → empty recorded row', () => {
    expect(syncTestDataFields(td, ['No fields here'], newId)).toBeUndefined();
    const created = syncTestDataFields(undefined, ['Type {code}'], newId)!;
    expect(created.rows).toEqual([{ id: 'row-1', index: 1, values: { code: '' }, expected: 'accepted', use: true, generated: false }]);
  });
  it('reports added and removed fields', () => {
    expect(fieldChanges(td, ['Fill {name} and {email}'])).toEqual({ added: ['email'], removed: ['topic'] });
  });
});

describe('BR-TEST-01/02 validateTestForm', () => {
  it('needs a unique ID and at least one step', () => {
    expect(validateTestForm({ testId: 'CNT-05', steps: ['Open'] }, ['CNT-01'])).toEqual({});
    expect(validateTestForm({ testId: 'cnt-01', steps: ['  '] }, ['CNT-01'])).toEqual({ testId: 'Another test already uses this ID.', steps: 'Add at least one step.' });
    expect(validateTestForm({ testId: '', steps: ['x'] }, []).testId).toBe('Enter a test ID.');
  });
  it('default title is the first 40 characters of the first step', () => {
    expect(defaultTitle(['', 'Open the contact page and check every field label is shown'])).toBe('Open the contact page and check every fi');
  });
});
