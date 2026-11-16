import { useState } from 'react';
import { createSuite, InvalidSuiteError, renameSuite } from '@/data/api';
import type { Suite } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { errorText } from '@/components/StatusLine';
import { useProject } from '@/app/projectContext';
import { suggestPrefix, validateSuite } from '@/lib/suiteRules';

/** Name + ID prefix fields (BR-SUITE-01), shared by the Suite dialog and Move › New suite. The prefix follows the name until edited. */
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

/** Example ID for the prefix hint: the typed prefix when it looks like one, else a placeholder. */
const exampleId = (prefix: string) => `${/^[A-Z][A-Z0-9]{0,5}$/.test(prefix.trim()) ? prefix.trim() : 'CNT'}-01`;

/**
 * The one Suite dialog (D78, BR-SUITE-01): New suite (Suites header, empty library, New/Edit test › Suite › New suite…)
 * and Edit suite (suite row menu). Create mode creates the suite on "Create suite"; edit mode keeps existing test IDs.
 * The caller reloads its data and reports the result.
 */
export function SuiteDialog({ suite, suites, onClose, onSaved }: { suite?: Suite; suites: Suite[]; onClose: () => void; onSaved: (saved: Suite) => void }) {
  const project = useProject();
  const initial = { name: suite?.name ?? '', idPrefix: suite?.idPrefix ?? '' };
  const [value, setValue] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const errors = validateSuite(value, suites, suite?.id);
  const shown = submitted || value.name !== initial.name || value.idPrefix !== initial.idPrefix ? errors : {};

  async function save() {
    setSubmitted(true);
    if (errors.name || errors.idPrefix) return;
    setState({ kind: 'saving' });
    try {
      const saved = suite ? await renameSuite(suite.id, value.name, value.idPrefix) : await createSuite(project.id, value.name, value.idPrefix);
      onSaved(saved);
    } catch (e) {
      setState({ kind: 'error', message: e instanceof InvalidSuiteError ? e.message : errorText(e) });
    }
  }

  const saving = state.kind === 'saving';
  return (
    <Dialog
      title={suite ? 'Edit suite' : 'New suite'}
      onClose={onClose}
      onSubmit={() => void save()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {suite ? (saving ? 'Saving…' : 'Save') : saving ? 'Creating…' : 'Create suite'}
          </Button>
        </>
      }
    >
      <SuiteFields
        value={value}
        onChange={setValue}
        errors={shown}
        prefixHint={suite ? 'Existing test IDs stay; new tests use this prefix.' : `Used for test IDs, e.g. ${exampleId(value.idPrefix)}.`}
      />
      {state.kind === 'error' && (
        <p role="alert" className="mt-3 text-failed-text">
          {state.message}
        </p>
      )}
    </Dialog>
  );
}
