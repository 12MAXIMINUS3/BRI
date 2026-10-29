import { usePageMeta } from '@/lib/usePageMeta';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

export function NotFoundPage() {
  usePageMeta({ title: 'Page not found', description: 'The page you were looking for does not exist.', noIndex: true });
  return (
    <Container className="max-w-xl py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-4xl">Page not found</h1>
      <p className="mt-4 text-lg text-ivory-300">The page may have moved, or the link may be incorrect.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink to="/">Go to the home page</ButtonLink>
        <ButtonLink to="/work" variant="secondary">
          Browse our work
        </ButtonLink>
      </div>
    </Container>
  );
}
