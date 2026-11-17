import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
  /** Colour for the icon (e.g. a status tone). */
  iconClassName?: string;
  /** Accessible name when the visible label is short (e.g. an icon and a count). */
  ariaLabel?: string;
}

/**
 * Segmented control (D79): two to five mutually exclusive options in one pill, for a filter that is always visible.
 * Toggle buttons in a labelled group (aria-pressed), so each option is one Tab stop and announces its state.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  fill,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Stretch the options to the full width. */
  fill?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex gap-0.5 rounded-[9px] bg-hover p-[3px]', fill && 'flex w-full', className)}>
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] px-2.5 text-dense font-medium tabular-nums transition-colors duration-150 focus-visible:outline-offset-0',
              fill && 'flex-1 px-1.5',
              on ? 'bg-surface text-text shadow-lift' : 'text-text-muted hover:text-text',
            )}
          >
            {Icon && <Icon aria-hidden="true" className={cn('size-3.5 shrink-0', o.iconClassName)} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
