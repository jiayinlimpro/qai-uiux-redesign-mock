import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import type { Mode } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Field, Input, Select } from '@/components/ui/field';
import { Menu } from '@/components/ui/menu';
import { StatusIcon } from '@/components/StatusIcon';
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

/**
 * 6.1 left: results list (screens/07-results.md). Search · Reason (BR-LIST-03) · Mode · Worth a look [PROPOSAL] · Clear filters;
 * "Select all shown (n)"; bulk bar only when ≥1 selected (BR-LIST-04); flat rows sorted per BR-LIST-03.
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
    <div className="flex h-full flex-col bg-surface">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <Field label="Search by ID or title" hideLabel>
          {(p) => <Input {...p} type="search" placeholder="Search by ID or title" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />}
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          {reasons && (
            <Field label="Reason" hideLabel className="w-40">
              {(p) => (
                <Select {...p} value={filters.reason} onChange={(e) => setFilters({ ...filters, reason: e.target.value as Reason | 'all' })}>
                  <option value="all">Reason: all</option>
                  {reasons.map((r) => (
                    <option key={r} value={r}>
                      {reasonLabels[r]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field label="Mode" hideLabel className="w-32">
            {(p) => (
              <Select {...p} value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: e.target.value as Mode | 'all' })}>
                <option value="all">Mode: all</option>
                {(Object.keys(modeLabels) as Mode[]).map((m) => (
                  <option key={m} value={m}>
                    {modeLabels[m]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={filters.worthALook} onChange={(e) => setFilters({ ...filters, worthALook: e.target.checked })} />
            Worth a look <Chip className="px-1.5">Proposal</Chip>
          </label>
          {hasActiveResultFilters(filters) && (
            <Button size="sm" variant="ghost" onClick={() => setFilters(NO_RESULT_FILTERS)}>
              Clear filters
            </Button>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-text-muted">
          <input
            ref={selectAll}
            type="checkbox"
            className="h-4 w-4 accent-accent"
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
      </div>

      {selectedRows.length > 0 && (
        <div role="region" aria-label="Selected results" className="flex flex-wrap items-center gap-2 border-b border-border bg-accent-soft px-3 py-2">
          <span className="font-semibold text-accent-soft-text">{selectedRows.length} selected</span>
          <Button size="sm" onClick={() => actions.rerun(selectedRows)}>
            Re-run
          </Button>
          <Menu label="Re-run with model…" items={models.map((m) => ({ label: m, onSelect: () => actions.rerunWithModel(selectedRows, m) }))} />
          <Button size="sm" onClick={() => actions.copyBugReports(selectedRows)}>
            Copy bug reports
          </Button>
          <Button size="sm" onClick={() => actions.knownIssue(selectedRows)}>
            Known issue
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelection(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {shown.length === 0 ? (
          <div className="p-6 text-center text-text-muted">
            <p>No results match these filters.</p>
            <Button size="sm" className="mt-2" onClick={() => setFilters(NO_RESULT_FILTERS)}>
              Clear filters
            </Button>
          </div>
        ) : (
          <ul aria-label="Results">
            {shown.map((r) => (
              <ResultRowItem key={r.key} row={r} checked={selection.has(r.key)} onToggle={() => toggle(r.key)} selected={r.key === selectedKey} href={rowLink(r.key)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** ResultRow (08): checkbox · status icon · ID · title · worth-a-look dot · "<reason> · <mode> · <suite>" · cost; browser marks. */
function ResultRowItem({ row, checked, onToggle, selected, href }: { row: ResultRow; checked: boolean; onToggle: () => void; selected: boolean; href: string }) {
  const marks = row.result ? browserMarks(row.result.perBrowser) : [];
  return (
    <li className={cn('flex items-start gap-2 border-b border-border px-3 py-2', selected ? 'bg-accent-soft' : 'hover:bg-bg')} data-row-key={row.key}>
      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-accent" checked={checked} onChange={onToggle} aria-label={`Select ${row.displayId}`} />
      <StatusIcon status={row.status} className="mt-0.5" />
      <Link to={href} aria-current={selected ? 'true' : undefined} className="min-w-0 flex-1 rounded-control focus-visible:outline-offset-2">
        <span className="flex items-baseline gap-2">
          <span className="shrink-0 font-semibold">{row.displayId}</span>
          <span className="truncate">{row.title}</span>
          {row.deleted && <span className="shrink-0 text-label font-normal text-text-muted">(deleted)</span>}
          {row.worthALook && (
            <span className="shrink-0" title={`Worth a look: ${row.worthALook}`}>
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-pill bg-accent" />
              <span className="sr-only">Worth a look</span>
            </span>
          )}
          {row.knownIssue && <Chip className="shrink-0 px-1.5">Known issue</Chip>}
        </span>
        <span className="block truncate text-label font-normal text-text-muted">
          <span className="sr-only">{statusLabels[row.status]} · </span>
          {rowDetails(row)}
          {marks.length > 0 && (
            <span className="ml-1">
              {marks.map((m) => (
                <span key={m.label} className="ml-1 inline-flex items-center">
                  {m.label}
                  {m.status === 'passed' ? (
                    <Check aria-hidden="true" className="h-3 w-3 text-passed-dot" />
                  ) : m.status === 'failed' ? (
                    <X aria-hidden="true" className="h-3 w-3 text-failed-dot" />
                  ) : (
                    <span aria-hidden="true">–</span>
                  )}
                  <span className="sr-only"> {statusLabels[m.status]}</span>
                </span>
              ))}
            </span>
          )}
        </span>
      </Link>
      <span className="shrink-0 pt-0.5 text-label font-normal text-text-muted">{row.cost === null ? '' : formatCost(row.cost)}</span>
    </li>
  );
}

