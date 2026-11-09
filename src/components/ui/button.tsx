import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-contrast hover:opacity-90',
  secondary: 'border border-border bg-surface text-text hover:bg-bg',
  ghost: 'text-text hover:bg-bg',
  danger: 'border border-failed-border bg-surface text-failed-text hover:bg-failed-fill',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-base',
  md: 'h-9 px-4 text-base',
};
const iconOnlySizes: Record<ButtonSize, string> = { sm: 'h-8 w-8', md: 'h-9 w-9' };

/** Classes for anything that should look like a button (e.g. a router Link). */
export function buttonClasses(opts: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string } = {}): string {
  const { variant = 'secondary', size = 'md', iconOnly = false, className } = opts;
  return cn(base, variants[variant], iconOnly ? iconOnlySizes[size] : sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
} & (
    | { iconOnly?: false }
    /** Icon-only buttons must have an accessible name (CLAUDE.md rule 7). */
    | { iconOnly: true; 'aria-label': string }
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, iconOnly, className, type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClasses({ variant, size, iconOnly, className })} {...props} />;
});
