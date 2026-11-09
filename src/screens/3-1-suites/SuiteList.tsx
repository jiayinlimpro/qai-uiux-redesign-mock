import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ID, Status, Suite, TestCase } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input, Select } from '@/components/ui/field';
import { Menu } from '@/components/ui/menu';
import { StatusDot } from '@/components/StatusViews';
import { useProject } from '@/app/projectContext';
import { to, type TestTab } from '@/app/routes';
import { showsLikelyBugBadge } from '@/lib/exploreRules';
import { plural } from '@/lib/format';
import { statusLabels } from '@/lib/labels';
import { buildSuiteTree, hasActiveFilters, type SuiteGroup, type TestFilters } from '@/lib/suiteRules';
import { cn } from '@/lib/utils';
import { useSuites } from './suitesContext';
import { SuiteDialog, useDeleteSuite } from './SuiteDialogs';

const statusOptions: { value: Status | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'passed', label: statusLabels.passed },
  { value: 'failed', label: statusLabels.failed },
  { value: 'couldnt_complete', label: statusLabels.couldnt_complete },
  { value: 'not_run', label: statusLabels.not_run },
];

const groupKey = (g: Pick<SuiteGroup, 'suite'>) => g.suite?.id ?? 'none';

/** 3.1 left pane: header + selection actions, search + latest status filter (BR-LIST-01), tree with checkboxes (BR-LIST-02). */
export function SuiteList() {
  const project = useProject();
  const s = useSuites();
  const { testId: selectedId } = useParams();
  const tab = (useSearchParams()[0].get('tab') as TestTab | null) ?? undefined;
  const [filters, setFilters] = useState<TestFilters>({ search: '', status: 'all' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<Suite | null>(null);
  const [deleteSuite, deleteDialog] = useDeleteSuite();

  const tree = useMemo(() => buildSuiteTree(s.suites, s.tests, s.statusOf, filters), [s.suites, s.tests, s.statusOf, filters]);
  const filtering = hasActiveFilters(filters);
  const shownCount = tree.reduce((n, g) => n + g.tests.length, 0);
  const suiteCount = s.suites.length;

  // The selected test's suite opens; so do suites holding highlighted tests (new copies).
  const testsById = useMemo(() => new Map(s.tests.map((t) => [t.id, t])), [s.tests]);
  useEffect(() => {
    const open = [selectedId, ...s.highlight].map((id) => (id ? testsById.get(id) : undefined)).filter((t): t is TestCase => Boolean(t));
    if (open.length === 0) return;
    setExpanded((prev) => new Set([...prev, ...open.map((t) => t.suiteId ?? 'none')]));
  }, [selectedId, s.highlight, testsById]);

  const isOpen = (g: SuiteGroup) => filtering || expanded.has(groupKey(g)); // filters auto-expand matches
  const toggleOpen = (g: SuiteGroup) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey(g))) next.delete(groupKey(g));
      else next.add(groupKey(g));
      return next;
    });

  const selected = [...s.selection].filter((id) => testsById.has(id));
  const setSelected = (ids: ID[], on: boolean) => {
    const next = new Set(s.selection);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    s.setSelection(next);
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-h2">Suites</h1>
          {selected.length === 0 ? (
            <div className="flex gap-2">
              <Link to={to.newTest(project.id)} className={buttonClasses({ size: 'sm' })}>
                New test
              </Link>
              <Link to={to.importTests(project.id)} className={buttonClasses({ size: 'sm' })}>
                Import
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label={`${plural(selected.length, 'test')} selected`}>
              <Button size="sm" onClick={() => s.openMove(selected)}>
                Move to suite…
              </Button>
              <Button size="sm" onClick={() => void s.clone(selected)}>
                Clone
              </Button>
              <Button size="sm" variant="primary" onClick={() => s.openRun(selected)}>
                Run {selected.length} selected
              </Button>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Input type="search" aria-label="Search by ID or title" placeholder="Search by ID or title" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-label text-text-muted">
              Latest status
              <Select className="h-8 w-auto text-base" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as TestFilters['status'] }))}>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
            {filtering && (
              <Button size="sm" variant="ghost" onClick={() => setFilters({ search: '', status: 'all' })}>
                Clear filters
              </Button>
            )}
          </div>
          <p className="text-label font-normal text-text-muted" aria-live="polite">
            {filtering ? `${shownCount} of ${plural(s.tests.length, 'test')} match` : `${plural(s.tests.length, 'test')} in ${plural(suiteCount, 'suite')}`}
            {selected.length > 0 && (
              <>
                {' · '}
                {selected.length} selected ·{' '}
                <button type="button" className="text-accent underline-offset-2 hover:underline" onClick={() => s.setSelection(new Set())}>
                  Clear selection
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto p-2">
        {tree.length === 0 && <p className="p-4 text-text-muted">No tests match the filters.</p>}
        <ul aria-label="Suites and tests">
          {tree.map((g) => (
            <SuiteRow
              key={groupKey(g)}
              group={g}
              open={isOpen(g)}
              filtering={filtering}
              onToggle={() => toggleOpen(g)}
              selection={s.selection}
              onSelect={setSelected}
              selectedId={selectedId}
              highlight={s.highlight}
              tab={tab}
              statusOf={s.statusOf}
              hasResult={(id) => Boolean(s.latest[id])}
              onRename={g.suite ? () => setRenaming(g.suite) : undefined}
              onDelete={g.suite ? () => void deleteSuite(g.suite!, g.total) : undefined}
            />
          ))}
        </ul>
      </div>
      {renaming && <SuiteDialog suite={renaming} onClose={() => setRenaming(null)} />}
      {deleteDialog}
    </div>
  );
}

interface SuiteRowProps {
  group: SuiteGroup;
  open: boolean;
  filtering: boolean;
  onToggle: () => void;
  selection: Set<ID>;
  onSelect: (ids: ID[], on: boolean) => void;
  selectedId?: string;
  highlight: Set<ID>;
  tab?: TestTab;
  statusOf: (id: ID) => Status;
  hasResult: (id: ID) => boolean;
  onRename?: () => void;
  onDelete?: () => void;
}

function SuiteRow({ group, open, filtering, onToggle, selection, onSelect, selectedId, highlight, tab, statusOf, hasResult, onRename, onDelete }: SuiteRowProps) {
  const project = useProject();
  const visibleIds = group.tests.map((t) => t.id);
  const picked = visibleIds.filter((id) => selection.has(id)).length;
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (box.current) box.current.indeterminate = picked > 0 && picked < visibleIds.length;
  }, [picked, visibleIds.length]);
  const listId = `suite-list-${group.suite?.id ?? 'none'}`;

  return (
    <li>
      <div className="group flex items-center gap-2 rounded-control px-2 py-1.5 hover:bg-bg">
        <input
          ref={box}
          type="checkbox"
          className="h-4 w-4 shrink-0 accent-accent"
          aria-label={`Select all ${filtering ? 'matching ' : ''}tests in ${group.name}`}
          checked={visibleIds.length > 0 && picked === visibleIds.length}
          disabled={visibleIds.length === 0}
          onChange={(e) => onSelect(visibleIds, e.target.checked)}
        />
        <button type="button" aria-expanded={open} aria-controls={listId} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-1 rounded-control text-left">
          {open ? <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" /> : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0" />}
          <span className="truncate font-semibold">{group.name}</span>
        </button>
        <span className="shrink-0 text-label font-normal text-text-muted">{filtering ? `${group.tests.length} match` : group.suite ? plural(group.total, 'test') : `${plural(group.total, 'test')}`}</span>
        {onRename && onDelete && (
          <Menu
            variant="ghost"
            label="⋯"
            accessibleLabel={`More actions for suite ${group.name}`}
            items={[
              { label: 'Rename suite', onSelect: onRename },
              { label: 'Delete suite', onSelect: onDelete, danger: true },
            ]}
          />
        )}
      </div>
      {open && (
        <ul id={listId} aria-label={group.name} className="ml-6">
          {group.tests.map((t) => (
            <TestRow
              key={t.id}
              test={t}
              status={statusOf(t.id)}
              likelyBug={showsLikelyBugBadge(t, hasResult(t.id))}
              checked={selection.has(t.id)}
              onCheck={(on) => onSelect([t.id], on)}
              current={t.id === selectedId}
              highlighted={highlight.has(t.id)}
              href={to.suiteTest(project.id, t.id, tab)}
            />
          ))}
          {group.tests.length === 0 && <li className="px-2 py-1 text-label font-normal text-text-muted">No tests in this suite yet.</li>}
        </ul>
      )}
    </li>
  );
}

function TestRow({
  test,
  status,
  likelyBug,
  checked,
  onCheck,
  current,
  highlighted,
  href,
}: {
  test: TestCase;
  status: Status;
  likelyBug: boolean;
  checked: boolean;
  onCheck: (on: boolean) => void;
  current: boolean;
  highlighted: boolean;
  href: string;
}) {
  return (
    <li
      data-test-row={test.id}
      className={cn(
        'flex items-center gap-2 rounded-control px-2 py-1.5 transition-colors duration-700',
        current ? 'bg-accent-soft' : 'hover:bg-bg',
        highlighted && !current && 'bg-cc-fill',
      )}
    >
      <input type="checkbox" className="h-4 w-4 shrink-0 accent-accent" aria-label={`Select ${test.testId} ${test.title}`} checked={checked} onChange={(e) => onCheck(e.target.checked)} />
      <Link to={href} aria-current={current ? 'page' : undefined} className={cn('flex min-w-0 flex-1 items-baseline gap-2 rounded-control', current && 'font-semibold text-accent-soft-text')}>
        <span className="shrink-0 text-text-muted">{test.testId}</span>
        <span className="truncate">{test.title}</span>
      </Link>
      {test.isNew && <Chip tone="info">New</Chip>}
      {likelyBug && (
        <span title="Found during AI explore, not yet confirmed by a run">
          <Chip tone="failed">Likely bug</Chip>
        </span>
      )}
      <StatusDot status={status} className="shrink-0" />
    </li>
  );
}
