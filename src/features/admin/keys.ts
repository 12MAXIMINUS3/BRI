/** React Query keys for the dashboard. Mutations invalidate `adminKeys.all`. */
export const adminKeys = {
  all: ['admin'] as const,
  counts: () => [...adminKeys.all, 'counts'] as const,
  activity: () => [...adminKeys.all, 'activity'] as const,
  requests: (params: object) => [...adminKeys.all, 'requests', params] as const,
  request: (id: string) => [...adminKeys.all, 'request', id] as const,
  orders: (params: object) => [...adminKeys.all, 'orders', params] as const,
  order: (id: string) => [...adminKeys.all, 'order', id] as const,
  catalog: (kind: string, params: object) => [...adminKeys.all, 'catalog', kind, params] as const,
  catalogItem: (kind: string, id: string) => [...adminKeys.all, 'catalog-item', kind, id] as const,
  images: (kind: string, id: string) => [...adminKeys.all, 'images', kind, id] as const,
  inquiries: (params: object) => [...adminKeys.all, 'inquiries', params] as const,
  customers: (params: object) => [...adminKeys.all, 'customers', params] as const,
  settings: () => [...adminKeys.all, 'settings'] as const,
  notes: (type: string, id: string) => [...adminKeys.all, 'notes', type, id] as const,
};
