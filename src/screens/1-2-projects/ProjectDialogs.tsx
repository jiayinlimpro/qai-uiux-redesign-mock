import { useState } from 'react';
import { deleteProject, DuplicateProjectNameError, updateProject } from '@/data/api';
import type { Project } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { deleteConfirmed, projectNameError } from '@/lib/projectRules';

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string };
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** More › Rename (1.2). Duplicate names are blocked inline as you type (BR-PROJECT-01). */
export function RenameProjectDialog({
  project,
  otherNames,
  onClose,
  onDone,
}: {
  project: Project;
  otherNames: string[];
  onClose: () => void;
  onDone: (p: Project) => void;
}) {
  const [name, setName] = useState(project.name);
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const [touched, setTouched] = useState(false);
  const [takenOnSave, setTakenOnSave] = useState<string[]>([]);
  const nameError = projectNameError(name, [...otherNames, ...takenOnSave]);
  // "Enter a name" waits until the field was left; "already exists" shows at once.
  const error = nameError && (touched || name.trim() !== '') ? nameError : undefined;

  async function save() {
    setTouched(true);
    if (nameError) return;
    setState({ kind: 'saving' });
    try {
      onDone(await updateProject({ ...project, name }));
    } catch (e) {
      if (e instanceof DuplicateProjectNameError) {
        setTakenOnSave((list) => [...list, name]); // someone else took it meanwhile: show it inline
        setState({ kind: 'idle' });
        return;
      }
      setState({ kind: 'error', message: message(e) });
    }
  }

  return (
    <Dialog
      title="Rename project"
      size="sm"
      onClose={onClose}
      onSubmit={() => void save()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={state.kind === 'saving'}>
            {state.kind === 'saving' ? 'Saving…' : 'Rename'}
          </Button>
        </>
      }
    >
      <Field label="Project name" required error={error}>
        {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} />}
      </Field>
      {state.kind === 'error' && (
        <p role="alert" className="mt-3 text-failed-text">
          Couldn't rename: {state.message}
        </p>
      )}
    </Dialog>
  );
}

/** More › Delete (1.2): confirmation by typing the project name. */
export function DeleteProjectDialog({ project, onClose, onDone }: { project: Project; onClose: () => void; onDone: () => void }) {
  const [typed, setTyped] = useState('');
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const ok = deleteConfirmed(project.name, typed);

  async function remove() {
    if (!ok) return;
    setState({ kind: 'saving' });
    try {
      await deleteProject(project.id);
      onDone();
    } catch (e) {
      setState({ kind: 'error', message: message(e) });
    }
  }

  return (
    <Dialog
      title={`Delete ${project.name}?`}
      size="sm"
      onClose={onClose}
      onSubmit={() => void remove()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={!ok || state.kind === 'saving'}>
            {state.kind === 'saving' ? 'Deleting…' : 'Delete project'}
          </Button>
        </>
      }
    >
      <p>
        This deletes the project and everything in it: suites, tests, runs, results, knowledge and AI explore chats. It can't be undone. Export the project
        first if you may need it again.
      </p>
      <Field label={`Type ${project.name} to confirm`} className="mt-4">
        {(p) => <Input {...p} autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />}
      </Field>
      {state.kind === 'error' && (
        <p role="alert" className="mt-3 text-failed-text">
          Couldn't delete: {state.message}
        </p>
      )}
    </Dialog>
  );
}
