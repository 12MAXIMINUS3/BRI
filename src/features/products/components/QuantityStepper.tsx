import { useId } from 'react';
import { MinusIcon, PlusIcon } from '@/components/ui/icons';

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function QuantityStepper({ value, max, onChange, disabled }: QuantityStepperProps) {
  const id = useId();
  const btn =
    'grid size-11 place-items-center text-gold-400 hover:bg-ink-800 disabled:pointer-events-none disabled:opacity-40';
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ivory-200">
        Quantity
      </label>
      <div className="inline-flex items-center overflow-hidden rounded-sm border border-ink-600 bg-ink-850">
        <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= 1}>
          <MinusIcon className="size-4" />
          <span className="sr-only">Decrease quantity</span>
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 w-14 [appearance:textfield] border-x border-ink-600 text-center font-medium focus-visible:outline-offset-0 [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max}>
          <PlusIcon className="size-4" />
          <span className="sr-only">Increase quantity</span>
        </button>
      </div>
    </div>
  );
}
