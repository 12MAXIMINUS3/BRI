import { Link } from 'react-router';
import { formatMoney } from '@/lib/money';
import { WoodImage } from '@/components/media/WoodImage';
import { DemoLabel } from '@/components/ui/DemoLabel';
import type { Product } from '../types';
import { AvailabilityBadge } from './AvailabilityBadge';

export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stockQuantity <= 0;
  return (
    <article className="group flex flex-col">
      <Link to={`/shop/${product.slug}`} className="block rounded-2xl">
        <div className="relative">
          <WoodImage
            image={product.images[0]}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={`aspect-square rounded-2xl ${soldOut ? 'opacity-75' : ''}`}
          />
          <div className="absolute top-3 left-3">
            <AvailabilityBadge stockQuantity={product.stockQuantity} />
          </div>
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <h3 className="text-2xl transition-colors group-hover:text-gold-300">{product.name}</h3>
          {product.isDemo && <DemoLabel className="mt-1" />}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ivory-300">{product.summary}</p>
        <p className="mt-3 font-medium text-ivory-50">{formatMoney(product.priceMinor)}</p>
      </Link>
    </article>
  );
}
