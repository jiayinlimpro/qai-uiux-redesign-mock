import type { CcReason, FailReason, Status } from '@/data/types';
import { Chip, type ChipTone } from '@/components/ui/chip';
import { reasonLabels, statusLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';

const dotClass: Record<Status, string> = {
  passed: 'bg-passed-dot',
  failed: 'bg-failed-dot',
  couldnt_complete: 'bg-cc-dot',
  not_run: 'border-2 border-notrun bg-transparent',
};

/** Status dot (08): colour + shape, with the status as text for screen readers and as a tooltip (rule 7). */
export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn('inline-flex items-center', className)} title={statusLabels[status]}>
      <span aria-hidden="true" className={cn('inline-block h-2.5 w-2.5 rounded-pill', dotClass[status])} />
      <span className="sr-only">{statusLabels[status]}</span>
    </span>
  );
}

export const statusTone: Record<Status, ChipTone> = { passed: 'passed', failed: 'failed', couldnt_complete: 'cc', not_run: 'neutral' };

export function StatusChip({ status }: { status: Status }) {
  return <Chip tone={statusTone[status]}>{statusLabels[status]}</Chip>;
}

/** Failure reason chip; Needs confirmation and couldn't-complete reasons use the warning tone. */
export function ReasonChip({ reason }: { reason: FailReason | CcReason }) {
  const tone: ChipTone = reason === 'product_bug' || reason === 'blocked' ? 'failed' : 'cc';
  return <Chip tone={tone}>{reasonLabels[reason]}</Chip>;
}
