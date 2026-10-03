import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Check, X } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary-fill text-on-primary hover:bg-primary-hover disabled:opacity-60',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-primary hover:text-primary disabled:opacity-60',
  ghost: 'text-muted hover:bg-sunken hover:text-ink disabled:opacity-50',
  danger: 'border border-fail text-fail hover:bg-fail-soft disabled:opacity-60',
};

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

// No width here: callers choose w-full, flex-1 or a fixed width.
export const inputClass =
  'min-h-10 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-primary';

export function Input({ className = 'w-full', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
      <h2 className="font-display text-lg font-medium">{children}</h2>
      {aside}
    </div>
  );
}

export function SlaBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-sm bg-ok-soft px-1.5 py-0.5 text-xs font-semibold text-ok">
      <Check className="size-3.5" aria-hidden /> OK
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-sm bg-fail-soft px-1.5 py-0.5 text-xs font-semibold text-fail">
      <X className="size-3.5" aria-hidden /> FAIL
    </span>
  );
}
