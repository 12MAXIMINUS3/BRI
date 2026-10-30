import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router';
import { LoadingState } from '@/components/ui/States';
import { RequireAdmin } from './RequireAdmin';

// The whole dashboard is code-split: visitors never download it.
const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType<any>>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const AdminLayout = named(() => import('./AdminLayout'), 'AdminLayout');
const OverviewPage = named(() => import('./pages/OverviewPage'), 'OverviewPage');
const RequestsPage = named(() => import('./pages/RequestsPage'), 'RequestsPage');
const RequestDetailPage = named(() => import('./pages/RequestDetailPage'), 'RequestDetailPage');
const OrdersPage = named(() => import('./pages/OrdersPage'), 'OrdersPage');
const OrderDetailPage = named(() => import('./pages/OrderDetailPage'), 'OrderDetailPage');
const CatalogListPage = named(() => import('./pages/CatalogListPage'), 'CatalogListPage');
const CatalogEditPage = named(() => import('./pages/CatalogEditPage'), 'CatalogEditPage');
const InquiriesPage = named(() => import('./pages/InquiriesPage'), 'InquiriesPage');
const CustomersPage = named(() => import('./pages/CustomersPage'), 'CustomersPage');
const SettingsPage = named(() => import('./pages/SettingsPage'), 'SettingsPage');
const SitePhotosPage = named(() => import('./pages/SitePhotosPage'), 'SitePhotosPage');

export const adminRoute: RouteObject = {
  path: 'admin',
  element: (
    <Suspense fallback={<LoadingState className="py-32" />}>
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    </Suspense>
  ),
  children: [
    { index: true, element: <OverviewPage /> },
    { path: 'requests', element: <RequestsPage /> },
    { path: 'requests/:id', element: <RequestDetailPage /> },
    { path: 'orders', element: <OrdersPage /> },
    { path: 'orders/:id', element: <OrderDetailPage /> },
    { path: 'products', element: <CatalogListPage kind="product" /> },
    { path: 'products/:id', element: <CatalogEditPage kind="product" /> },
    { path: 'portfolio', element: <CatalogListPage kind="project" /> },
    { path: 'portfolio/:id', element: <CatalogEditPage kind="project" /> },
    { path: 'inquiries', element: <InquiriesPage /> },
    { path: 'customers', element: <CustomersPage /> },
    { path: 'photos', element: <SitePhotosPage /> },
    { path: 'settings', element: <SettingsPage /> },
  ],
};
