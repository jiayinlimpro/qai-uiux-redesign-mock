import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown, Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const controlClasses =
  'h-9 w-full rounded-control border border-border-control bg-surface px-3 text-base text-text placeholder:text-text-muted ' +
  'transition-colors duration-150 hover:border-text-muted focus:border-accent focus-visible:outline-offset-0 ' +
  'disabled:cursor-not-allowed disabled:border-border disabled:bg-bg disabled:text-text-muted aria-[invalid=true]:border-failed-dot';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  /** Hide the label visually (e.g. a grid cell); it stays the accessible name. */
  hideLabel?: boolean;
  children: (control: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; required?: boolean }) => ReactNode;
}

/** Label + control + hint + error, wired with ids so screen readers read them together. */
export function Field({ label, hint, error, required, className, hideLabel, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className={cn('text-label text-text-muted', hideLabel && 'sr-only')}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {hint && (
        <p id={hintId} className="text-label font-normal text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-label text-failed-text">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(controlClasses, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 2, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(controlClasses, 'h-auto py-2 leading-5', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  // Own chevron (themed, the same on every OS) instead of the native arrow.
  return <select ref={ref} className={cn(controlClasses, 'cursor-pointer appearance-none bg-select-chevron bg-[length:16px_16px] bg-[position:right_0.625rem_center] bg-no-repeat pr-9', className)} {...props} />;
});

/** Search field with a leading magnifier (D79). The placeholder doubles as the accessible name unless one is given. */
export function SearchInput({ className, placeholder, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <div className={cn('relative', className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <input type="search" placeholder={placeholder} aria-label={props['aria-label'] ?? placeholder} className={cn(controlClasses, 'pl-9')} {...props} />
    </div>
  );
}

/**
 * Filter dropdown pill (D79): "Reason: All ▾". A native select (keyboard and screen readers as usual) drawn as a toolbar
 * pill whose label stays visible, so the current filter value reads at a glance.
 */
export function FilterSelect({
  label,
  icon: Icon,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; icon?: LucideIcon }) {
  return (
    <label
      className={cn(
        'relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-control border border-border bg-surface pl-2.5 text-dense font-medium text-text shadow-lift',
        // The select inside has no ring of its own: the whole pill shows the focus ring when the select has keyboard focus.
        'transition-colors duration-150 focus-within:border-accent hover:bg-hover has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="size-3.5 shrink-0 text-text-muted" />}
      <span className="text-text-muted">{label}:</span>
      <select className="h-full cursor-pointer appearance-none bg-transparent pr-7 font-semibold focus-visible:outline-none" {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 size-3.5 text-text-muted" />
    </label>
  );
}

/** Native checkbox with its label (whole row clickable). */
export function Checkbox({ label, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2', className)}>
      <input type="checkbox" className="h-4 w-4 cursor-pointer accent-accent" {...props} />
      <span>{label}</span>
    </label>
  );
}

/** Native radio group in a fieldset with a legend. */
export function RadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  hideLegend,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hideLegend?: boolean;
}) {
  return (
    <fieldset>
      <legend className={cn('mb-2 text-label text-text-muted', hideLegend && 'sr-only')}>{legend}</legend>
      <div className="flex flex-wrap gap-5">
        {options.map((o) => (
          <label key={o.value} className="inline-flex cursor-pointer items-center gap-2">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="h-4 w-4 cursor-pointer accent-accent" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
