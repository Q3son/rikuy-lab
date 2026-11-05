import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn.ts';

const control =
  'h-12 w-full rounded-ctl border-2 border-line-strong bg-surface px-3 text-body text-ink aria-[invalid=true]:border-grana';

interface Common {
  label: string;
  hint?: string;
  /** Error text names the fix; it is linked to the control with aria-describedby. */
  error?: string;
}

function Wrapper({ id, label, hint, error, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-caption text-ink-2">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-caption font-semibold text-grana-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

export function Field({ label, hint, error, className, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, className)}
        {...props}
      />
    </Wrapper>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  hint,
  error,
  options,
  placeholder,
  className,
  ...props
}: Common & { options: SelectOption[]; placeholder?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, className)}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}
