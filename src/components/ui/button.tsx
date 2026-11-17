import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** inverse: on an inverse surface (the floating bulk bar). */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
/** xs 28 px: actions inside list rows and tables · sm 32 px: toolbars, list headers, bulk bar · md 36 px: page and dialog actions. */
export type ButtonSize = 'xs' | 'sm' | 'md';

// Icons inside a button are sized by the button (16 px; 14 px at xs), whether passed as `icon` or as a child.
const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors duration-150 ' +
  '[&_svg]:size-4 [&_svg]:shrink-0 disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent-fill text-accent-contrast shadow-primary hover:bg-accent-fill-hover',
  secondary: 'border border-border bg-surface text-text shadow-lift hover:bg-hover',
  ghost: 'text-text hover:bg-hover',
  danger: 'border border-failed-border bg-surface text-failed-text shadow-lift hover:bg-failed-fill',
  inverse: 'text-inverse-text hover:bg-inverse-hover',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1.5 px-2.5 text-dense [&_svg]:size-3.5',
  sm: 'h-8 gap-1.5 px-3 text-base',
  md: 'h-9 px-3.5 text-base',
};
const iconOnlySizes: Record<ButtonSize, string> = { xs: 'h-7 w-7 [&_svg]:size-3.5', sm: 'h-8 w-8', md: 'h-9 w-9' };

/** Classes for anything that should look like a button (e.g. a router Link). */
export function buttonClasses(opts: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string } = {}): string {
  const { variant = 'secondary', size = 'md', iconOnly = false, className } = opts;
  return cn(base, variants[variant], iconOnly ? iconOnlySizes[size] : sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon (lucide). Decorative: the label carries the meaning. */
  icon?: LucideIcon;
} & (
    | { iconOnly?: false }
    /** Icon-only buttons must have an accessible name (CLAUDE.md rule 7). */
    | { iconOnly: true; 'aria-label': string }
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, iconOnly, icon: Icon, className, type = 'button', children, ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses({ variant, size, iconOnly, className })} {...props}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </button>
  );
});
