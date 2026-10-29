import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { getProductBySlug, listProducts, submitOrderRequest, type ListProductsParams } from './api';

export const productKeys = {
  all: ['products'] as const,
  list: (params: ListProductsParams) => [...productKeys.all, 'list', params] as const,
  detail: (slug: string) => [...productKeys.all, 'detail', slug] as const,
};

export function useProducts(params: ListProductsParams = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => listProducts(params),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(slug ?? ''),
    queryFn: () => getProductBySlug(slug ?? ''),
    enabled: !!slug,
  });
}

export function useOrderRequest() {
  return useMutation({ mutationFn: submitOrderRequest });
}
