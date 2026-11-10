import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { buttonClasses, type ButtonVariant } from './button';
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
export function Menu({ label, accessibleLabel, items, variant = 'secondary' }: { label: ReactNode; accessibleLabel?: string; items: MenuItem[]; variant?: ButtonVariant }) {
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
        className={buttonClasses({ size: 'sm', variant })}
      >
        {label}
      </button>
      <ul id={id} hidden={!open} className="absolute right-0 z-20 mt-1 min-w-[160px] rounded-control border border-border bg-surface py-1 shadow-lg">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              data-menu-item
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn('w-full px-3 py-1.5 text-left hover:bg-bg', item.danger ? 'text-failed-text' : 'text-text')}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
