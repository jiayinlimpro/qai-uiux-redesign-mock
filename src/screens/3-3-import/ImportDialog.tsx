import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  importCheck,
  importCommit,
  importTemplate,
  sampleImportFileForPrototype,
  UnsupportedImportFileError,
  type ImportCheck,
  type ImportDuplicateChoice,
} from '@/data/api';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { RadioGroup } from '@/components/ui/field';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { LoadingState } from '@/components/StateViews';
import { errorText } from '@/components/StatusLine';
import { useProject } from '@/app/projectContext';
import { downloadBlob } from '@/app/download';
import { to } from '@/app/routes';
import { plural } from '@/lib/format';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;

const choices: { value: ImportDuplicateChoice; label: string }[] = [
  { value: 'update', label: 'Update them (new version, script reset if steps changed)' },
  { value: 'skip', label: 'Skip them' },
  { value: 'import_as_new', label: 'Import as new tests' },
];

/** 3.3 Import (screens/04-suites.md): 1 File · 2 Check · 3 Review. Template columns only; no column mapping (BR-IMPORT-07). */
export function ImportDialog() {
  const project = useProject();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [choice, setChoice] = useState<ImportDuplicateChoice>('update');
  const [busy, setBusy] = useState<'checking' | 'importing' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const close = () => navigate(to.suites(project.id));

  async function pick(f: File) {
    setError(null);
    setBusy('checking');
    try {
      const c = await importCheck(project.id, f);
      setFile(f);
      setCheck(c);
      setStep(2);
    } catch (e) {
      setError(e instanceof UnsupportedImportFileError ? 'Choose a .csv or .xlsx file.' : `Couldn't read the file: ${errorText(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function runImport() {
    if (!file) return;
    setBusy('importing');
    try {
      const r = await importCommit(project.id, file, choice);
      const parts = [r.created > 0 && `${plural(r.created, 'new test')}`, r.updated > 0 && `${r.updated} updated`, r.skipped > 0 && `${r.skipped} skipped`, r.suitesCreated > 0 && `${plural(r.suitesCreated, 'suite')} created`].filter(Boolean);
      navigate(to.suites(project.id), { state: { flash: `Imported: ${parts.join(', ') || 'nothing to change'}` } });
    } catch (e) {
      setError(`Couldn't import: ${errorText(e)}`);
      setBusy(null);
    }
  }

  const preview = check?.previews[choice];
  const toImport = preview ? preview.suites.reduce((n, s) => n + s.create + s.update, 0) : 0;
  const template = async () => downloadBlob(await importTemplate(), 'qai-test-template.csv');

  return (
    <Dialog
      title="Import tests"
      onClose={close}
      footer={
        <div className="flex w-full items-center gap-2">
          <Button onClick={close}>Cancel</Button>
          <span className="flex-1" />
          {step > 1 && (
            <Button disabled={busy !== null} onClick={() => setStep((s) => (s - 1) as Step)}>
              Back
            </Button>
          )}
          {step === 2 && check && (
            <Button variant="primary" disabled={check.missingRequired || toImport === 0} onClick={() => setStep(3)}>
              Next: review {plural(toImport, 'test')}
            </Button>
          )}
          {step === 3 && (
            <Button variant="primary" disabled={busy !== null || toImport === 0} onClick={() => void runImport()}>
              {busy === 'importing' ? 'Importing…' : `Import ${plural(toImport, 'test')}`}
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-text-muted">{check ? `${check.fileName} · ${plural(check.rowsRead, 'row')}` : 'CSV or Excel (first sheet)'}</p>
        <ol aria-label="Import steps" className="flex gap-1">
          {(['File', 'Check', 'Review'] as const).map((label, i) => (
            <li key={label} aria-current={step === i + 1 ? 'step' : undefined}>
              <Chip tone={step === i + 1 ? 'info' : 'neutral'}>
                {i + 1} {label}
              </Chip>
            </li>
          ))}
        </ol>
      </div>

      <input
        ref={input}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void pick(f);
        }}
      />

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border p-4">
            <div>
              <p className="font-semibold">Use the QAI template</p>
              <p className="text-label font-normal text-text-muted">Fill your test cases into the template first, then import it. CSV or Excel (first sheet).</p>
            </div>
            <Button size="sm" onClick={() => void template()}>
              Download template
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={busy !== null} onClick={() => input.current?.click()}>
              {busy === 'checking' ? 'Checking the file…' : 'Choose a file'}
            </Button>
            <span className="text-label font-normal text-text-muted">.csv or .xlsx</span>
          </div>
          <div className="rounded-control border border-dashed border-border px-3 py-2">
            <Chip tone="cc">Prototype only</Chip>{' '}
            <button type="button" className="text-accent underline underline-offset-2" disabled={busy !== null} onClick={() => void pick(sampleImportFileForPrototype())}>
              Use the sample file
            </button>{' '}
            <span className="text-label font-normal text-text-muted">(the 83 qcfixer.com tests)</span>
          </div>
          {busy === 'checking' && <LoadingState label="Checking the file…" />}
        </div>
      )}

      {step === 2 && check && (
        <div className="flex flex-col gap-4">
          {check.simulatedExcel && (
            <p className="rounded-control border border-cc-border bg-cc-fill px-3 py-2 text-cc-text">
              Prototype: Excel files are read as the sample test set. CSV files are read as they are.
            </p>
          )}
          <section aria-label="File check" className={cn('rounded-card border p-4', check.missingRequired ? 'border-failed-border' : 'border-border')}>
            <p>
              <Chip tone={check.missingRequired ? 'failed' : 'info'}>File check</Chip> {plural(check.rowsRead, 'row')} read ·{' '}
              {check.missingRequired ? <span className="font-semibold text-failed-text">the required task_content column is missing</span> : 'all required columns found'}
            </p>
            {check.missingRequired && (
              <p role="alert" className="mt-2 text-failed-text">
                Add a task_content column with the steps, or start from the{' '}
                <button type="button" className="underline underline-offset-2" onClick={() => void template()}>
                  template
                </button>
                .
              </p>
            )}
            <p className="mt-2">
              <span className="font-semibold">Recognised:</span> {check.recognised.join(', ') || 'none'}
            </p>
            <p>
              <span className="font-semibold">Ignored:</span> {check.ignored.join(', ') || 'none'}
            </p>
            <p className="mt-2 text-label font-normal text-text-muted">
              Column names are matched leniently: not case-sensitive, and spaces, hyphens and underscores count the same (“Task Content” = task-content = task_content). Only task_content is
              required.
            </p>
          </section>
          {check.duplicates.length > 0 && (
            <section aria-label="Existing tests" className="rounded-card border border-border p-4">
              <Chip tone="cc">{plural(check.duplicates.length, 'row')} match existing tests by Test ID</Chip>
              <div className="mt-3">
                <RadioGroup legend="For rows whose test ID already exists" hideLegend name="duplicates" value={choice} options={choices} onChange={setChoice} />
              </div>
            </section>
          )}
          {choice === 'update' && check.previews.update.fieldsCleared > 0 && (
            <p role="note" className="rounded-control border border-cc-border bg-cc-fill px-3 py-2 text-cc-text">
              {plural(check.previews.update.fieldsCleared, 'field')} will be cleared: cells that are empty in the file clear the current value. Columns missing from the file keep
              their values.
            </p>
          )}
          {(check.rowsWithoutSteps > 0 || check.repeatedInFile.length > 0) && (
            <ul className="list-disc pl-5 text-text-muted">
              {check.rowsWithoutSteps > 0 && <li>{plural(check.rowsWithoutSteps, 'row')} without steps (task_content) will be skipped.</li>}
              {check.repeatedInFile.length > 0 && <li>Test IDs used more than once in the file ({check.repeatedInFile.join(', ')}): later rows get new IDs.</li>}
            </ul>
          )}
          <p className="text-label font-normal text-text-muted">Suites are created from the category column; rows without a category go to “Not in a suite”.</p>
        </div>
      )}

      {step === 3 && preview && (
        <div className="flex flex-col gap-3">
          <Table>
            <thead>
              <tr>
                <Th>Suite</Th>
                <Th>New tests</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {preview.suites.map((s) => (
                <Tr key={s.name ?? 'none'}>
                  <Td>
                    {s.name ?? 'Not in a suite'} {s.isNew && <Chip tone="info">New suite</Chip>}
                  </Td>
                  <Td>{s.create}</Td>
                  <Td>{s.update}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {preview.skipped > 0 && <p className="text-text-muted">{plural(preview.skipped, 'row')} skipped.</p>}
          {choice === 'update' && preview.fieldsCleared > 0 && <p className="text-cc-text">{plural(preview.fieldsCleared, 'field')} will be cleared (empty cells in the file).</p>}
          {choice === 'update' && check && check.duplicates.length > 0 && (
            <p className="text-label font-normal text-text-muted">Updated tests get a new version only when something changed; changed steps or expected results reset their script (BR-SCRIPT-02).</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-failed-text">
          {error}
        </p>
      )}
    </Dialog>
  );
}
