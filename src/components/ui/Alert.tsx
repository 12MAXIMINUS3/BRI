import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const tones: Record<AlertTone, string> = {
  info: 'border-gold-500/25 bg-gold-500/[0.06] text-ivory-200 [&_p:first-child]:text-gold-300',
  success: 'border-[#8fbf7a]/35 bg-[#8fbf7a]/[0.07] text-[#d4e8c8]',
  warning: 'border-[#e0a458]/40 bg-[#e0a458]/[0.08] text-[#f3d2a2]',
  error: 'border-[#e07a62]/45 bg-[#e07a62]/[0.09] text-[#f6c2b5]',
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}

/** Errors are announced immediately (role="alert"); other tones politely. */
export function Alert({ tone = 'info', title, children, className, action }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-xl border px-4 py-3.5 text-sm leading-relaxed', tones[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-1' : undefined}>{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
