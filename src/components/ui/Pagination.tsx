import { cn } from '@/lib/cn';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const arrow =
    'grid size-10 pointer-coarse:size-11 place-items-center rounded-full text-gold-400 hover:bg-ink-800 disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1', className)}>
      <button type="button" className={arrow} onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        <ChevronLeftIcon className="size-5" />
        <span className="sr-only">Previous page</span>
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(
            'grid size-10 pointer-coarse:size-11 place-items-center rounded-full text-sm font-medium',
            p === page ? 'bg-gold-500 text-ink-950' : 'text-gold-400 hover:bg-ink-800',
          )}
        >
          <span className="sr-only">Page </span>
          {p}
        </button>
      ))}
      <button type="button" className={arrow} onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
        <ChevronRightIcon className="size-5" />
        <span className="sr-only">Next page</span>
      </button>
    </nav>
  );
}
