import { Ban, Bot, Bug, CircleHelp, CloudOff, Database, FileCode, FileQuestion, Globe, ServerCrash, Sparkles, Table2, type LucideIcon } from 'lucide-react';
import type { Browser, CcReason, FailReason, Mode, Status } from '@/data/types';
import { Chip, type ChipTone } from '@/components/ui/chip';
import { browserLabels, modeLabels, reasonLabels, statusLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { statusIcons } from './StatusIcon';

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

export const statusTone: Record<Status, ChipTone> = { passed: 'passed', failed: 'failed', couldnt_complete: 'cc', not_run: 'outline' };

/** Status chip: the status's own icon and text on its tint (D79). */
export function StatusChip({ status }: { status: Status }) {
  return (
    <Chip tone={statusTone[status]} icon={statusIcons[status].Icon}>
      {statusLabels[status]}
    </Chip>
  );
}

const reasonIcons: Record<FailReason | CcReason, LucideIcon> = {
  product_bug: Bug,
  needs_confirmation: CircleHelp,
  test_data_problem: Database,
  test_case_unclear: FileQuestion,
  blocked: Ban,
  environment_down: CloudOff,
  service_problem: ServerCrash,
  ai_couldnt_finish: Bot,
};

/** Failure reason chip: neutral with the reason's icon; the status chip next to it already carries the colour (D79). */
export function ReasonChip({ reason }: { reason: FailReason | CcReason }) {
  return <Chip icon={reasonIcons[reason]}>{reasonLabels[reason]}</Chip>;
}

const modeIcons: Record<Mode, LucideIcon> = { ai: Sparkles, script: FileCode, data_rows: Table2 };

export function ModeChip({ mode }: { mode: Mode }) {
  return <Chip icon={modeIcons[mode]}>{modeLabels[mode]}</Chip>;
}

/** Browser chip; with several browsers it also shows that browser's status icon. */
export function BrowserChip({ browser, status }: { browser: Browser; status?: Status }) {
  const s = status ? statusIcons[status] : null;
  return (
    <Chip icon={Globe}>
      {browserLabels[browser]}
      {s && status && (
        <>
          <s.Icon aria-hidden="true" className={cn('ml-1 size-3.5', s.className)} />
          <span className="sr-only"> {statusLabels[status]}</span>
        </>
      )}
    </Chip>
  );
}
