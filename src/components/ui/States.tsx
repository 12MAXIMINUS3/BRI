import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Spinner } from './Spinner';

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-3 py-20 text-mist-400', className)}>
      <Spinner className="size-5 text-gold-300" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  title = "We couldn't load this right now",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('mx-auto max-w-md py-16 text-center', className)}>
      <h2 className="text-2xl">{title}</h2>
      {message && <p className="mt-3 text-ivory-300">{message}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
  className,
}: {
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto max-w-md rounded-2xl border border-dashed border-ink-600 px-6 py-14 text-center', className)}>
      <h2 className="text-2xl">{title}</h2>
      {message && <p className="mt-3 text-ivory-300">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
