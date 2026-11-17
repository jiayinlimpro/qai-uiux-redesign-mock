import type { Status } from '@/data/types';
import { Chip } from '@/components/ui/chip';
import type { StatusCounts } from '@/lib/status';
import { statusLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { statusIcons } from './StatusIcon';
import { statusTone } from './StatusViews';

const ORDER: Status[] = ['passed', 'failed', 'couldnt_complete', 'not_run'];
const lower = (s: Status) => statusLabels[s].toLowerCase();

/** "72 passed · 8 failed · 3 couldn't complete · 2 not run" chips with status icons; zero counts are left out (text carries the meaning, rule 7). */
export function StatusCountChips({ counts }: { counts: StatusCounts }) {
  const items = ORDER.filter((s) => counts[s] > 0);
  if (items.length === 0) return <span className="text-text-muted">No tests</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <Chip key={s} tone={statusTone[s]} icon={statusIcons[s].Icon}>
          {counts[s]} {lower(s)}
        </Chip>
      ))}
    </span>
  );
}

const barTone: Record<Status, string> = { passed: 'bg-passed-dot', failed: 'bg-failed-dot', couldnt_complete: 'bg-cc-dot', not_run: 'bg-notrun' };

/**
 * Compact counts for table cells (D80): a mini proportion bar, then "✓ 72 ✕ 8 ! 3" with status icons and tabular numbers.
 * The full sentence is the accessible text; the icons and bar are decorative.
 */
export function StatusCountsCompact({ counts, className }: { counts: StatusCounts; className?: string }) {
  const items = ORDER.filter((s) => counts[s] > 0);
  if (items.length === 0) return <span className="text-text-muted">No results</span>;
  const total = items.reduce((n, s) => n + counts[s], 0);
  const sentence = items.map((s) => `${counts[s]} ${lower(s)}`).join(', ');
  return (
    <span className={cn('inline-flex items-center gap-3', className)} title={sentence}>
      <span aria-hidden="true" className="flex h-1.5 w-16 shrink-0 gap-px overflow-hidden rounded-pill">
        {items.map((s) => (
          <span key={s} className={barTone[s]} style={{ flexGrow: counts[s] / total }} />
        ))}
      </span>
      <span aria-hidden="true" className="inline-flex items-center gap-2.5 tabular-nums">
        {items.map((s) => {
          const { Icon, className: tone } = statusIcons[s];
          return (
            <span key={s} className="inline-flex items-center gap-1">
              <Icon className={cn('size-3.5 shrink-0', tone)} />
              {counts[s]}
            </span>
          );
        })}
      </span>
      <span className="sr-only">{sentence}</span>
    </span>
  );
}
