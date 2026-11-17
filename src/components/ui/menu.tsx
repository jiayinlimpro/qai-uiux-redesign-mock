import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './button';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/**
 * "More" button that reveals a short list of actions (disclosure pattern: plain buttons in a popup).
 * Escape or a click outside closes it and returns focus to the trigger.
 */
export function Menu({
  label,
  accessibleLabel,
  items,
  variant = 'secondary',
  size = 'sm',
  iconOnly,
  placement = 'down',
}: {
  label: ReactNode;
  accessibleLabel?: string;
  items: MenuItem[];
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** The label is an icon (e.g. ⋯): square button; `accessibleLabel` names it. */
  iconOnly?: boolean;
  /** up: for a trigger near the bottom of the window (the bulk bar). */
  placement?: 'down' | 'up';
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    root.current?.querySelector<HTMLButtonElement>('[data-menu-item]')?.focus();
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div
      ref={root}
      className="relative inline-block"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={accessibleLabel}
        onClick={() => setOpen((o) => !o)}
        className={buttonClasses({ size, variant, iconOnly })}
      >
        {label}
      </button>
      <ul id={id} hidden={!open} className={cn('absolute right-0 z-20 min-w-[180px] rounded-card border border-border bg-surface-raised p-1 text-text shadow-popover', placement === 'up' ? 'bottom-full mb-1' : 'mt-1')}>
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              data-menu-item
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'w-full rounded-control px-2.5 py-1.5 text-left focus-visible:outline-offset-0',
                item.danger ? 'text-failed-text hover:bg-failed-fill' : 'text-text hover:bg-hover',
              )}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
