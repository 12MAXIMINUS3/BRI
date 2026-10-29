import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { MediaImage } from '@/types/media';
import { WoodImage } from './WoodImage';

export function ImageGallery({ images, title }: { images: MediaImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0] ?? null;

  return (
    <div>
      <WoodImage
        image={current}
        priority
        sizes="(min-width: 1024px) 58vw, 100vw"
        className="aspect-[4/3] rounded-2xl shadow-card"
      />
      {images.length > 1 && (
        <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5" aria-label={`${title} images`}>
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'block w-full overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-ink-950 transition',
                  i === index ? 'ring-gold-500' : 'ring-transparent hover:ring-ink-600',
                )}
              >
                <WoodImage image={image} sizes="120px" className="aspect-square" />
                <span className="sr-only">
                  Show image {i + 1} of {images.length}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
