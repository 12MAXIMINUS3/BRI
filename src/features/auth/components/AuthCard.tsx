import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Container className="flex justify-center py-16 sm:py-24">
      <div className="w-full max-w-md">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 text-5xl">{title}</h1>
        {description && <div className="mt-4 leading-relaxed text-ivory-300">{description}</div>}
        <div className="mt-10 rounded-sm border border-ink-700 bg-ink-850 p-6 shadow-card sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-mist-400">{footer}</div>}
      </div>
    </Container>
  );
}
