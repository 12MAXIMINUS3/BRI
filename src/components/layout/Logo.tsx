import { useId } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

/**
 * BuiltRight Interiors logo, redrawn as SVG from the brand artwork: a gold
 * house outline with an interior and a checkmark rising to a security camera,
 * beside the BUILTRIGHT / INTERIORS wordmark.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const gold = `url(#${id}-gold)`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1e3b8" />
          <stop offset="0.45" stopColor="#d9b865" />
          <stop offset="1" stopColor="#9c7728" />
        </linearGradient>
      </defs>
      {/* Interior: slatted back wall, pendant lamp, sofa, plant */}
      <g opacity="0.55" stroke={gold} strokeWidth="0.8">
        <path d="M16 31v25M19.5 28v28M23 25v31M26.5 22v20M30 19v21" />
      </g>
      <path d="M21 27v5" stroke={gold} strokeWidth="0.9" />
      <path d="M18.5 35a2.5 2.5 0 0 1 5 0z" fill={gold} />
      <rect x="13" y="45" width="15" height="6.5" rx="1.6" fill={gold} />
      <rect x="14.5" y="41" width="12" height="5" rx="1.6" fill={gold} opacity="0.85" />
      <path d="M14.5 51.5v3M26.5 51.5v3" stroke={gold} strokeWidth="1.2" />
      <path d="M41 56v-4h4v4zM43 52c-3-2-3-5-2-7M43 52c3-2 3-5 2-7M43 52v-7" fill={gold} stroke={gold} strokeWidth="0.8" />
      {/* House outline, open on the upper right where the checkmark passes through */}
      <path
        d="M44 22.5 31 10 8 31v27h44V35"
        fill="none"
        stroke={gold}
        strokeWidth="3.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* Checkmark */}
      <path d="M24 37l8.5 9.5L54 20" fill="none" stroke={gold} strokeWidth="4.2" strokeLinecap="square" strokeLinejoin="miter" />
      {/* Security camera on the roof line */}
      <g transform="rotate(24 53 11)">
        <rect x="44" y="6" width="15" height="8" rx="2.2" fill={gold} />
        <rect x="57" y="7.2" width="3.6" height="5.6" rx="1" fill="#a8822f" />
      </g>
      <circle cx="56.3" cy="16.8" r="3.6" fill="#0a0a0a" stroke={gold} strokeWidth="1.6" />
      <circle cx="56.3" cy="16.8" r="1.3" fill="#3a3a3a" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('group inline-flex items-center gap-3', className)} aria-label="BuiltRight Interiors, home">
      <LogoMark className="size-11 shrink-0 drop-shadow-[0_2px_8px_rgba(201,162,74,0.25)] sm:size-12" />
      <span className="flex flex-col items-center leading-none" aria-hidden="true">
        <span className="text-gold-gradient font-brand text-[1.35rem] font-semibold tracking-[0.06em] sm:text-[1.6rem]">
          BUILTRIGHT
        </span>
        <span className="mt-1 flex w-full items-center gap-2">
          <span className="h-px flex-1 bg-gold-500/70" />
          <span className="text-[0.55rem] font-medium tracking-[0.42em] text-gold-300 sm:text-[0.6rem]">INTERIORS</span>
          <span className="h-px flex-1 bg-gold-500/70" />
        </span>
      </span>
    </Link>
  );
}
