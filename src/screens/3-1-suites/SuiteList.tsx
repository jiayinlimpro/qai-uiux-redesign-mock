import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Copy, Ellipsis, Folder, FolderInput, FolderPlus, Play, Plus, Upload } from 'lucide-react';
import type { ID, Status, Suite, TestCase } from '@/data/types';
import { Button, buttonClasses } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SearchInput } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented';
import { Menu } from '@/components/ui/menu';
import { StatusIcon, statusIcons } from '@/components/StatusIcon';
import { BulkBar } from '@/components/BulkBar';
import { useProject } from '@/app/projectContext';
import { to, type TestTab } from '@/app/routes';
import { NEEDS_FIXING_TIP, showsNeedsFixingBadge } from '@/lib/exploreRules';
import { plural } from '@/lib/format';
import { statusLabels } from '@/lib/labels';
import { countByStatus, type StatusCounts } from '@/lib/status';
import { buildSuiteTree, hasActiveFilters, type SuiteGroup, type TestFilters } from '@/lib/suiteRules';
import { cn } from '@/lib/utils';
import { useSuites } from './suitesContext';
import { SuiteDialog } from '@/components/SuiteDialog';
import { useDeleteSuite } from './SuiteDialogs';

/** Latest-status filter order (D80): worst first, so problems are one click away. */
const FILTER_STATUSES: Status[] = ['failed', 'couldnt_complete', 'passed', 'not_run'];
const BAR_ORDER: Status[] = ['passed', 'failed', 'couldnt_complete', 'not_run'];
const barTone: Record<Status, string> = { passed: 'bg-passed-dot', failed: 'bg-failed-dot', couldnt_complete: 'bg-cc-dot', not_run: 'bg-notrun' };

const groupKey = (g: Pick<SuiteGroup, 'suite'>) => g.suite?.id ?? 'none';

/** 3.1 left pane: header + selection actions, search + latest status filter (BR-LIST-01), tree with checkboxes (BR-LIST-02). */
export function SuiteList() {
  const project = useProject();
  const s = useSuites();
  const { testId: selectedId } = useParams();
  const tab = (useSearchParams()[0].get('tab') as TestTab | null) ?? undefined;
  const [filters, setFilters] = useState<TestFilters>({ search: '', status: 'all' });
  // Overview › "Organise in Suites" opens Suites with Not in a suite expanded (03 § Key cross-links).
  const expandRequest = (useLocation().state as { expand?: string } | null)?.expand;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(expandRequest === 'not-in-a-suite' ? ['none'] : []));
  /** The Suite dialog (D78): { suite } = Edit suite, {} = New suite. */
  const [suiteDialog, setSuiteDialog] = useState<{ suite?: Suite } | null>(null);
  const [deleteSuite, deleteDialog] = useDeleteSuite();

  const tree = useMemo(() => buildSuiteTree(s.suites, s.tests, s.statusOf, filters), [s.suites, s.tests, s.statusOf, filters]);
  const filtering = hasActiveFilters(filters);
  const shownCount = tree.reduce((n, g) => n + g.tests.length, 0);
  const suiteCount = s.suites.length;
  // Counts are computed from the latest statuses (rule 5, BR-STATUS-01).
  const allCounts = useMemo(() => countByStatus(s.tests.map((t) => ({ status: s.statusOf(t.id) }))), [s.tests, s.statusOf]);
  const suiteCounts = (suiteId: ID | null) => countByStatus(s.tests.filter((t) => t.suiteId === suiteId).map((t) => ({ status: s.statusOf(t.id) })));

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
          {/* D80: New test is the primary action (last); Import is icon-only; New suite in between. Ticked tests get the bulk bar. */}
          <div className="flex gap-1.5">
            <Link to={to.importTests(project.id)} className={buttonClasses({ size: 'sm', iconOnly: true })} aria-label="Import tests" title="Import">
              <Upload aria-hidden="true" />
            </Link>
            <Button size="sm" icon={FolderPlus} onClick={() => setSuiteDialog({})}>
              New suite
            </Button>
            <Link to={to.newTest(project.id)} className={buttonClasses({ size: 'sm', variant: 'primary' })}>
              <Plus aria-hidden="true" />
              New test
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2.5">
          <SearchInput placeholder="Search by ID or title" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
          <SegmentedControl
            label="Latest status"
            fill
            value={filters.status}
            onChange={(status) => setFilters((f) => ({ ...f, status }))}
            options={[
              { value: 'all' as const, label: `All ${s.tests.length}` },
              ...FILTER_STATUSES.map((st) => ({
                value: st,
                icon: statusIcons[st].Icon,
                iconClassName: statusIcons[st].className,
                label: allCounts[st],
                ariaLabel: `${statusLabels[st]}, ${allCounts[st]}`,
              })),
            ]}
          />
          <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
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
          {filtering && (
            <Button size="xs" variant="ghost" onClick={() => setFilters({ search: '', status: 'all' })}>
              Clear filters
            </Button>
          )}
          </div>
        </div>
      </div>

      <div className={cn('relative min-h-0 flex-1 overflow-auto p-2', selected.length > 0 && 'pb-20')}>
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
              counts={suiteCounts(g.suite?.id ?? null)}
              onEdit={g.suite ? () => setSuiteDialog({ suite: g.suite! }) : undefined}
              onDelete={g.suite ? () => void deleteSuite(g.suite!, g.total) : undefined}
            />
          ))}
        </ul>
      </div>
      {selected.length > 0 && (
        <BulkBar label={`${plural(selected.length, 'test')} selected`} count={selected.length} onClear={() => s.setSelection(new Set())}>
          <Button size="sm" variant="inverse" icon={FolderInput} onClick={() => s.openMove(selected)}>
            Move to suite…
          </Button>
          <Button size="sm" variant="inverse" icon={Copy} onClick={() => void s.clone(selected)}>
            Clone
          </Button>
          <Button size="sm" variant="primary" icon={Play} className="ml-1" onClick={() => s.openRun(selected)}>
            Run {selected.length} selected
          </Button>
        </BulkBar>
      )}
      {suiteDialog && (
        <SuiteDialog
          suite={suiteDialog.suite}
          suites={s.suites}
          onClose={() => setSuiteDialog(null)}
          onSaved={(saved) => {
            const created = !suiteDialog.suite;
            setSuiteDialog(null);
            s.reload();
            if (!created) {
              s.showToast({ text: `Suite saved as ${saved.name}` });
              return;
            }
            // D78: a new suite is empty, so clear filters that would hide it, open it and scroll to it.
            if (filtering) setFilters({ search: '', status: 'all' });
            setExpanded((prev) => new Set([...prev, saved.id]));
            setTimeout(() => document.querySelector(`[data-suite-row="${saved.id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 400);
            s.showToast({ text: `Suite ${saved.name} created` });
          }}
        />
      )}
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
  counts: StatusCounts;
  onEdit?: () => void;
  onDelete?: () => void;
}

function SuiteRow({ group, open, filtering, onToggle, selection, onSelect, selectedId, highlight, tab, statusOf, hasResult, counts, onEdit, onDelete }: SuiteRowProps) {
  const project = useProject();
  const visibleIds = group.tests.map((t) => t.id);
  const picked = visibleIds.filter((id) => selection.has(id)).length;
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (box.current) box.current.indeterminate = picked > 0 && picked < visibleIds.length;
  }, [picked, visibleIds.length]);
  const listId = `suite-list-${group.suite?.id ?? 'none'}`;

  return (
    <li data-suite-row={group.suite?.id ?? 'none'}>
      <div className="group flex h-9 items-center gap-2 rounded-control px-2 hover:bg-hover">
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
          {open ? <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" /> : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />}
          <Folder aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />
          <span className="truncate font-semibold">{group.name}</span>
        </button>
        <SuiteBar counts={counts} />
        <span className="w-14 shrink-0 text-right text-label font-normal tabular-nums text-text-muted">{filtering ? `${group.tests.length} match` : plural(group.total, 'test')}</span>
        {onEdit && onDelete && (
          <Menu
            variant="ghost"
            size="xs"
            iconOnly
            label={<Ellipsis aria-hidden="true" />}
            accessibleLabel={`More actions for suite ${group.name}`}
            items={[
              { label: 'Edit suite', onSelect: onEdit },
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
              needsFixing={showsNeedsFixingBadge(t, hasResult(t.id))}
              checked={selection.has(t.id)}
              onCheck={(on) => onSelect([t.id], on)}
              current={t.id === selectedId}
              highlighted={highlight.has(t.id)}
              href={to.suiteTest(project.id, t.id, tab)}
            />
          ))}
          {group.tests.length === 0 && (
            <li className="px-2 py-1 text-label font-normal text-text-muted">
              No tests yet. Create a{' '}
              <Link to={to.newTest(project.id)} className="text-accent underline underline-offset-2">
                New test
              </Link>
              , or select tests and use Move to suite…
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

/**
 * Suite pass/fail bar (D80): the latest status of each test in the suite, so problem suites stand out.
 * The counts are its accessible name (colour is never the only signal).
 */
function SuiteBar({ counts }: { counts: StatusCounts }) {
  const total = BAR_ORDER.reduce((n, st) => n + counts[st], 0);
  if (total === 0) return <span className="w-12 shrink-0" />;
  const label = BAR_ORDER.filter((st) => counts[st] > 0)
    .map((st) => `${counts[st]} ${statusLabels[st].toLowerCase()}`)
    .join(', ');
  return (
    <span role="img" aria-label={label} title={label} className="flex h-1 w-12 shrink-0 gap-px overflow-hidden rounded-pill">
      {BAR_ORDER.filter((st) => counts[st] > 0).map((st) => (
        <span key={st} className={barTone[st]} style={{ flexGrow: counts[st] }} />
      ))}
    </span>
  );
}

function TestRow({
  test,
  status,
  needsFixing,
  checked,
  onCheck,
  current,
  highlighted,
  href,
}: {
  test: TestCase;
  status: Status;
  needsFixing: boolean;
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
        'flex h-8 items-center gap-2 rounded-control px-2 text-dense transition-colors duration-700',
        current ? 'bg-accent-soft' : 'hover:bg-hover',
        highlighted && !current && 'bg-cc-fill',
      )}
    >
      <input type="checkbox" className="h-4 w-4 shrink-0 accent-accent" aria-label={`Select ${test.testId} ${test.title}`} checked={checked} onChange={(e) => onCheck(e.target.checked)} />
      <Link to={href} aria-current={current ? 'page' : undefined} className={cn('flex min-w-0 flex-1 items-baseline gap-2 rounded-control', current && 'font-semibold text-accent-soft-text')}>
        <span className={cn('shrink-0 font-mono text-label font-normal', current ? 'text-accent-soft-text' : 'text-text-muted')}>{test.testId}</span>
        <span className="truncate">{test.title}</span>
      </Link>
      {test.isNew && <Chip tone="info">New</Chip>}
      {needsFixing && (
        <span title={NEEDS_FIXING_TIP}>
          <Chip tone="cc">Needs fixing</Chip>
        </span>
      )}
      <StatusIcon status={status} className="[&_svg]:size-3.5" />
    </li>
  );
}
