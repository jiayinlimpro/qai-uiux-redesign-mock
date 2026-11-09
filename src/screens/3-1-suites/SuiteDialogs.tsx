import { useState, type ReactNode } from 'react';
import { deleteSuite, InvalidSuiteError, renameSuite } from '@/data/api';
import type { Suite } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { errorText } from '@/components/StatusLine';
import { useConfirm } from '@/components/useConfirm';
import { suggestPrefix, validateSuite } from '@/lib/suiteRules';
import { useSuites } from './suitesContext';

/** Name + ID prefix fields, shared by Rename suite and Move › New suite (BR-SUITE-01). */
export function SuiteFields({
  value,
  onChange,
  errors,
  prefixHint,
}: {
  value: { name: string; idPrefix: string };
  onChange: (v: { name: string; idPrefix: string }) => void;
  errors: { name?: string; idPrefix?: string };
  prefixHint: string;
}) {
  const [prefixTouched, setPrefixTouched] = useState(value.idPrefix !== '');
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem]">
      <Field label="Suite name" required error={errors.name}>
        {(p) => (
          <Input
            {...p}
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value, idPrefix: prefixTouched ? value.idPrefix : suggestPrefix(e.target.value) })}
          />
        )}
      </Field>
      <Field label="ID prefix" required error={errors.idPrefix} hint={prefixHint}>
        {(p) => (
          <Input
            {...p}
            value={value.idPrefix}
            onChange={(e) => {
              setPrefixTouched(true);
              onChange({ ...value, idPrefix: e.target.value.toUpperCase() });
            }}
          />
        )}
      </Field>
    </div>
  );
}

/** Suite row menu › Rename suite (name + prefix). Existing test IDs stay; new tests use the new prefix (D43). */
export function SuiteDialog({ suite, onClose }: { suite: Suite; onClose: () => void }) {
  const s = useSuites();
  const [value, setValue] = useState({ name: suite.name, idPrefix: suite.idPrefix });
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const errors = validateSuite(value, s.suites, suite.id);
  const shown = submitted || value.name !== suite.name || value.idPrefix !== suite.idPrefix ? errors : {};

  async function save() {
    setSubmitted(true);
    if (errors.name || errors.idPrefix) return;
    setState({ kind: 'saving' });
    try {
      await renameSuite(suite.id, value.name, value.idPrefix);
      s.reload();
      s.showToast({ text: `Suite saved as ${value.name.trim()}` });
      onClose();
    } catch (e) {
      setState({ kind: 'error', message: e instanceof InvalidSuiteError ? e.message : errorText(e) });
    }
  }

  return (
    <Dialog
      title="Rename suite"
      onClose={onClose}
      onSubmit={() => void save()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={state.kind === 'saving'}>
            {state.kind === 'saving' ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <SuiteFields value={value} onChange={setValue} errors={shown} prefixHint="Existing test IDs stay; new tests use this prefix." />
      {state.kind === 'error' && (
        <p role="alert" className="mt-3 text-failed-text">
          {state.message}
        </p>
      )}
    </Dialog>
  );
}

/** Suite row menu › Delete suite: only an empty suite (BR-SUITE-02); otherwise "Move or delete its tests first." */
export function useDeleteSuite(): [(suite: Suite, testCount: number) => Promise<void>, ReactNode] {
  const s = useSuites();
  const [confirm, dialog] = useConfirm();
  const [blocked, setBlocked] = useState<Suite | null>(null);

  async function run(suite: Suite, testCount: number) {
    if (testCount > 0) {
      setBlocked(suite);
      return;
    }
    if (!(await confirm({ title: `Delete ${suite.name}?`, danger: true, confirmLabel: 'Delete suite', body: <p>The suite is empty. This can’t be undone.</p> }))) return;
    try {
      await deleteSuite(suite.id);
      s.reload();
      s.showToast({ text: `Deleted ${suite.name}` });
    } catch (e) {
      s.showToast({ text: errorText(e) });
    }
  }

  const element = (
    <>
      {dialog}
      {blocked && (
        <Dialog title={`${blocked.name} can’t be deleted`} size="sm" onClose={() => setBlocked(null)} footer={<Button onClick={() => setBlocked(null)}>OK</Button>}>
          <p>It still has tests. Move or delete its tests first.</p>
        </Dialog>
      )}
    </>
  );
  return [run, element];
}
