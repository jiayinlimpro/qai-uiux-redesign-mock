import { cloneElement, useId, useState, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  label: string;
  /** One focusable element (link or button). */
  children: ReactElement;
  side?: 'right' | 'bottom';
  /**
   * true: the tooltip describes the child (aria-describedby), e.g. brand → "All projects".
   * false: the tooltip only repeats the child's accessible name visually (collapsed nav), so it is hidden from assistive tech.
   */
  describe?: boolean;
  className?: string;
}

/** Shows on hover and keyboard focus; Escape hides it (WCAG 1.4.13). */
export function Tooltip({ label, children, side = 'right', describe = true, className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cn('relative flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      {describe ? cloneElement(children, { 'aria-describedby': id }) : children}
      <span
        id={id}
        role="tooltip"
        aria-hidden={describe ? undefined : true}
        className={cn(
          'pointer-events-none absolute z-30 whitespace-nowrap rounded-control bg-text px-2 py-1 text-label text-surface',
          side === 'right' ? 'left-full top-1/2 ml-2 -translate-y-1/2' : 'left-0 top-full mt-1',
          !open && 'hidden',
        )}
      >
        {label}
      </span>
    </span>
  );
}
