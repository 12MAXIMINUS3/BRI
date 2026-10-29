import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CloseIcon } from './icons';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** "drawer" slides in from the right edge (used for the mobile menu). */
  variant?: 'center' | 'drawer';
  className?: string;
}

/**
 * Accessible modal built on the native <dialog> element, which provides
 * focus containment, Escape to close, inert background content, and focus
 * restoration to the triggering element.
 */
export function Dialog({ open, onClose, title, children, variant = 'center', className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // Clicking the backdrop closes the dialog; Escape is handled natively.
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'bg-ink-950 text-ivory-50 shadow-2xl',
        variant === 'drawer'
          ? 'm-0 ml-auto h-dvh max-h-none w-[min(22rem,100%)] max-w-none'
          : 'm-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl',
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-ink-700 px-5 py-4">
          <h2 id={titleId} className="text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 grid size-10 place-items-center rounded-full text-gold-400 hover:bg-ink-800"
          >
            <CloseIcon className="size-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </dialog>
  );
}
