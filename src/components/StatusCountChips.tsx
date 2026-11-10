import { Chip } from '@/components/ui/chip';
import type { StatusCounts } from '@/lib/status';

/** "72 passed · 8 failed · 3 couldn't complete · 2 not run" chips; zero counts are left out (text carries the meaning, rule 7). */
export function StatusCountChips({ counts }: { counts: StatusCounts }) {
  const items = [
    { n: counts.passed, tone: 'passed' as const, label: 'passed' },
    { n: counts.failed, tone: 'failed' as const, label: 'failed' },
    { n: counts.couldnt_complete, tone: 'cc' as const, label: "couldn't complete" },
    { n: counts.not_run, tone: 'neutral' as const, label: 'not run' },
  ].filter((i) => i.n > 0);
  if (items.length === 0) return <span className="text-text-muted">No tests</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <Chip key={i.label} tone={i.tone}>
          {i.n} {i.label}
        </Chip>
      ))}
    </span>
  );
}
