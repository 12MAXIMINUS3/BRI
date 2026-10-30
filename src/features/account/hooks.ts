import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listMyOrders, listMyRequests, respondToQuotation } from './api';

export const accountKeys = {
  all: ['account'] as const,
  requests: () => [...accountKeys.all, 'requests'] as const,
  orders: () => [...accountKeys.all, 'orders'] as const,
};

export function useMyRequests() {
  return useQuery({ queryKey: accountKeys.requests(), queryFn: listMyRequests });
}

export function useMyOrders() {
  return useQuery({ queryKey: accountKeys.orders(), queryFn: listMyOrders });
}

export function useRespondToQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId, accept }: { quotationId: string; accept: boolean }) =>
      respondToQuotation(quotationId, accept),
    onSettled: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
