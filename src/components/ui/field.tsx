import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const controlClasses =
  'h-9 w-full rounded-control border border-border bg-surface px-3 text-base text-text placeholder:text-text-muted ' +
  'disabled:cursor-not-allowed disabled:bg-bg disabled:text-text-muted aria-[invalid=true]:border-failed-dot';

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
  return <select ref={ref} className={cn(controlClasses, 'pr-8', className)} {...props} />;
});

/** Native checkbox with its label (whole row clickable). */
export function Checkbox({ label, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2', className)}>
      <input type="checkbox" className="h-4 w-4 accent-accent" {...props} />
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
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="h-4 w-4 accent-accent" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
