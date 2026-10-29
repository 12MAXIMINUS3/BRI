import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ProductCard } from '@/features/products/components/ProductCard';
import { useProducts } from '@/features/products/hooks';

export function ShopPreview() {
  const { data, isPending, isError, refetch } = useProducts({ featuredOnly: true, pageSize: 3 });

  // Hide the section entirely when nothing is listed for sale.
  if (!isPending && !isError && data.items.length === 0) return null;

  return (
    <section aria-labelledby="shop-preview-heading">
      <Container className="py-20 sm:py-28">
        <SectionHeading
          id="shop-preview-heading"
          eyebrow="Ready-made"
          title="Available now"
          description="A small selection of finished pieces with set prices, ready to request."
          action={
            <ButtonLink to="/shop" variant="secondary">
              Shop Available Products
            </ButtonLink>
          }
        />
        <div className="mt-12">
          {isPending ? (
            <LoadingState label="Loading products…" />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
