import type { ComponentProps } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'light';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-sm font-semibold tracking-[0.14em] uppercase whitespace-nowrap transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-gold-400 to-gold-500 text-ink-950 shadow-gold hover:from-gold-300 hover:to-gold-400',
  secondary: 'border border-gold-500/50 bg-transparent text-gold-300 hover:border-gold-400 hover:bg-gold-500/10',
  ghost: 'text-gold-400 hover:bg-ink-800 hover:text-gold-300',
  light: 'bg-ivory-50 text-ink-950 hover:bg-gold-200',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-10 pointer-coarse:h-11 px-5 text-[0.7rem]',
  md: 'h-12 px-7 text-[0.75rem]',
  lg: 'h-14 px-9 text-[0.8rem]',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant,
  size,
  className,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ComponentProps<'button'> & StyleProps & { loading?: boolean }) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...props }: LinkProps & StyleProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
