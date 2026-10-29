import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  /** Use "h1" on page headers; sections default to "h2". */
  as?: 'h1' | 'h2';
  id?: string;
  className?: string;
  action?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  as: Heading = 'h2',
  id,
  className,
  action,
}: SectionHeadingProps) {
  const centered = align === 'center';
  return (
    <div
      className={cn(
        'flex flex-col gap-6',
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-2xl', centered && 'mx-auto')}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Heading
          id={id}
          className={cn(
            'mt-3 tracking-tight text-balance',
            Heading === 'h1' ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl',
          )}
        >
          {title}
        </Heading>
        {description && <div className="mt-4 text-lg leading-relaxed text-ivory-300">{description}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
