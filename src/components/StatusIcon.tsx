import { Circle, CircleCheck, CircleX, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { Status } from '@/data/types';
import { statusLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';

/** One shape per status (08, D79): ✓ circle · ✕ circle · ! triangle · empty ring, so status never depends on colour. */
export const statusIcons: Record<Status, { Icon: LucideIcon; className: string }> = {
  failed: { Icon: CircleX, className: 'text-failed-dot' },
  couldnt_complete: { Icon: TriangleAlert, className: 'text-cc-dot' },
  passed: { Icon: CircleCheck, className: 'text-passed-dot' },
  not_run: { Icon: Circle, className: 'text-notrun' },
};

/** Status icon (08): ✕ failed · ! couldn't complete · ✓ passed · ○ not run, with the status as accessible text (rule 7). */
export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const { Icon, className: tone } = statusIcons[status];
  return (
    <span className={cn('inline-flex shrink-0', className)} title={statusLabels[status]}>
      <Icon aria-hidden="true" className={cn('h-4 w-4', tone)} />
      <span className="sr-only">{statusLabels[status]}</span>
    </span>
  );
}
