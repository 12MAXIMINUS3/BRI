import type { ReactNode } from 'react';
import { business } from '@/config/business';
import { cn } from '@/lib/cn';

/** Small tag marking sample content. Hidden once VITE_SHOW_DEMO_LABELS=false. */
export function DemoLabel({ className, children = 'Demo' }: { className?: string; children?: ReactNode }) {
  if (!business.showDemoLabels) return null;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-dashed border-gold-500/60 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-gold-400 uppercase',
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Wraps copy the owner still needs to write. The text is shown so the layout
 * is realistic, but it is visibly marked so nobody mistakes it for real claims.
 */
export function PlaceholderCopy({ children, className }: { children: ReactNode; className?: string }) {
  if (!business.showDemoLabels) return <div className={className}>{children}</div>;
  return (
    <div className={cn('relative rounded-xl border border-dashed border-gold-500/40 p-4 pt-7', className)}>
      <span className="absolute top-2 left-4 text-[0.68rem] font-semibold tracking-wider text-gold-400 uppercase">
        Placeholder copy · replace before launch
      </span>
      {children}
    </div>
  );
}
