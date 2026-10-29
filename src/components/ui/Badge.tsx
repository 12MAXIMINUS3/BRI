import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'border border-ink-600 bg-ink-900/90 text-ivory-200',
  success: 'border border-gold-500/40 bg-ink-950/85 text-gold-300',
  warning: 'border border-[#e0a458]/40 bg-ink-950/85 text-[#f0c27a]',
  danger: 'border border-[#e07a62]/40 bg-ink-950/85 text-[#f2a08c]',
  info: 'border border-[#8fa6c2]/40 bg-ink-950/85 text-[#bcd0e6]',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
