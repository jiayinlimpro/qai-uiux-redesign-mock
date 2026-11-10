import { Circle, CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import type { Status } from '@/data/types';
import { statusLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';

const icons = {
  failed: { Icon: CircleX, className: 'text-failed-dot' },
  couldnt_complete: { Icon: CircleAlert, className: 'text-cc-dot' },
  passed: { Icon: CircleCheck, className: 'text-passed-dot' },
  not_run: { Icon: Circle, className: 'text-notrun' },
} as const;

/** Status icon (08): ✕ failed · ! couldn't complete · ✓ passed · ○ not run, with the status as accessible text (rule 7). */
export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const { Icon, className: tone } = icons[status];
  return (
    <span className={cn('inline-flex shrink-0', className)} title={statusLabels[status]}>
      <Icon aria-hidden="true" className={cn('h-4 w-4', tone)} />
      <span className="sr-only">{statusLabels[status]}</span>
    </span>
  );
}
