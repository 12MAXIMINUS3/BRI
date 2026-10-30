import { cn } from '@/lib/cn';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterChipsProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** A row of toggle buttons for single-choice filtering (e.g. by category). */
export function FilterChips({ label, options, value, onChange, className }: FilterChipsProps) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-sm border px-4 py-2 pointer-coarse:py-3 text-xs font-semibold tracking-[0.12em] uppercase transition-colors',
              active
                ? 'border-gold-500 bg-gold-500 text-ink-950'
                : 'border-ink-600 bg-transparent text-ivory-300 hover:border-gold-500/70 hover:text-gold-300',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
