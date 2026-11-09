import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ChipTone = 'neutral' | 'passed' | 'failed' | 'cc' | 'info';

const tones: Record<ChipTone, string> = {
  neutral: 'border-border bg-bg text-text-muted',
  passed: 'border-passed-border bg-passed-fill text-passed-text',
  failed: 'border-failed-border bg-failed-fill text-failed-text',
  cc: 'border-cc-border bg-cc-fill text-cc-text',
  info: 'border-accent-soft bg-accent-soft text-accent-soft-text',
};

/** Small labelled pill. The text carries the meaning; colour only supports it (CLAUDE.md rule 7). */
export function Chip({ tone = 'neutral', children, className }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-pill border px-2 py-0.5 text-label font-normal', tones[tone], className)}>
      {children}
    </span>
  );
}
