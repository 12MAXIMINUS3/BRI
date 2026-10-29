import { Link, useParams } from 'react-router';
import { categoryLabel } from '@/config/catalog';
import { formatMoney } from '@/lib/money';
import { usePageMeta } from '@/lib/usePageMeta';
import { ImageGallery } from '@/components/media/ImageGallery';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { DemoLabel } from '@/components/ui/DemoLabel';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { AvailabilityBadge } from '../components/AvailabilityBadge';
import { OrderRequestPanel } from '../components/OrderRequestPanel';
import { useProduct } from '../hooks';

export function ProductDetailPage() {
  const { slug } = useParams();
  const { data: product, isPending, isError, refetch } = useProduct(slug);

  usePageMeta({
    title: product?.name ?? 'Product',
    description: product?.summary ?? 'A ready-made woodworking product.',
  });

  if (isPending) return <LoadingState label="Loading product…" className="py-32" />;
  if (isError) return <ErrorState onRetry={() => refetch()} className="py-32" />;
  if (!product) {
    return (
      <Container className="py-24">
        <EmptyState
          title="Product not found"
          message="It may have sold out and been removed from the shop."
          action={<ButtonLink to="/shop">Back to the shop</ButtonLink>}
        />
      </Container>
    );
  }

  return (
    <Container className="pt-8 pb-20 sm:pt-12">
      <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-gold-400 hover:text-ivory-50">
        <ArrowLeftIcon className="size-4" />
        All products
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <ImageGallery images={product.images} title={product.name} />
        </div>

        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">{categoryLabel(product.category)}</p>
            {product.isDemo && <DemoLabel>Demo product</DemoLabel>}
          </div>
          <h1 className="mt-3 text-5xl tracking-tight text-balance sm:text-6xl">{product.name}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <p className="text-2xl font-medium text-ivory-50">{formatMoney(product.priceMinor)}</p>
            <AvailabilityBadge stockQuantity={product.stockQuantity} />
          </div>
          <p className="mt-5 text-lg leading-relaxed text-ivory-300">{product.summary}</p>

          <div className="mt-8">
            <OrderRequestPanel product={product} />
          </div>

          <dl className="mt-10 divide-y divide-ink-700 border-y border-ink-700">
            <DetailRow label="Materials" value={product.materials.join(', ')} />
            <DetailRow label="Finish" value={product.finish} />
            {product.dimensions && <DetailRow label="Dimensions" value={product.dimensions} />}
          </dl>

          <div className="prose-wood mt-10 leading-relaxed text-ivory-200">
            <h2 className="mb-4 text-2xl">Details</h2>
            {product.description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-4">
      <dt className="text-sm font-medium text-mist-400">{label}</dt>
      <dd className="col-span-2 text-ivory-50">{value}</dd>
    </div>
  );
}
