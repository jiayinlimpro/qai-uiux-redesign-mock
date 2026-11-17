import type { Status } from '@/data/types';
import type { StatusCounts } from '@/lib/status';
import { statusLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { statusIcons } from './StatusIcon';

const ORDER: Status[] = ['failed', 'couldnt_complete', 'passed', 'not_run'];
const textTone: Record<Status, string> = { failed: 'text-failed-text', couldnt_complete: 'text-cc-text', passed: 'text-passed-text', not_run: 'text-text-muted' };
const barTone: Record<Status, string> = { failed: 'bg-failed-dot', couldnt_complete: 'bg-cc-dot', passed: 'bg-passed-dot', not_run: 'bg-notrun' };

/**
 * SummaryFilterButtons as tiles (08, D79): All + one tile per status, each a toggle that filters the list, then a thin
 * proportion bar. Counts come from the data (rule 5); Not run shows only when there is one.
 */
export function StatusTiles({ counts, value, onChange }: { counts: StatusCounts; value: Status | 'all'; onChange: (value: Status | 'all') => void }) {
  const total = ORDER.reduce((n, s) => n + counts[s], 0);
  const statuses = ORDER.filter((s) => s !== 'not_run' || counts.not_run > 0);
  const drawn = statuses.filter((s) => counts[s] > 0);
  const summary = drawn.map((s) => `${counts[s]} ${statusLabels[s].toLowerCase()}`).join(', ');
  return (
    <div className="flex flex-col gap-2.5">
      <div role="group" aria-label="Filter by status" className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
        <Tile pressed={value === 'all'} onClick={() => onChange('all')} label="All" count={total} />
        {statuses.map((s) => (
          <Tile key={s} status={s} pressed={value === s} onClick={() => onChange(value === s ? 'all' : s)} label={statusLabels[s]} count={counts[s]} />
        ))}
      </div>
      {total > 0 && (
        <div role="img" aria-label={`${summary} of ${total}`} className="flex h-1.5 gap-0.5 overflow-hidden rounded-pill">
          {drawn.map((s) => (
            <span key={s} className={barTone[s]} style={{ flexGrow: counts[s] }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({ status, label, count, pressed, onClick }: { status?: Status; label: string; count: number; pressed: boolean; onClick: () => void }) {
  const Icon = status ? statusIcons[status].Icon : null;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-col items-start gap-1 rounded-card border px-3.5 py-2.5 text-left transition-colors duration-150',
        pressed ? 'border-accent bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent)]' : 'border-border bg-surface shadow-lift hover:bg-hover',
      )}
    >
      <span className={cn('flex items-center gap-1.5 text-label font-medium', status ? textTone[status] : 'text-text-muted')}>
        {Icon && <Icon aria-hidden="true" className="size-3.5 shrink-0" />}
        {label}
      </span>
      <span className="text-h2 font-semibold tabular-nums text-text">{count}</span>
    </button>
  );
}
