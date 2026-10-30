import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const inputClasses =
  'block w-full rounded-md border border-ink-600 bg-ink-900 px-4 py-3 text-base text-ivory-50 placeholder:text-mist-500 transition-colors hover:border-gold-500/60 focus:border-gold-500 focus-visible:outline-2 focus-visible:outline-offset-0 aria-[invalid=true]:border-[#e07a62] disabled:bg-ink-900';

interface FieldShellProps {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function FieldShell({ id, label, required, hint, error, className, children }: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-2 text-sm font-medium text-ivory-200">
        {label}
        {required ? (
          <span className="text-gold-400" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-xs font-normal text-mist-400">Optional</span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-mist-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-[#f2a08c]">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint: unknown, error: unknown) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type CommonProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  /** Applied to the wrapper. */
  className?: string;
};

export function TextField({ label, hint, error, className, id, required, ...props }: ComponentProps<'input'> & CommonProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        aria-required={required || undefined}
        className={inputClasses}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  id,
  required,
  rows = 5,
  ...props
}: ComponentProps<'textarea'> & CommonProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        aria-required={required || undefined}
        className={cn(inputClasses, 'resize-y leading-relaxed')}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  id,
  required,
  children,
  ...props
}: ComponentProps<'select'> & CommonProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        aria-required={required || undefined}
        className={cn(inputClasses, 'appearance-none bg-[length:1.1rem] bg-[right_1rem_center] bg-no-repeat pr-10')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235c3822' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  error,
  className,
  id,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & Omit<CommonProps, 'hint'>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={fieldId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 rounded border-ink-600 accent-gold-500"
          {...props}
        />
        <label htmlFor={fieldId} className="text-sm leading-relaxed text-ivory-200">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 pl-8 text-sm text-[#f2a08c]">
          {error}
        </p>
      )}
    </div>
  );
}

export function Fieldset({
  legend,
  description,
  children,
  className,
}: {
  legend: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('border-t border-ink-700 pt-8 first:border-t-0 first:pt-0', className)}>
      <legend className="font-display text-xl text-ivory-50">{legend}</legend>
      {description && <p className="mt-1 text-sm text-mist-400">{description}</p>}
      <div className="mt-5 grid gap-5">{children}</div>
    </fieldset>
  );
}
