import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** outline: Not run (no fill, a ring), so it reads as "nothing happened". */
export type ChipTone = 'neutral' | 'passed' | 'failed' | 'cc' | 'info' | 'outline';

// Soft fills without borders (D79); the text carries the meaning, the icon supports it.
const tones: Record<ChipTone, string> = {
  neutral: 'border-transparent bg-hover text-text-muted',
  passed: 'border-transparent bg-passed-fill text-passed-text',
  failed: 'border-transparent bg-failed-fill text-failed-text',
  cc: 'border-transparent bg-cc-fill text-cc-text',
  info: 'border-transparent bg-accent-soft text-accent-soft-text',
  outline: 'border-border bg-transparent text-text-muted',
};

/** Small labelled pill with an optional leading icon. Colour only supports the text (CLAUDE.md rule 7). */
export function Chip({ tone = 'neutral', icon: Icon, children, className }: { tone?: ChipTone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center whitespace-nowrap rounded-pill border px-2 text-label font-medium', tones[tone], className)}>
      {Icon && <Icon aria-hidden="true" className="mr-1 size-3.5 shrink-0" />}
      {children}
    </span>
  );
}
