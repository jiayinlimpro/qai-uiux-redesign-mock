import type { Scope, Suite, TestCase } from '@/data/types';
import { Select } from '@/components/ui/field';

interface ScopePickerProps {
  value: Scope;
  onChange: (scope: Scope) => void;
  suites: Suite[];
  tests: TestCase[];
}

/** "Applies to" (02-glossary: Knowledge item scope): Project-wide · a suite · a test. */
export function ScopePicker({ value, onChange, suites, tests }: ScopePickerProps) {
  const sortedSuites = [...suites].sort((a, b) => a.name.localeCompare(b.name)); // BR-LIST-01 order
  const byId = (list: TestCase[]) => [...list].sort((a, b) => a.testId.localeCompare(b.testId, undefined, { numeric: true }));
  // Suites alphabetically, "Not in a suite" last, tests by ID within each (BR-LIST-01).
  const testsBySuite = [
    ...sortedSuites.map((s) => ({ label: s.name, tests: byId(tests.filter((t) => t.suiteId === s.id)) })),
    { label: 'Not in a suite', tests: byId(tests.filter((t) => t.suiteId === null)) },
  ].filter((g) => g.tests.length > 0);

  const radio = (kind: Scope['kind'], label: string) => (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="radio"
        name="scope-kind"
        className="h-4 w-4 accent-accent"
        checked={value.kind === kind}
        onChange={() => {
          if (kind === 'project') onChange({ kind: 'project' });
          if (kind === 'suite' && sortedSuites[0]) onChange({ kind: 'suite', suiteId: sortedSuites[0].id });
          if (kind === 'test' && testsBySuite[0]?.tests[0]) onChange({ kind: 'test', testId: testsBySuite[0].tests[0].id });
        }}
        disabled={(kind === 'suite' && sortedSuites.length === 0) || (kind === 'test' && tests.length === 0)}
      />
      {label}
    </label>
  );

  return (
    <fieldset>
      <legend className="mb-2 text-label text-text-muted">Applies to</legend>
      <div className="flex flex-wrap gap-5">
        {radio('project', 'Project-wide')}
        {radio('suite', 'A suite')}
        {radio('test', 'A test')}
      </div>
      {value.kind === 'suite' && (
        <Select aria-label="Suite" className="mt-3" value={value.suiteId} onChange={(e) => onChange({ kind: 'suite', suiteId: e.target.value })}>
          {sortedSuites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      )}
      {value.kind === 'test' && (
        <Select aria-label="Test" className="mt-3" value={value.testId} onChange={(e) => onChange({ kind: 'test', testId: e.target.value })}>
          {testsBySuite.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.testId} {t.title}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      )}
    </fieldset>
  );
}
