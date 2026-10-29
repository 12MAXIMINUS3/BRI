import { Link } from 'react-router';
import { business } from '@/config/business';
import { cn } from '@/lib/cn';

/** Gold monogram mark with the business name set in the display serif. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-3 text-ivory-50', className)}>
      <svg viewBox="0 0 36 36" className="size-9 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="logo-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f1e3b8" />
            <stop offset="0.5" stopColor="#d9b865" />
            <stop offset="1" stopColor="#a8822f" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="34" height="34" rx="3" fill="#0a0a0a" stroke="url(#logo-gold)" strokeWidth="1.5" />
        <path
          d="M8 13c6-2.4 14-2.4 20 0M8 18c6-2.4 14-2.4 20 0M8 23c6-2.4 14-2.4 20 0"
          fill="none"
          stroke="url(#logo-gold)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-[1.45rem] leading-none font-semibold tracking-wide">{business.name}</span>
    </Link>
  );
}
