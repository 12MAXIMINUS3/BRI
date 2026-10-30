import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { errorMessage, isNotConnectedError } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { isSupabaseConfigured, newClientToken } from '@/lib/supabase';
import { Alert } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { signInPath } from '@/features/auth/redirect';
import { clampQuantity, getAvailability } from '../availability';
import { useOrderRequest } from '../hooks';
import type { Product } from '../types';
import { QuantityStepper } from './QuantityStepper';

export function OrderRequestPanel({ product }: { product: Product }) {
  const availability = getAvailability(product.stockQuantity);
  const [quantity, setQuantity] = useState(() => clampQuantity(1, product.stockQuantity));
  // One token per request attempt: double clicks and retries reuse it, so the
  // database returns the same order instead of reserving stock twice.
  const [clientToken, setClientToken] = useState(newClientToken);
  const orderRequest = useOrderRequest();
  const { user } = useAuth();
  const location = useLocation();
  const needsSignIn = isSupabaseConfigured && !user;

  if (orderRequest.isSuccess) {
    return (
      <div className="rounded-sm border border-gold-500/40 bg-ink-850 p-6 shadow-card">
        <Alert tone="success" title={`Request sent · ${orderRequest.data.reference}`}>
          We'll confirm availability and share payment and collection or delivery arrangements with you. Nothing is
          charged online.
        </Alert>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink to="/account" size="sm">
            View my orders
          </ButtonLink>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              orderRequest.reset();
              setClientToken(newClientToken());
            }}
          >
            Request another
          </Button>
        </div>
      </div>
    );
  }

  if (availability.status === 'out_of_stock') {
    return (
      <div className="rounded-sm border border-ink-700 bg-ink-900 p-6">
        <p className="font-medium text-ivory-50">This item is currently out of stock.</p>
        <p className="mt-2 text-sm leading-relaxed text-ivory-300">
          We may be able to make another one to order. A custom request lets us confirm materials, price, and timing
          with you first.
        </p>
        <ButtonLink
          to={`/custom-order?category=${product.category}`}
          variant="secondary"
          className="mt-5"
        >
          Request a Custom Version
        </ButtonLink>
      </div>
    );
  }

  // Display only. The server recalculates the total from the stored price.
  const estimatedTotal = product.priceMinor * quantity;

  return (
    <div className="rounded-sm border border-ink-700 bg-ink-850 p-6 shadow-card">
      <div className="flex flex-wrap items-end gap-6">
        <QuantityStepper
          value={quantity}
          max={availability.maxQuantity}
          onChange={(q) => setQuantity(clampQuantity(q, product.stockQuantity))}
          disabled={orderRequest.isPending}
        />
        <div className="pb-2">
          <p className="text-sm text-mist-400">Estimated total</p>
          <p className="text-lg font-medium text-ivory-50">{formatMoney(estimatedTotal)}</p>
        </div>
      </div>

      {needsSignIn ? (
        <>
          <ButtonLink to={signInPath(location.pathname)} size="lg" className="mt-6 w-full">
            Sign In to Request
          </ButtonLink>
          <p className="mt-3 text-center text-sm text-mist-400">
            No account?{' '}
            <Link to={signInPath(location.pathname, 'register')} className="text-gold-300 hover:underline">
              Create one in a minute
            </Link>
          </p>
        </>
      ) : (
        <Button
          size="lg"
          className="mt-6 w-full"
          loading={orderRequest.isPending}
          onClick={() => orderRequest.mutate({ clientToken, productId: product.id, quantity })}
        >
          Request This Item
        </Button>
      )}

      <p className="mt-4 text-sm leading-relaxed text-ivory-300">
        No payment is taken online. After you send a request, we confirm availability and share payment and
        collection or delivery arrangements with you. Your order is only final once we confirm it.
      </p>

      {orderRequest.isError &&
        (isNotConnectedError(orderRequest.error) ? (
          <Alert tone="info" className="mt-5" title="Not connected yet">
            {orderRequest.error.message}
          </Alert>
        ) : (
          <Alert tone="error" className="mt-5" title="We couldn't send your request">
            {errorMessage(orderRequest.error)}
          </Alert>
        ))}
    </div>
  );
}
