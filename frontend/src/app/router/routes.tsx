import { lazy, Suspense } from 'react';
import { Outlet, redirect, type RouteObject } from 'react-router';

import { useMe } from '@api/process-backend/auth';
import { AuthFallback } from '@components/layouts/auth-fallback';
import { WorkspaceShell } from '@components/layouts/workspace-shell';
import { AppSplash } from '@components/shared/app-splash';
import { COMPANY_ADMIN_NAV, SUPER_ADMIN_NAV, type WorkspaceIdentity } from '@constants/navigation';
import { SessionListener } from '@lib/auth';

import { guestOnly, requireRole } from './middleware';
import { RouteErrorBoundary } from './route-error-boundary';

const PLATFORM_NAME = 'ProcessNow';

/**
 * The guard has already loaded /auth/me into the cache by the time this renders,
 * so useMe() is a cache read. The fallbacks only matter if a refetch is in flight.
 */
const useIdentity = (fallbackName: string): WorkspaceIdentity => {
  const { data } = useMe();
  const user = data?.user;
  return {
    name: user?.company?.name ?? fallbackName,
    role: user?.roleMeta.label ?? '',
    accent: user?.roleMeta.accent ?? 'brand',
    user: {
      name: user?.name ?? '',
      // Whichever one they sign in with.
      email: user?.email ?? user?.phone ?? '',
    },
  };
};

const CompanyWorkspace = () => (
  <WorkspaceShell nav={COMPANY_ADMIN_NAV} identity={useIdentity('')} />
);

const PlatformWorkspace = () => (
  <WorkspaceShell
    nav={SUPER_ADMIN_NAV}
    identity={{ ...useIdentity(PLATFORM_NAME), name: PLATFORM_NAME }}
  />
);

/*
 * Every page is its own chunk, loaded through React.lazy so the layout's <Suspense> can paint a
 * fallback shaped like the page. Route-level `lazy` would block the navigation instead, leaving
 * the user on the old screen with only the progress bar.
 */
const LoginPage = lazy(() =>
  import('@pages/auth/login/login-page').then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('@pages/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const CompaniesListPage = lazy(() =>
  import('@pages/admin/companies-list/companies-list-page').then((m) => ({
    default: m.CompaniesListPage,
  })),
);
const CreateCompanyPage = lazy(() =>
  import('@pages/admin/create-company/create-company-page').then((m) => ({
    default: m.CreateCompanyPage,
  })),
);
const OrdersListPage = lazy(() =>
  import('@pages/orders/orders-list/orders-list-page').then((m) => ({
    default: m.OrdersListPage,
  })),
);
const ServiceTypesListPage = lazy(() =>
  import('@pages/service-types/service-types-list/service-types-list-page').then((m) => ({
    default: m.ServiceTypesListPage,
  })),
);
const VendorsListPage = lazy(() =>
  import('@pages/vendors/vendors-list/vendors-list-page').then((m) => ({
    default: m.VendorsListPage,
  })),
);
const BankAccountsListPage = lazy(() =>
  import('@pages/bank/bank-accounts-list/bank-accounts-list-page').then((m) => ({
    default: m.BankAccountsListPage,
  })),
);
const BankStatementPage = lazy(() =>
  import('@pages/bank/bank-statement/bank-statement-page').then((m) => ({
    default: m.BankStatementPage,
  })),
);
const ExpensesListPage = lazy(() =>
  import('@pages/expenses/expenses-list/expenses-list-page').then((m) => ({
    default: m.ExpensesListPage,
  })),
);
const ComingSoonPage = lazy(() =>
  import('@pages/coming-soon/coming-soon-page').then((m) => ({ default: m.ComingSoonPage })),
);
const NotFoundPage = lazy(() =>
  import('@pages/not-found/not-found-page').then((m) => ({ default: m.NotFoundPage })),
);

// The placeholder screens share one chunk; the route's handle says which screen it stands in for.
const comingSoon = (screen: string): RouteObject => ({
  Component: ComingSoonPage,
  handle: { screen },
});

export const routes: RouteObject[] = [
  {
    ErrorBoundary: RouteErrorBoundary,
    // First paint while the entry chunk boots. Page chunks fall back to their layout's shape.
    HydrateFallback: AppSplash,
    // Sends the user to /login the moment any request comes back 401.
    Component: () => (
      <>
        <SessionListener />
        <Outlet />
      </>
    ),
    children: [
      {
        path: '/login',
        middleware: [guestOnly],
        element: (
          <Suspense fallback={<AuthFallback />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        // Non-lazy so the guard can attach: it runs parent → child before render.
        path: '/',
        middleware: [requireRole('company_admin')],
        Component: CompanyWorkspace,
        children: [
          { index: true, Component: DashboardPage, handle: { screen: 'Dashboard' } },
          { path: 'orders', Component: OrdersListPage, handle: { screen: 'Orders' } },
          { path: 'orders/new', ...comingSoon('New order') },
          { path: 'bills', ...comingSoon('Bills') },
          { path: 'vendors', Component: VendorsListPage, handle: { screen: 'Vendors' } },
          {
            path: 'service-types',
            Component: ServiceTypesListPage,
            handle: { screen: 'Service types' },
          },
          { path: 'bank', Component: BankAccountsListPage, handle: { screen: 'Bank' } },
          { path: 'bank/:id', Component: BankStatementPage, handle: { screen: 'Statement' } },
          { path: 'expenses', Component: ExpensesListPage, handle: { screen: 'Expenses' } },
          { path: 'daily-log', ...comingSoon('Daily log') },
          { path: 'settings', ...comingSoon('Settings') },
        ],
      },
      {
        path: '/admin',
        middleware: [requireRole('super_admin')],
        Component: PlatformWorkspace,
        children: [
          { index: true, loader: () => redirect('/admin/companies') },
          {
            path: 'companies',
            Component: CompaniesListPage,
            handle: { screen: 'Companies' },
            // Nested, not a sibling: on a desktop the list stays behind the sheet that
            // creates a row in it. On a phone the list steps aside and this is the page.
            children: [
              { path: 'new', Component: CreateCompanyPage, handle: { screen: 'New company' } },
            ],
          },
        ],
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<AppSplash message="Loading…" />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
];
