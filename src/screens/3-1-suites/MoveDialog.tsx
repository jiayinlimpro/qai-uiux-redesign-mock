import { useState } from 'react';
import { createSuite, InvalidSuiteError, moveTests } from '@/data/api';
import type { ID } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/field';
import { errorText } from '@/components/StatusLine';
import { useProject } from '@/app/projectContext';
import { plural } from '@/lib/format';
import { validateSuite } from '@/lib/suiteRules';
import { useSuites } from './suitesContext';
import { SuiteFields } from './SuiteDialogs';

const NONE = '__none__';
const NEW = '__new__';

/**
 * Move to suite… (BR-LIST-02): an existing suite, Not in a suite, or a New suite (name + ID prefix, BR-SUITE-01).
 * Tests from Not in a suite get the destination prefix (BR-TEST-05); other IDs stay.
 */
export function MoveDialog({ testIds, onClose, onDone }: { testIds: ID[]; onClose: () => void; onDone: (message: string) => void }) {
  const project = useProject();
  const s = useSuites();
  const sorted = [...s.suites].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const [target, setTarget] = useState<string>(sorted[0]?.id ?? NONE);
  const [newSuite, setNewSuite] = useState({ name: '', idPrefix: '' });
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const suiteErrors = target === NEW ? validateSuite(newSuite, s.suites) : {};
  const hasTIds = testIds.some((id) => /^T-\d+$/i.test(s.tests.find((t) => t.id === id)?.testId ?? ''));

  async function move() {
    setSubmitted(true);
    if (suiteErrors.name || suiteErrors.idPrefix) return;
    setState({ kind: 'saving' });
    try {
      let suiteId: ID | null = target === NONE ? null : target;
      let name = target === NONE ? 'Not in a suite' : (s.suites.find((x) => x.id === target)?.name ?? '');
      if (target === NEW) {
        const created = await createSuite(project.id, newSuite.name, newSuite.idPrefix);
        suiteId = created.id;
        name = created.name;
      }
      await moveTests(testIds, suiteId);
      onDone(`${plural(testIds.length, 'test')} moved to ${name}`);
    } catch (e) {
      setState({ kind: 'error', message: e instanceof InvalidSuiteError ? e.message : errorText(e) });
    }
  }

  return (
    <Dialog
      title={`Move ${plural(testIds.length, 'test')}`}
      onClose={onClose}
      onSubmit={() => void move()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={state.kind === 'saving'}>
            {state.kind === 'saving' ? 'Moving…' : 'Move'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Move to">
          {(p) => (
            <Select {...p} value={target} onChange={(e) => setTarget(e.target.value)}>
              {sorted.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
              <option value={NONE}>Not in a suite</option>
              <option value={NEW}>New suite…</option>
            </Select>
          )}
        </Field>
        {target === NEW && <SuiteFields value={newSuite} onChange={setNewSuite} errors={submitted ? suiteErrors : {}} prefixHint="Used for test IDs, e.g. CNT-05." />}
        {hasTIds && target !== NONE && (
          <p className="text-label font-normal text-text-muted">Tests from Not in a suite get this suite’s ID prefix (e.g. T-01 becomes CNT-05). Other test IDs stay as they are.</p>
        )}
      </div>
      {state.kind === 'error' && (
        <p role="alert" className="mt-3 text-failed-text">
          {state.message}
        </p>
      )}
    </Dialog>
  );
}
