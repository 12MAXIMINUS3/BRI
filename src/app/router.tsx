import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AboutPage } from '@/features/about/pages/AboutPage';
import { HomePage } from '@/features/home/pages/HomePage';
import { OurWorkPage } from '@/features/portfolio/pages/OurWorkPage';
import { ProjectDetailPage } from '@/features/portfolio/pages/ProjectDetailPage';
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';
import { ShopPage } from '@/features/products/pages/ShopPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Form pages are code-split so browsing visitors don't download the form and
// validation libraries. PublicLayout wraps the outlet in <Suspense>.
const CustomOrderPage = lazy(() =>
  import('@/features/custom-orders/pages/CustomOrderPage').then((m) => ({ default: m.CustomOrderPage })),
);
const ContactPage = lazy(() => import('@/features/contact/pages/ContactPage').then((m) => ({ default: m.ContactPage })));

/**
 * Public routes. Phase 2 adds /sign-in, /register, /reset-password;
 * Phase 3 adds /account/*; Phase 4 adds the lazily loaded /admin/* area.
 */
export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'work', element: <OurWorkPage /> },
      { path: 'work/:slug', element: <ProjectDetailPage /> },
      { path: 'custom-order', element: <CustomOrderPage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'shop/:slug', element: <ProductDetailPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
