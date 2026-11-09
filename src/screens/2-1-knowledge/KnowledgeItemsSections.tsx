import { useRef, useState } from 'react';
import { deleteKnowledge, saveKnowledge, type KnowledgeInput } from '@/data/api';
import type { KnowledgeItem, Scope, Suite, TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { ScopePicker } from '@/components/ScopePicker';
import { SectionCard, SectionEmpty } from '@/components/SectionCard';
import { StatusLine, errorText, type SaveStatus } from '@/components/StatusLine';
import { useConfirm } from '@/components/useConfirm';
import { useProject } from '@/app/projectContext';
import {
  checkDocumentFile,
  DOCUMENT_ACCEPT,
  documentTypes,
  scopeLabel,
  skillKindFor,
  skillKinds,
  skipReasonLabels,
  summarizeSkillFolder,
  usedByLabels,
  type FolderSummary,
} from '@/lib/knowledge';
import { formatDate, plural } from '@/lib/format';

interface SectionProps {
  items: KnowledgeItem[];
  suites: Suite[];
  tests: TestCase[];
  onChanged: () => void;
}
type UsedBy = NonNullable<KnowledgeItem['usedBy']>;

// ====================================================================== Documents
/** Knowledge › Documents: Name · Type · Applies to · Uploaded · Replace · Edit scope · Delete. "Upload". */
export function DocumentsSection({ items, suites, tests, onChanged }: SectionProps) {
  const project = useProject();
  const docs = items.filter((k) => k.kind === 'document');
  const uploadInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<KnowledgeItem | null>(null);
  const [uploading, setUploading] = useState<File | null>(null);
  const [scoping, setScoping] = useState<KnowledgeItem | null>(null);
  const [status, setStatus] = useState<SaveStatus>(null);
  const [confirm, confirmDialog] = useConfirm();
  const done = (text: string) => {
    setStatus({ tone: 'ok', text });
    onChanged();
  };

  /** D39: only the listed types and sizes; anything else is refused with the reason. */
  function accepted(file: File): boolean {
    const check = checkDocumentFile(file.name, file.size);
    if (!check.ok) setStatus({ tone: 'error', text: check.message });
    return check.ok;
  }

  async function replace(item: KnowledgeItem, file: File) {
    try {
      await saveKnowledge({ ...item, name: file.name }, file);
      done(`Replaced ${item.name} with ${file.name}.`);
    } catch (e) {
      setStatus({ tone: 'error', text: `Couldn't replace: ${errorText(e)}` });
    }
  }

  async function remove(item: KnowledgeItem) {
    if (!(await confirm({ title: `Delete ${item.name}?`, danger: true, confirmLabel: 'Delete document', body: <p>The AI stops using it, and tests linked to it are unlinked.</p> }))) return;
    try {
      await deleteKnowledge(item.id);
      done(`Deleted ${item.name}.`);
    } catch (e) {
      setStatus({ tone: 'error', text: `Couldn't delete: ${errorText(e)}` });
    }
  }

  return (
    <SectionCard
      id="documents"
      title="Documents"
      action={
        <Button size="sm" onClick={() => uploadInput.current?.click()}>
          Upload
        </Button>
      }
    >
      <HiddenFileInput inputRef={uploadInput} accept={DOCUMENT_ACCEPT} onFiles={(files) => files[0] && accepted(files[0]) && setUploading(files[0])} />
      <HiddenFileInput inputRef={replaceInput} accept={DOCUMENT_ACCEPT} onFiles={(files) => replacing && files[0] && accepted(files[0]) && void replace(replacing, files[0])} />
      <p className="mb-3 text-label font-normal text-text-muted">
        Accepted: .pdf, .docx, .xlsx (up to 20 MB), .md, .txt, .csv, .json (up to 2 MB), .png, .jpg.
      </p>
      {docs.length === 0 ? (
        <SectionEmpty>No documents yet. Upload FRS, user stories or other documents the AI should read.</SectionEmpty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Applies to</Th>
              <Th>Uploaded</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <Tr key={d.id}>
                <Td>{d.name}</Td>
                <Td>{documentTypes.find((t) => t.value === d.docType)?.label ?? 'Other'}</Td>
                <Td>
                  <Chip>{scopeLabel(d.scope, suites, tests)}</Chip>
                </Td>
                <Td>{formatDate(d.uploadedAt)}</Td>
                <Td className="whitespace-nowrap text-right">
                  <div className="inline-flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setReplacing(d);
                        replaceInput.current?.click();
                      }}
                    >
                      Replace<span className="sr-only"> {d.name}</span>
                    </Button>
                    <Button size="sm" onClick={() => setScoping(d)}>
                      Edit scope<span className="sr-only"> of {d.name}</span>
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => void remove(d)}>
                      Delete<span className="sr-only"> {d.name}</span>
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <StatusLine status={status} />
      {uploading && (
        <UploadDocumentDialog
          file={uploading}
          projectId={project.id}
          suites={suites}
          tests={tests}
          onClose={() => setUploading(null)}
          onDone={(name) => {
            setUploading(null);
            done(`Uploaded ${name}.`);
          }}
        />
      )}
      {scoping && (
        <ScopeDialog
          item={scoping}
          suites={suites}
          tests={tests}
          onClose={() => setScoping(null)}
          onDone={() => {
            setScoping(null);
            done('Scope saved.');
          }}
        />
      )}
      {confirmDialog}
    </SectionCard>
  );
}

function UploadDocumentDialog({ file, projectId, suites, tests, onClose, onDone }: { file: File; projectId: string; suites: Suite[]; tests: TestCase[]; onClose: () => void; onDone: (name: string) => void }) {
  const [name, setName] = useState(file.name);
  // Type is required with no default (D39): an FRS is treated as authoritative (BR-REASON-05), so it must be chosen on purpose.
  const [docType, setDocType] = useState<NonNullable<KnowledgeItem['docType']> | ''>('');
  const [scope, setScope] = useState<Scope>({ kind: 'project' });
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  async function save() {
    if (!name.trim() || !docType) return;
    setState({ kind: 'saving' });
    try {
      await saveKnowledge({ projectId, kind: 'document', docType, name, scope }, file);
      onDone(name.trim());
    } catch (e) {
      setState({ kind: 'error', message: errorText(e) });
    }
  }

  return (
    <Dialog title="Upload document" onClose={onClose} onSubmit={() => void save()} footer={<DialogButtons onClose={onClose} saving={state.kind === 'saving'} label="Upload" disabled={!name.trim() || !docType} />}>
      <div className="flex flex-col gap-4">
        <Field label="Name" required error={name.trim() ? undefined : 'Enter a name.'}>
          {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Type" required hint="An FRS is treated as the source of truth when the AI decides between Product bug and Needs confirmation.">
          {(p) => (
            <Select {...p} value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)}>
              <option value="" disabled>
                Choose a type
              </option>
              {documentTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <ScopePicker value={scope} onChange={setScope} suites={suites} tests={tests} />
      </div>
      {state.kind === 'error' && <ErrorLine message={state.message} />}
    </Dialog>
  );
}

// ====================================================================== Skills
/**
 * Knowledge › Skills: Name · Kind · Applies to · Used by · Edit scope. "Load skill".
 * Folder loads skip dependency/build folders and secret files (legacy rule kept, lib/knowledge.ts).
 */
export function SkillsSection({ items, suites, tests, onChanged }: SectionProps) {
  const skills = items.filter((k) => k.kind === 'skill');
  const [loading, setLoading] = useState(false);
  const [scoping, setScoping] = useState<KnowledgeItem | null>(null);
  const [status, setStatus] = useState<SaveStatus>(null);
  const [confirm, confirmDialog] = useConfirm();
  const done = (text: string) => {
    setStatus({ tone: 'ok', text });
    onChanged();
  };

  async function remove(item: KnowledgeItem) {
    if (!(await confirm({ title: `Delete ${item.name}?`, danger: true, confirmLabel: 'Delete skill', body: <p>Runs and AI explore stop using it.</p> }))) return;
    try {
      await deleteKnowledge(item.id);
      done(`Deleted ${item.name}.`);
    } catch (e) {
      setStatus({ tone: 'error', text: `Couldn't delete: ${errorText(e)}` });
    }
  }

  return (
    <SectionCard
      id="skills"
      title="Skills"
      action={
        <Button size="sm" onClick={() => setLoading(true)}>
          Load skill
        </Button>
      }
    >
      {skills.length === 0 ? (
        <SectionEmpty>No skills yet. Load instructions, a codebase folder or a reference file for the AI to read.</SectionEmpty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Kind</Th>
              <Th>Applies to</Th>
              <Th>Used by</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s) => (
              <Tr key={s.id}>
                <Td>{s.name}</Td>
                <Td>{skillKinds.find((k) => k.value === s.skillKind)?.label}</Td>
                <Td>
                  <Chip>{scopeLabel(s.scope, suites, tests)}</Chip>
                </Td>
                <Td>{s.usedBy?.length ? s.usedBy.map((u) => usedByLabels[u]).join(' · ') : <span className="text-text-muted">Not used</span>}</Td>
                <Td className="whitespace-nowrap text-right">
                  <div className="inline-flex gap-2">
                    <Button size="sm" onClick={() => setScoping(s)}>
                      Edit scope<span className="sr-only"> of {s.name}</span>
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => void remove(s)}>
                      Delete<span className="sr-only"> {s.name}</span>
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <StatusLine status={status} />
      {loading && (
        <LoadSkillDialog
          suites={suites}
          tests={tests}
          onClose={() => setLoading(false)}
          onDone={(text) => {
            setLoading(false);
            done(text);
          }}
        />
      )}
      {scoping && (
        <ScopeDialog
          item={scoping}
          suites={suites}
          tests={tests}
          onClose={() => setScoping(null)}
          onDone={() => {
            setScoping(null);
            done('Scope saved.');
          }}
        />
      )}
      {confirmDialog}
    </SectionCard>
  );
}

type Picked = { name: string; isFolder: boolean; summary?: FolderSummary };

/** Load skill: a single file (Instructions or Reference by type) or a whole folder (Codebase). New skills are used by both. */
function LoadSkillDialog({ suites, tests, onClose, onDone }: { suites: Suite[]; tests: TestCase[]; onClose: () => void; onDone: (status: string) => void }) {
  const project = useProject();
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [scope, setScope] = useState<Scope>({ kind: 'project' });
  const [usedBy, setUsedBy] = useState<UsedBy>(['runs', 'ai_explore']);
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  const onFolder = (files: File[]) => {
    if (files.length === 0) return;
    const entries = files.map((f) => ({ path: (f.webkitRelativePath || f.name).split('/').slice(1).join('/') || f.name, size: f.size }));
    setPicked({ name: (files[0]!.webkitRelativePath || files[0]!.name).split('/')[0]!, isFolder: true, summary: summarizeSkillFolder(entries) });
  };
  const kind = picked ? skillKindFor(picked.name, picked.isFolder) : null;
  const blocked = !picked || picked.summary?.overLimit === true || picked.summary?.kept === 0;

  async function save() {
    if (!picked || !kind || blocked) return;
    setState({ kind: 'saving' });
    try {
      const input: KnowledgeInput = { projectId: project.id, kind: 'skill', skillKind: kind, name: picked.name, scope, usedBy };
      await saveKnowledge(input, { name: picked.name });
      onDone(`Loaded ${picked.name} as ${skillKinds.find((k) => k.value === kind)!.label.toLowerCase()}.`);
    } catch (e) {
      setState({ kind: 'error', message: errorText(e) });
    }
  }

  return (
    <Dialog title="Load skill" onClose={onClose} onSubmit={() => void save()} footer={<DialogButtons onClose={onClose} saving={state.kind === 'saving'} label="Load skill" disabled={blocked} />}>
      <HiddenFileInput inputRef={fileInput} onFiles={(files) => files[0] && setPicked({ name: files[0].name, isFolder: false })} />
      <HiddenFileInput inputRef={folderInput} folder onFiles={onFolder} />
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => fileInput.current?.click()}>
              Choose a file
            </Button>
            <Button size="sm" onClick={() => folderInput.current?.click()}>
              Choose a folder
            </Button>
          </div>
          <p className="mt-2 text-label font-normal text-text-muted">
            A .md, .txt, .pdf or .docx file is loaded as instructions, a folder as a codebase, any other file as reference. Folder loads skip dependency and build folders (e.g.
            node_modules, .git, dist), binaries, logs and files that may contain secrets (e.g. .env, *.pem, *.key). Limit: 5000 files / 100 MB per folder.
          </p>
        </div>
        {picked && (
          <div aria-live="polite" className="rounded-control border border-border bg-bg px-3 py-2">
            <p>
              <span className="font-semibold">{picked.name}</span> · {skillKinds.find((k) => k.value === kind)?.label}
            </p>
            {picked.summary && (
              <p className={picked.summary.overLimit || picked.summary.kept === 0 ? 'text-failed-text' : 'text-text-muted'}>
                {picked.summary.kept === 0
                  ? 'Nothing to load: every file in this folder is skipped.'
                  : picked.summary.overLimit
                    ? 'This folder is over the limit of 5000 files / 100 MB, even after skipping. Choose a smaller folder.'
                    : `${plural(picked.summary.kept, 'file')} to load · ${plural(picked.summary.skipped, 'file')} skipped`}
              </p>
            )}
            {picked.summary && picked.summary.skippedEntries.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-label text-accent">Show what was skipped ({picked.summary.skippedEntries.length})</summary>
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-label font-normal">
                  {picked.summary.skippedEntries.map((s) => (
                    <li key={s.path}>
                      <span className="font-mono">{s.path}</span> <span className="text-text-muted">· {skipReasonLabels[s.reason]}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        <ScopePicker value={scope} onChange={setScope} suites={suites} tests={tests} />
        <UsedByPicker value={usedBy} onChange={setUsedBy} />
      </div>
      {state.kind === 'error' && <ErrorLine message={state.message} />}
    </Dialog>
  );
}

// ====================================================================== shared
/** Edit scope (documents and skills). Skills also choose where they are used. */
function ScopeDialog({ item, suites, tests, onClose, onDone }: { item: KnowledgeItem; suites: Suite[]; tests: TestCase[]; onClose: () => void; onDone: () => void }) {
  const [scope, setScope] = useState<Scope>(item.scope);
  const [usedBy, setUsedBy] = useState<UsedBy>(item.usedBy ?? []);
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  async function save() {
    setState({ kind: 'saving' });
    try {
      await saveKnowledge({ ...item, scope, ...(item.kind === 'skill' ? { usedBy } : {}) });
      onDone();
    } catch (e) {
      setState({ kind: 'error', message: errorText(e) });
    }
  }

  return (
    <Dialog title={`Edit scope · ${item.name}`} size="sm" onClose={onClose} onSubmit={() => void save()} footer={<DialogButtons onClose={onClose} saving={state.kind === 'saving'} label="Save" />}>
      <div className="flex flex-col gap-4">
        <ScopePicker value={scope} onChange={setScope} suites={suites} tests={tests} />
        {item.kind === 'skill' && <UsedByPicker value={usedBy} onChange={setUsedBy} />}
      </div>
      {state.kind === 'error' && <ErrorLine message={state.message} />}
    </Dialog>
  );
}

function UsedByPicker({ value, onChange }: { value: UsedBy; onChange: (v: UsedBy) => void }) {
  const toggle = (k: 'runs' | 'ai_explore', on: boolean) => {
    const next = new Set(value);
    if (on) next.add(k);
    else next.delete(k);
    onChange((['runs', 'ai_explore'] as const).filter((x) => next.has(x)));
  };
  return (
    <fieldset>
      <legend className="mb-2 text-label text-text-muted">Used by</legend>
      <div className="flex gap-5">
        <Checkbox label="Runs" checked={value.includes('runs')} onChange={(e) => toggle('runs', e.target.checked)} />
        <Checkbox label="AI explore" checked={value.includes('ai_explore')} onChange={(e) => toggle('ai_explore', e.target.checked)} />
      </div>
    </fieldset>
  );
}

function HiddenFileInput({
  inputRef,
  onFiles,
  folder = false,
  accept,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  onFiles: (files: File[]) => void;
  folder?: boolean;
  accept?: string;
}) {
  return (
    <input
      ref={(el) => {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
        if (el && folder) el.setAttribute('webkitdirectory', ''); // folder picker (Chrome / Electron)
      }}
      type="file"
      accept={accept}
      hidden
      onChange={(e) => {
        onFiles(Array.from(e.target.files ?? []));
        e.target.value = '';
      }}
    />
  );
}

function DialogButtons({ onClose, saving, label, disabled = false }: { onClose: () => void; saving: boolean; label: string; disabled?: boolean }) {
  return (
    <>
      <Button onClick={onClose}>Cancel</Button>
      <Button type="submit" variant="primary" disabled={saving || disabled}>
        {saving ? 'Saving…' : label}
      </Button>
    </>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-4 text-failed-text">
      {message}
    </p>
  );
}
