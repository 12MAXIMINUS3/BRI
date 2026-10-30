import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AboutPage } from '@/features/about/pages/AboutPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { HomePage } from '@/features/home/pages/HomePage';
import { OurWorkPage } from '@/features/portfolio/pages/OurWorkPage';
import { ProjectDetailPage } from '@/features/portfolio/pages/ProjectDetailPage';
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';
import { ShopPage } from '@/features/products/pages/ShopPage';
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { adminRoute } from '@/features/admin/routes';

// Form and account pages are code-split so browsing visitors don't download
// the form libraries. PublicLayout wraps the outlet in <Suspense>.
const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const CustomOrderPage = named(() => import('@/features/custom-orders/pages/CustomOrderPage'), 'CustomOrderPage');
const ContactPage = named(() => import('@/features/contact/pages/ContactPage'), 'ContactPage');
const SignInPage = named(() => import('@/features/auth/pages/SignInPage'), 'SignInPage');
const RegisterPage = named(() => import('@/features/auth/pages/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = named(() => import('@/features/auth/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = named(() => import('@/features/auth/pages/ResetPasswordPage'), 'ResetPasswordPage');
const AccountPage = named(() => import('@/features/account/pages/AccountPage'), 'AccountPage');

/** Public site routes, plus the separately laid-out admin dashboard. */
export const routes: RouteObject[] = [
  adminRoute,
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'work', element: <OurWorkPage /> },
      { path: 'work/:slug', element: <ProjectDetailPage /> },
      { path: 'custom-order', element: <CustomOrderPage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'shop/:slug', element: <ProductDetailPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'sign-in', element: <SignInPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      {
        path: 'account',
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
