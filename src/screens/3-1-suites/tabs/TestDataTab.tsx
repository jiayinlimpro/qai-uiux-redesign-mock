import { useState } from 'react';
import { Link } from 'react-router-dom';
import { suggestTestDataRows } from '@/data/api';
import type { TestCase, TestData } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox, Field, Input, RadioGroup, Select } from '@/components/ui/field';
import { StatusChip } from '@/components/StatusViews';
import { StatusLine, errorText, type SaveStatus } from '@/components/StatusLine';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { plural } from '@/lib/format';
import { changeEffect, followRecordedValue, rowsPassed, rowsUsingOldValue, variedFields } from '@/lib/suiteRules';
import { useConfirm } from '@/components/useConfirm';
import { cn } from '@/lib/utils';
import { useSuites } from '../suitesContext';
import type { SaveTest } from '../TestDetail';

type Row = TestData['rows'][number];
type Technique = 'boundary' | 'equivalence' | 'pairwise';

const techniques: { id: Technique; label: string }[] = [
  { id: 'boundary', label: 'Boundary values' },
  { id: 'equivalence', label: 'Equivalence classes' },
  { id: 'pairwise', label: 'Pairwise' },
];

/** Recompute indexes (row 1 stays first) and the varied field of each row (BR-DATA-04). */
function normalise(rows: Row[]): Row[] {
  const recorded = rows.find((r) => r.index === 1);
  return rows.map((r, i) => {
    const varied = recorded && r.index !== 1 ? variedFields(r, recorded) : [];
    const { variedField: _v, ...rest } = r;
    return { ...rest, index: i + 1, ...(varied.length === 1 ? { variedField: varied[0] } : {}) };
  });
}

/**
 * Test data tab (screens/04-suites.md). Edits are a draft saved with "Save as vN+1 · Cancel" (D44, BR-DATA-07):
 * fields or row 1 → new version + script reset (warning shown); rows 2+ and suggested rows → new version only;
 * "Use" saves at once with no new version.
 */
export function TestDataTab({ test, save }: { test: TestCase; save: SaveTest }) {
  const project = useProject();
  const s = useSuites();
  const [draft, setDraft] = useState<TestData | undefined>(test.testData ? structuredClone(test.testData) : undefined);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [status, setStatus] = useState<SaveStatus>(null);
  const [confirm, confirmDialog] = useConfirm();
  const [saving, setSaving] = useState(false);

  if (!test.testData || !draft) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface px-6 py-8 text-center">
        <p>No test data. Add {'{field}'} placeholders to the steps to use test data.</p>
        <Link to={to.editTest(project.id, test.id)} className={buttonClasses({ className: 'mt-4' })}>
          Edit steps
        </Link>
      </div>
    );
  }

  const d: TestData = draft; // narrowed for the handlers below
  const effect = changeEffect(test, { ...test, testData: d });
  const latest = s.latest[test.id];
  const rowResults = new Map((latest?.dataRows ?? []).map((r) => [r.rowId, r.status]));
  const rollup = rowsPassed(latest);
  const recorded = draft.rows.find((r) => r.index === 1)!;
  const frs = s.knowledge.find(
    (k) =>
      k.docType === 'frs' &&
      (test.linkedKnowledge.includes(k.id) || (k.scope.kind === 'suite' && k.scope.suiteId === test.suiteId) || (k.scope.kind === 'test' && k.scope.testId === test.id)),
  );

  const update = (rows: Row[]) => {
    setDraft({ ...d, rows: normalise(rows) });
    setStatus(null);
  };

  /**
   * Apply a row from the row dialog. When a row-1 value changes, ask (default Yes) whether rows 2+ that used the old
   * value should follow it, so each row keeps varying only its intended field (BR-DATA-08, D47).
   */
  async function applyRow(before: Row | 'new', row: Row) {
    let rows = before === 'new' ? [...d.rows, row] : d.rows.map((r) => (r.id === row.id ? row : r));
    if (before !== 'new' && before.index === 1) {
      for (const f of d.fields) {
        const oldValue = before.values[f.name] ?? '';
        const newValue = row.values[f.name] ?? '';
        if (oldValue === newValue) continue;
        const using = rowsUsingOldValue(rows, f.name, oldValue);
        if (using.length === 0) continue;
        const shown = oldValue === '' ? '(empty)' : oldValue;
        const yes = await confirm({
          title: `Row 1 changed: {${f.name}}`,
          body: (
            <p>
              Also update {plural(using.length, 'row')} that used the old value ‘{shown}’? They will use ‘{newValue === '' ? '(empty)' : newValue}’, so each row keeps varying only
              its own field.
            </p>
          ),
          confirmLabel: `Yes, update ${plural(using.length, 'row')}`,
          cancelLabel: 'No, keep them',
          focusConfirm: true,
        });
        if (yes) rows = followRecordedValue(rows, f.name, oldValue, newValue);
      }
    }
    update(rows);
  }

  /** "Use" saves at once (no new version); the draft follows. */
  async function toggleUse(row: Row, use: boolean) {
    setDraft({ ...d, rows: d.rows.map((r) => (r.id === row.id ? { ...r, use } : r)) });
    try {
      await save((t) => ({ ...t, testData: t.testData && { ...t.testData, rows: t.testData.rows.map((r) => (r.id === row.id ? { ...r, use } : r)) } }));
      setStatus({ tone: 'ok', text: `Row ${row.index} ${use ? 'will run' : 'is skipped'} in the next run.` });
    } catch (e) {
      setStatus({ tone: 'error', text: `Couldn't save: ${errorText(e)}` });
    }
  }

  async function saveDraft() {
    setSaving(true);
    try {
      const saved = await save((t) => ({ ...t, testData: { ...d, rows: normalise(d.rows) } }));
      setDraft(structuredClone(saved.testData));
      setStatus({ tone: 'ok', text: `Saved as v${saved.version}${effect.resetScript && test.script.state === 'recorded' ? '; the next run uses AI' : ''}.` });
    } catch (e) {
      setStatus({ tone: 'error', text: `Couldn't save: ${errorText(e)}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted">Each row replays the test with different values. The first row is recorded by AI; the others replay the script.</p>
      <div className="rounded-card border border-border bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div>
            <p className="font-semibold">Fields: {draft.fields.map((f) => `{${f.name}}`).join(' · ')}</p>
            <p className="text-label font-normal text-text-muted">Each {'{field}'} in the steps becomes a column. Negative rows change one field at a time; the others stay valid.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setEditing('new')}>
              Add row
            </Button>
            <Button size="sm" aria-expanded={suggesting} onClick={() => setSuggesting((v) => !v)}>
              Suggest rows
            </Button>
          </div>
        </div>
        <div className="relative overflow-x-auto border-t border-border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-label text-text-muted">
                <th scope="col" className="px-3 py-2">
                  Use
                </th>
                <th scope="col" className="px-3 py-2">
                  Row
                </th>
                {draft.fields.map((f) => (
                  <th key={f.name} scope="col" className="px-3 py-2">
                    {`{${f.name}}`}
                    {f.type !== 'text' && <span className="font-normal"> ({f.type === 'select' ? 'dropdown' : f.type})</span>}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2">
                  Expected
                </th>
                <th scope="col" className="px-3 py-2">
                  Page shows
                </th>
                <th scope="col" className="px-3 py-2">
                  Last result
                </th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {draft.rows.map((row) => {
                const varied = row.index === 1 ? [] : variedFields(row, recorded);
                return (
                  <tr key={row.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">
                      <input type="checkbox" className="h-4 w-4 accent-accent" aria-label={`Use row ${row.index}`} checked={row.use} onChange={(e) => void toggleUse(row, e.target.checked)} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {row.index}
                      {row.index === 1 && <span className="text-text-muted"> · recorded</span>}
                      {row.generated && (
                        <Chip tone="info" className="ml-1">
                          Suggested
                        </Chip>
                      )}
                    </td>
                    {draft.fields.map((f) => {
                      const v = row.values[f.name] ?? '';
                      return (
                        <td key={f.name} className={cn('max-w-[14rem] truncate px-3 py-2', varied.includes(f.name) && 'font-semibold')} title={v}>
                          {v === '' ? <span className="text-text-muted">(empty)</span> : v}
                          {varied.includes(f.name) && <span className="sr-only"> (varied)</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2">{row.expected === 'accepted' ? 'Accepted' : 'Rejected'}</td>
                    <td className="px-3 py-2 text-text-muted">{row.pageShows ?? ''}</td>
                    <td className="px-3 py-2">
                      <StatusChip status={rowResults.get(row.id) ?? 'not_run'} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(row)}>
                        Edit<span className="sr-only"> row {row.index}</span>
                      </Button>
                      {row.index !== 1 && (
                        <Button size="sm" variant="ghost" onClick={() => update(draft.rows.filter((r) => r.id !== row.id))}>
                          Delete<span className="sr-only"> row {row.index}</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-2 text-label font-normal text-text-muted">Bold = the field this row varies. Row 1 (recorded) can’t be deleted.</p>
      </div>

      {suggesting && (
        <SuggestPanel
          testId={test.id}
          frsName={frs?.name}
          onRows={(rows, basedOn) => {
            // BR-DATA-06: regenerating replaces generated rows and keeps manual ones.
            const manual = draft.rows.filter((r) => !r.generated);
            update([...manual, ...rows.map((r) => ({ ...r, index: 0 }))]);
            setStatus({ tone: 'info', text: `${plural(rows.length, 'row')} suggested${basedOn ? ` based on ${basedOn}` : ''}. Review them, then save.` });
          }}
        />
      )}

      {effect.bumpVersion && (
        <div className="rounded-card border border-cc-border bg-cc-fill p-4 text-cc-text">
          {effect.resetScript && test.script.state === 'recorded' ? (
            <p>
              You changed {effect.resetBecause.join(' and ')}. Saving resets the recorded script and visual history; the next run of this test uses AI.
            </p>
          ) : (
            <p>
              Unsaved changes. Saving creates v{test.version + 1}
              {test.script.state === 'recorded' ? '; the recorded script is kept' : ''}.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="primary" size="sm" disabled={saving} onClick={() => void saveDraft()}>
              {saving ? 'Saving…' : `Save as v${test.version + 1}`}
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={() => {
                setDraft(structuredClone(test.testData));
                setStatus(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      <StatusLine status={status} />
      <p className="text-label font-normal text-text-muted">
        Counts as one result: passes only if every row meets its expectation{rollup ? ` (last run: ${rollup.passed}/${rollup.total} rows)` : ' (shown as k/n rows)'}.
      </p>

      {confirmDialog}
      {editing && (
        <RowDialog
          fields={draft.fields}
          row={editing === 'new' ? undefined : editing}
          recorded={recorded}
          onClose={() => setEditing(null)}
          onSave={(row) => {
            const before = editing;
            setEditing(null);
            void applyRow(before, row);
          }}
        />
      )}
    </div>
  );
}

/** Suggest rows panel (BR-DATA-06): techniques; uses the linked FRS if present, else an optional hint. Simulated AI. */
function SuggestPanel({ testId, frsName, onRows }: { testId: string; frsName?: string; onRows: (rows: Row[], basedOn: string | null) => void }) {
  const [picked, setPicked] = useState<Set<Technique>>(new Set(['boundary', 'equivalence']));
  const [hint, setHint] = useState('');
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'working' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  async function run() {
    setState({ kind: 'working' });
    try {
      const { rows, basedOn } = await suggestTestDataRows(testId, [...picked], hint);
      onRows(rows.map((r) => ({ ...r, index: 0 })), basedOn);
      setState({ kind: 'idle' });
    } catch (e) {
      setState({ kind: 'error', message: errorText(e) });
    }
  }

  return (
    <section aria-label="Suggest rows with AI" className="rounded-card border border-border bg-surface p-4">
      <h3 className="text-label text-text-muted">Suggest rows with AI</h3>
      <div className="mt-2 flex flex-wrap gap-5">
        {techniques.map((t) => (
          <Checkbox
            key={t.id}
            label={t.label}
            checked={picked.has(t.id)}
            onChange={(e) =>
              setPicked((prev) => {
                const next = new Set(prev);
                if (e.target.checked) next.add(t.id);
                else next.delete(t.id);
                return next;
              })
            }
          />
        ))}
      </div>
      <p className="mt-2 text-label font-normal text-text-muted">
        {frsName ? `Uses the linked FRS (${frsName}) for limits and expected outcomes.` : 'No FRS is linked to this test. Add a hint about the rules, e.g. “name max 50 characters”.'} Suggesting again replaces
        suggested rows and keeps the rows you added.
      </p>
      {!frsName && (
        <Field label="Hint (optional)" className="mt-2 max-w-md">
          {(p) => <Input {...p} value={hint} onChange={(e) => setHint(e.target.value)} />}
        </Field>
      )}
      <Button size="sm" variant="primary" className="mt-3" disabled={picked.size === 0 || state.kind === 'working'} onClick={() => void run()}>
        {state.kind === 'working' ? 'Suggesting…' : 'Suggest'}
      </Button>
      {state.kind === 'error' && (
        <p role="alert" className="mt-2 text-failed-text">
          {state.message}
        </p>
      )}
    </section>
  );
}

/** Add / edit a row. A new row starts from the recorded row so one field can be changed (BR-DATA-04). */
function RowDialog({ fields, row, recorded, onClose, onSave }: { fields: TestData['fields']; row?: Row; recorded: Row; onClose: () => void; onSave: (row: Row) => void }) {
  const [values, setValues] = useState<Record<string, string>>({ ...(row ?? recorded).values });
  const [expected, setExpected] = useState<Row['expected']>(row?.expected ?? 'rejected');
  const [pageShows, setPageShows] = useState(row?.pageShows ?? '');
  const [note, setNote] = useState(row?.note ?? '');
  const isRecorded = row?.index === 1;
  const varied = isRecorded ? [] : variedFields({ values }, recorded);

  return (
    <Dialog
      title={row ? `Edit row ${row.index}${isRecorded ? ' (recorded)' : ''}` : 'Add row'}
      onClose={onClose}
      onSubmit={() =>
        onSave({
          id: row?.id ?? `row-${crypto.randomUUID().slice(0, 8)}`,
          index: row?.index ?? 99,
          values,
          expected,
          ...(pageShows.trim() ? { pageShows: pageShows.trim() } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
          use: row?.use ?? true,
          generated: false, // edited by a person: kept when suggesting again
        })
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {row ? 'Apply' : 'Add row'}
          </Button>
        </>
      }
    >
      {isRecorded && (
        <p className="mb-4 rounded-control border border-cc-border bg-cc-fill px-3 py-2 text-cc-text">
          Row 1 is the recorded row: changing it resets the recorded script when you save.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.name} label={`{${f.name}}`} hint={varied.includes(f.name) ? 'Varied in this row' : undefined}>
            {(p) =>
              f.type === 'select' ? (
                <Select {...p} value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>
                  <option value="">(empty)</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : f.type === 'checkbox' ? (
                <Select {...p} value={values[f.name] ?? 'false'} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>
                  <option value="true">Ticked</option>
                  <option value="false">Not ticked</option>
                </Select>
              ) : (
                <Input {...p} type={f.type === 'date' ? 'date' : 'text'} value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
              )
            }
          </Field>
        ))}
      </div>
      {varied.length > 1 && <p className="mt-3 text-label font-normal text-cc-text">This row changes {varied.length} fields. Negative rows usually change one field at a time.</p>}
      <div className="mt-4 flex flex-col gap-4">
        <RadioGroup
          legend="Expected"
          name="row-expected"
          value={expected}
          options={[
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          onChange={setExpected}
        />
        <Field label="Page shows (optional)" hint="Text that must be visible, e.g. the error message (BR-DATA-05).">
          {(p) => <Input {...p} value={pageShows} onChange={(e) => setPageShows(e.target.value)} />}
        </Field>
        <Field label="Note (optional)">{(p) => <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      </div>
    </Dialog>
  );
}
