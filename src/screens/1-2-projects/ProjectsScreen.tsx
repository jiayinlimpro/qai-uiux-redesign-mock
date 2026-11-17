import { useRef, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowRight, CircleCheck, Download, Ellipsis, FolderKanban, Plus, Upload } from 'lucide-react';
import { importProject, InvalidFileError, ProjectExistsError, type ExistingProjectChoice } from '@/data/api';
import { copyName } from '@/lib/projectRules';
import { ImportExistingDialog } from './ImportExistingDialog';
import type { Project } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { RunStateChip } from '@/components/RunStateChip';
import { StatusCountsCompact } from '@/components/StatusCountChips';
import { Menu } from '@/components/ui/menu';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { useAsync } from '@/app/hooks/useAsync';
import { to } from '@/app/routes';
import { ExportProjectDialog } from '@/components/ExportProjectDialog';
import { loadProjectRows, type ProjectRow } from './loadProjectRows';
import { DeleteProjectDialog, RenameProjectDialog } from '@/components/ProjectDialogs';

type Notice = { tone: 'ok' | 'error'; text: string } | null;

/** 1.2 Projects (screens/01-global.md). 1.3 New project opens over it as a child route. */
export function ProjectsScreen() {
  const rows = useAsync(loadProjectRows, []);
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const [existing, setExisting] = useState<{ file: File; projectName: string } | null>(null);
  const allNames = rows.status === 'ready' ? rows.data.map((r) => r.project.name) : [];

  /** Import; if the project is already here, ask Replace / Import as a copy / Cancel (BR-PROJECT-02). */
  async function runImport(file: File, choice?: ExistingProjectChoice) {
    try {
      const project = await importProject(file, choice);
      setExisting(null);
      setNotice({
        tone: 'ok',
        text: choice === 'replace' ? `Replaced ${project.name} with the imported file.` : choice === 'copy' ? `Imported as ${project.name}.` : `Imported ${project.name}.`,
      });
      rows.retry();
    } catch (e) {
      if (e instanceof ProjectExistsError && !choice) {
        setExisting({ file, projectName: e.projectName });
        return;
      }
      setExisting(null);
      setNotice({
        tone: 'error',
        text: e instanceof InvalidFileError ? e.message : `Couldn't import the project: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  async function onImportFile(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = '';
    if (file) await runImport(file);
  }

  const [exporting, setExporting] = useState<Project | null>(null);

  const actions = (
    <>
      <Button icon={Upload} onClick={() => fileInput.current?.click()}>
        Import project
      </Button>
      <Link to={to.newProject()} className={buttonClasses({ variant: 'primary' })}>
        <Plus aria-hidden="true" />
        New project
      </Link>
    </>
  );

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void onImportFile(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1">Projects</h1>
          <p className="text-text-muted">One project per client system. All data stays on this computer.</p>
        </div>
        {rows.status === 'ready' && rows.data.length > 0 && <div className="flex gap-2">{actions}</div>}
      </div>

      <div role="status" aria-live="polite" className="mt-4 empty:hidden">
        {notice && <p className={notice.tone === 'error' ? 'text-failed-text' : 'text-passed-text'}>{notice.text}</p>}
      </div>

      <div className="mt-5">
        {rows.status === 'loading' && <LoadingState label="Loading projects…" />}
        {rows.status === 'error' && <ErrorState title="Couldn't load projects" message={rows.error.message} onRetry={rows.retry} />}
        {rows.status === 'ready' && rows.data.length === 0 && (
          <EmptyState icon={FolderKanban} title="No projects yet" actions={actions}>
            Create a project, or import one someone exported for you.
          </EmptyState>
        )}
        {rows.status === 'ready' && rows.data.length > 0 && (
          <Table dense>
            <thead>
              <tr>
                <Th>Project</Th>
                <Th>Platforms</Th>
                <Th>Suites</Th>
                <Th>Last run</Th>
                <Th>Needs attention</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((row) => (
                <ProjectTableRow
                  key={row.project.id}
                  row={row}
                  onExport={() => setExporting(row.project)}
                  onRename={() => setRenaming(row.project)}
                  onDelete={() => setDeleting(row.project)}
                />
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {renaming && (
        <RenameProjectDialog
          project={renaming}
          otherNames={allNames.filter((n) => n !== renaming.name)}
          onClose={() => setRenaming(null)}
          onDone={(p) => {
            setRenaming(null);
            setNotice({ tone: 'ok', text: `Renamed to ${p.name}.` });
            rows.retry();
          }}
        />
      )}
      {deleting && (
        <DeleteProjectDialog
          project={deleting}
          onClose={() => setDeleting(null)}
          onDone={() => {
            setNotice({ tone: 'ok', text: `Deleted ${deleting.name}.` });
            setDeleting(null);
            rows.retry();
          }}
        />
      )}
      {exporting && (
        <ExportProjectDialog
          project={exporting}
          onClose={() => setExporting(null)}
          onDone={(text) => {
            setExporting(null);
            setNotice({ tone: 'ok', text });
          }}
        />
      )}
      {existing && (
        <ImportExistingDialog
          projectName={existing.projectName}
          copyAs={copyName(existing.projectName, allNames)}
          onChoose={(choice) => runImport(existing.file, choice)}
          onClose={() => setExisting(null)}
        />
      )}
      {/* 1.3 New project opens over this screen. */}
      <Outlet />
    </div>
  );
}

function ProjectTableRow({ row, onExport, onRename, onDelete }: { row: ProjectRow; onExport: () => void; onRename: () => void; onDelete: () => void }) {
  const { project, suiteCount, lastRun, needsAttention: na } = row;
  return (
    <Tr>
      <Td>
        <Link to={to.overview(project.id)} className="group/p inline-flex items-center gap-2.5 font-semibold">
          {/* A letter tile gives each project a recognisable mark (D80); the name is the link text. */}
          <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-control bg-accent-soft text-label uppercase text-accent-soft-text">
            {project.name.trim().charAt(0) || '?'}
          </span>
          <span className="text-accent group-hover/p:underline">{project.name}</span>
        </Link>
      </Td>
      <Td>{project.platforms.length > 0 ? project.platforms.map((a) => a.name).join(', ') : <span className="text-text-muted">No platforms yet</span>}</Td>
      <Td className="tabular-nums">{suiteCount}</Td>
      <Td>
        {lastRun ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="tabular-nums">Run #{lastRun.number}</span>
            <RunStateChip run={lastRun} />
          </span>
        ) : (
          <span className="text-text-muted">No runs yet</span>
        )}
      </Td>
      <Td className="whitespace-nowrap">
        {na.kind === 'no_completed_run' && <span className="text-text-muted">No completed run</span>}
        {na.kind === 'all_passed' && (
          <Chip tone="passed" icon={CircleCheck}>
            All passed
          </Chip>
        )}
        {na.kind === 'issues' && <StatusCountsCompact counts={{ passed: 0, failed: na.failed, couldnt_complete: na.couldntComplete, not_run: 0 }} />}
      </Td>
      <Td className="whitespace-nowrap text-right">
        <div className="inline-flex gap-1.5">
          <Button size="xs" icon={Download} onClick={onExport}>
            Export<span className="sr-only"> {project.name}</span>
          </Button>
          <Link to={to.overview(project.id)} className={buttonClasses({ size: 'xs' })}>
            Open<span className="sr-only"> {project.name}</span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Menu
            variant="ghost"
            size="xs"
            iconOnly
            label={<Ellipsis aria-hidden="true" />}
            accessibleLabel={`More actions for ${project.name}`}
            items={[
              { label: 'Rename', onSelect: onRename },
              { label: 'Delete', onSelect: onDelete, danger: true },
            ]}
          />
        </div>
      </Td>
    </Tr>
  );
}
