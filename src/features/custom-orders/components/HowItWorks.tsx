import { cn } from '@/lib/cn';

export const CUSTOM_ORDER_STEPS = [
  {
    title: 'Share your idea',
    body: 'Describe what you need: size, materials, how it will be used, and any reference images.',
  },
  {
    title: 'We review and advise',
    body: 'We look at your requirements and may ask questions or suggest materials and finishes that suit.',
  },
  {
    title: 'Receive a quotation',
    body: 'You get a written quotation with the agreed scope, price, estimated timeframe, and payment terms.',
  },
  {
    title: 'Approve, then we build',
    body: 'Nothing is confirmed until you accept the quotation. Payment arrangements are agreed with you directly.',
  },
] as const;

interface HowItWorksProps {
  variant?: 'grid' | 'list';
  className?: string;
}

export function HowItWorks({ variant = 'grid', className }: HowItWorksProps) {
  const grid = variant === 'grid';
  return (
    <ol
      className={cn(
        grid
          ? 'grid gap-px overflow-hidden rounded-sm border border-ink-700 bg-ink-700 sm:grid-cols-2 lg:grid-cols-4'
          : 'grid gap-7',
        className,
      )}
    >
      {CUSTOM_ORDER_STEPS.map((step, index) => (
        <li key={step.title} className={cn(grid ? 'bg-ink-900 p-8' : 'flex gap-4')}>
          <span
            aria-hidden="true"
            className={cn(
              'shrink-0 text-gold-gradient font-display italic',
              grid ? 'block text-5xl leading-none' : 'w-9 text-3xl leading-tight',
            )}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className={cn(grid && 'mt-6')}>
            <h3 className="text-2xl">
              <span className="sr-only">Step {index + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-2 leading-relaxed text-ivory-300">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
