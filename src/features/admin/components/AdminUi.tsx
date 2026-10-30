import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { ArrowLeftIcon } from '@/components/ui/icons';

export function AdminPageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <div className="mb-8">
      {back && (
        <Link to={back.to} className="mb-4 inline-flex items-center gap-2 text-sm text-gold-300 hover:underline">
          <ArrowLeftIcon className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl">{title}</h1>
          {description && <p className="mt-2 text-ivory-300">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-sm border border-ink-700 bg-ink-850 p-5 sm:p-6', className)}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-2xl">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Responsive table wrapper with consistent header styling. */
export function DataTable({ caption, head, children }: { caption: string; head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-ink-700">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-ink-900 text-left text-xs tracking-wider text-mist-400 uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700 bg-ink-850">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-top text-ivory-200', className)}>{children}</td>;
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end gap-4">{children}</div>;
}

export function DetailList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
      {items
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([label, value]) => (
          <div key={label}>
            <dt className="text-mist-400">{label}</dt>
            <dd className="mt-0.5 whitespace-pre-line text-ivory-200">{value}</dd>
          </div>
        ))}
    </dl>
  );
}
