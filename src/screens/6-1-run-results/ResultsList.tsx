import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bug, ListFilter, RotateCcw, Sparkles, Tag, X } from 'lucide-react';
import type { Mode } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { BrowserMarks } from '@/components/StatusViews';
import { FilterSelect, SearchInput } from '@/components/ui/field';
import { Menu } from '@/components/ui/menu';
import { SegmentedControl } from '@/components/ui/segmented';
import { StatusIcon } from '@/components/StatusIcon';
import { BulkBar } from '@/components/BulkBar';
import { formatCost } from '@/lib/format';
import { modeLabels, reasonLabels, statusLabels } from '@/lib/labels';
import { browserMarks, hasActiveResultFilters, NO_RESULT_FILTERS, reasonOptions, rowDetails, type Reason, type ResultFilterState, type ResultRow } from '@/lib/resultRules';
import { cn } from '@/lib/utils';

export interface BulkActions {
  rerun: (rows: ResultRow[]) => void;
  rerunWithModel: (rows: ResultRow[], model: string) => void;
  copyBugReports: (rows: ResultRow[]) => void;
  knownIssue: (rows: ResultRow[]) => void;
}

const MODES: (Mode | 'all')[] = ['all', 'ai', 'script', 'data_rows'];

/**
 * 6.1 left: results list (screens/07-results.md). Toolbar: search · Reason pill (BR-LIST-03) · Mode segmented control ·
 * Worth a look toggle [PROPOSAL] · Clear filters; "Select all shown (n)"; floating bulk bar only when ≥1 selected (BR-LIST-04);
 * flat two-line rows sorted per BR-LIST-03, with a quick Re-run on hover or focus (D79).
 */
export function ResultsList({
  rows,
  shown,
  filters,
  setFilters,
  selection,
  setSelection,
  selectedKey,
  rowLink,
  models,
  actions,
}: {
  rows: ResultRow[];
  shown: ResultRow[];
  filters: ResultFilterState;
  setFilters: (f: ResultFilterState) => void;
  selection: Set<string>;
  setSelection: (s: Set<string>) => void;
  selectedKey: string | null;
  rowLink: (key: string) => string;
  models: string[];
  actions: BulkActions;
}) {
  const reasons = reasonOptions(filters.status);
  const selectedRows = rows.filter((r) => selection.has(r.key));
  const shownSelected = shown.filter((r) => selection.has(r.key)).length;
  const allShown = shown.length > 0 && shownSelected === shown.length;
  const selectAll = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = shownSelected > 0 && !allShown;
  }, [shownSelected, allShown]);

  const toggle = (key: string) => {
    const next = new Set(selection);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelection(next);
  };

  return (
    <div className="relative flex h-full flex-col bg-surface">
      <div className="flex flex-col gap-2.5 border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput className="min-w-[12rem] flex-1" placeholder="Search by ID or title" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          {reasons && (
            <FilterSelect label="Reason" icon={ListFilter} className="h-9 max-w-[10.5rem]" value={filters.reason} onChange={(e) => setFilters({ ...filters, reason: e.target.value as Reason | 'all' })}>
              <option value="all">All</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {reasonLabels[r]}
                </option>
              ))}
            </FilterSelect>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Mode"
            value={filters.mode}
            onChange={(mode) => setFilters({ ...filters, mode })}
            options={MODES.map((m) => ({ value: m, label: m === 'all' ? 'All' : modeLabels[m] }))}
          />
          <button
            type="button"
            aria-pressed={filters.worthALook}
            onClick={() => setFilters({ ...filters, worthALook: !filters.worthALook })}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-dense font-medium transition-colors duration-150',
              filters.worthALook ? 'border-accent bg-accent-soft text-accent-soft-text' : 'border-dashed border-border-control text-text hover:bg-hover',
            )}
          >
            <Sparkles aria-hidden="true" className="size-3.5" />
            Worth a look
            <Chip className="h-[18px] px-1.5 text-[11px]">Proposal</Chip>
          </button>
          {hasActiveResultFilters(filters) && (
            <Button size="sm" variant="ghost" icon={X} onClick={() => setFilters(NO_RESULT_FILTERS)}>
              Clear filters
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 text-label font-normal text-text-muted">
        <label className="inline-flex cursor-pointer items-center gap-2.5">
          <input
            ref={selectAll}
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-accent"
            checked={allShown}
            disabled={shown.length === 0}
            onChange={() => {
              const next = new Set(selection);
              for (const r of shown) if (allShown) next.delete(r.key);
              else next.add(r.key);
              setSelection(next);
            }}
          />
          Select all shown ({shown.length})
        </label>
        <span>Most severe first</span>
      </div>

      <div className={cn('min-h-0 flex-1 overflow-auto', selectedRows.length > 0 && 'pb-24')}>
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-text-muted">
            <p>No results match these filters.</p>
            <Button size="sm" icon={X} onClick={() => setFilters(NO_RESULT_FILTERS)}>
              Clear filters
            </Button>
          </div>
        ) : (
          <ul aria-label="Results">
            {shown.map((r) => (
              <ResultRowItem
                key={r.key}
                row={r}
                checked={selection.has(r.key)}
                onToggle={() => toggle(r.key)}
                selected={r.key === selectedKey}
                href={rowLink(r.key)}
                onRerun={r.deleted ? undefined : () => actions.rerun([r])}
              />
            ))}
          </ul>
        )}
      </div>

      {selectedRows.length > 0 && (
        <BulkBar label="Selected results" count={selectedRows.length} onClear={() => setSelection(new Set())}>
          <Button size="sm" variant="inverse" icon={RotateCcw} onClick={() => actions.rerun(selectedRows)}>
            Re-run
          </Button>
          <Menu label="With model…" variant="inverse" placement="up" items={models.map((m) => ({ label: m, onSelect: () => actions.rerunWithModel(selectedRows, m) }))} />
          <Button size="sm" variant="inverse" icon={Bug} onClick={() => actions.copyBugReports(selectedRows)}>
            Copy bug reports
          </Button>
          <Button size="sm" variant="inverse" icon={Tag} onClick={() => actions.knownIssue(selectedRows)}>
            Known issue
          </Button>
        </BulkBar>
      )}
    </div>
  );
}

/**
 * ResultRow (08): checkbox · status icon · ID · title · Worth a look · Known issue / "<reason> · <mode> · <suite>" · cost.
 * Hover or keyboard focus shows a quick Re-run (D79).
 */
function ResultRowItem({ row, checked, onToggle, selected, href, onRerun }: { row: ResultRow; checked: boolean; onToggle: () => void; selected: boolean; href: string; onRerun?: () => void }) {
  const marks = row.result ? browserMarks(row.result.perBrowser) : [];
  return (
    <li className={cn('group flex items-start gap-2.5 border-b border-border px-4 py-2.5 text-dense', selected ? 'bg-accent-soft' : 'hover:bg-hover')} data-row-key={row.key}>
      <input type="checkbox" className="mt-px h-4 w-4 shrink-0 cursor-pointer accent-accent" checked={checked} onChange={onToggle} aria-label={`Select ${row.displayId}`} />
      <StatusIcon status={row.status} className="mt-px" />
      <Link to={href} aria-current={selected ? 'true' : undefined} className="min-w-0 flex-1 rounded-control focus-visible:outline-offset-2">
        <span className="flex items-center gap-2">
          <span className={cn('shrink-0 font-mono text-label font-normal', selected ? 'text-accent-soft-text' : 'text-text-muted')}>{row.displayId}</span>
          <span className={cn('truncate font-medium', selected && 'font-semibold text-accent-soft-text')}>{row.title}</span>
          {row.deleted && <span className="shrink-0 text-label font-normal text-text-muted">(deleted)</span>}
          {row.worthALook && (
            <span className="shrink-0" title={`Worth a look: ${row.worthALook}`}>
              <Chip tone="info" className="h-[18px] px-1.5 text-[11px]">
                Worth a look
              </Chip>
            </span>
          )}
          {row.knownIssue && (
            <Chip tone="cc" className="h-[18px] shrink-0 px-1.5 text-[11px]">
              Known issue
            </Chip>
          )}
        </span>
        {/* D85: browser marks (only when browsers disagree) are never cut off: they follow the details when both fit,
            else they move to their own line, and the details shorten only when they alone are too long. */}
        <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-label font-normal text-text-muted">
          <span className="min-w-0 max-w-full truncate">
            <span className="sr-only">{statusLabels[row.status]} · </span>
            {rowDetails(row)}
          </span>
          {marks.length > 0 && <BrowserMarks className="shrink-0" marks={marks.map((m) => ({ key: m.label, status: m.status, label: m.label }))} />}
        </span>
      </Link>
      <span className="flex shrink-0 items-center gap-2">
        {onRerun && (
          <Button size="xs" icon={RotateCcw} onClick={onRerun} aria-label={`Re-run ${row.displayId}`} className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100">
            Re-run
          </Button>
        )}
        <span className="text-label font-normal tabular-nums text-text-muted">{row.cost === null ? '' : formatCost(row.cost)}</span>
      </span>
    </li>
  );
}
