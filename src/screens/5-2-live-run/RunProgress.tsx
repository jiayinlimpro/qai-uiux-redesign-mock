import type { Result, Run } from '@/data/types';
import { countRunStatuses } from '@/lib/status';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Progress card shared by 5.2 and 5.3: counts from results (CLAUDE.md rule 5), elapsed, cost so far, bar. */
export function RunProgress({ run, results, variant }: { run: Run; results: Pick<Result, 'testId' | 'status'>[]; variant: 'live' | 'paused' }) {
  const c = countRunStatuses(run.testIds, results);
  const done = run.progress.done;
  const total = run.progress.total;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const summary =
    variant === 'live'
      ? `Test ${Math.min(done + 1, total)} of ${total}`
      : `${done} of ${total} done`;
  const parts = [`${c.passed} passed`, `${c.failed} failed`, ...(c.couldnt_complete ? [`${c.couldnt_complete} couldn't complete`] : []), ...(variant === 'paused' ? [`${total - done} not run`] : [])];
  return (
    <section aria-label="Progress" className="rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p>
          <span className="font-semibold">{summary}</span> <span className="text-text-muted">· {parts.join(' · ')}</span>
        </p>
        <p className="text-text-muted">
          Elapsed {formatDuration(run.durationMs ?? 0)} · Cost so far ${run.cost.toFixed(2)}
        </p>
      </div>
      <div role="progressbar" aria-label="Tests done" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-valuetext={`${done} of ${total} tests done`} className="mt-2 h-2 overflow-hidden rounded-pill bg-bg">
        <div className={cn('h-full rounded-pill', variant === 'live' ? 'bg-accent' : 'bg-cc-dot')} style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
