import { useState, type CSSProperties } from 'react';
import { business } from '@/config/business';
import { cn } from '@/lib/cn';
import type { MediaImage, WoodTone } from '@/types/media';

const TONES: Record<WoodTone, string> = {
  oak: '#8a6640',
  walnut: '#4a2f1d',
  ash: '#9c8462',
  cherry: '#6e3a24',
  teak: '#74502c',
  maple: '#a88f68',
};

interface WoodImageProps {
  image?: MediaImage | null;
  /** Sizing/aspect classes for the frame, e.g. "aspect-[4/3] rounded-2xl". */
  className?: string;
  sizes?: string;
  /** Load eagerly with high priority (use for the main above-the-fold image only). */
  priority?: boolean;
}

/**
 * Responsive image with lazy loading and a fixed frame to prevent layout shift.
 * When there is no photo (demo content) or it fails to load, a labelled
 * wood-tone surface is shown instead of a broken image.
 */
export function WoodImage({ image, className, sizes = '100vw', priority = false }: WoodImageProps) {
  const [failed, setFailed] = useState(false);
  const url = failed ? null : (image?.url ?? null);
  const alt = image?.alt ?? '';
  // Bundled sample photos ship in two widths (name-1400.webp and name-700.webp).
  const isSample = !!url && url.startsWith('/images/stock/');
  const srcSet =
    isSample && url.endsWith('-1400.webp') ? `${url.replace(/-1400\.webp$/, '-700.webp')} 700w, ${url} 1400w` : undefined;

  return (
    <div className={cn('relative overflow-hidden bg-ink-800', className)}>
      {isSample && business.showDemoLabels && (
        <span className="pointer-events-none absolute right-3 bottom-3 z-10 rounded-full border border-gold-500/40 bg-ink-950/70 px-2.5 py-1 text-[0.62rem] font-semibold tracking-[0.18em] text-gold-300 uppercase backdrop-blur-sm">
          Sample photo
        </span>
      )}
      {url ? (
        <img
          src={url}
          srcSet={srcSet}
          alt={alt}
          width={image?.width}
          height={image?.height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div
          role="img"
          aria-label={alt ? `${alt} (placeholder image)` : 'Placeholder image'}
          className="wood-surface absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          style={{ '--wood-base': TONES[image?.tone ?? 'oak'] } as CSSProperties}
        >
          {business.showDemoLabels && (
            <span className="absolute right-3 bottom-3 rounded-full border border-gold-500/40 bg-ink-950/70 px-2.5 py-1 text-[0.62rem] font-semibold tracking-[0.18em] text-gold-300 uppercase backdrop-blur-sm">
              Demo image
            </span>
          )}
        </div>
      )}
    </div>
  );
}
