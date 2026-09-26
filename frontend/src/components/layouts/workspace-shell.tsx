import { type LucideIcon, PanelLeft, PanelTop } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useMatches } from 'react-router';

import { LogoutButton } from '@components/shared/logout-button';
import { ProcessMark } from '@components/shared/process-mark';
import { LoadingMark } from '@components/shared/loading-mark';
import { RouteProgress } from '@components/shared/route-progress';
import { ThemeToggle } from '@components/shared/theme-toggle';
import { Avatar } from '@components/ui/avatar';
import { IconButton } from '@components/ui/icon-button';
import { type NavGroup, SUPER_ADMIN_NAV, type WorkspaceIdentity } from '@constants/navigation';
import { accentAvatar, accentTile } from '@constants/roles';
import { cn } from '@lib/cn';
import { type LayoutMode, useLayoutMode } from '@lib/layout-mode';

import { WorkspaceBottomNav } from './workspace-bottom-nav';
import { WorkspaceCommandPalette } from './workspace-command-palette';
import { WorkspaceCompanyChip } from './workspace-company-chip';
import { WorkspaceMenuSheet } from './workspace-menu-sheet';
import { WorkspaceNotifications } from './workspace-notifications';

interface WorkspaceShellProps {
  nav: NavGroup[];
  identity: WorkspaceIdentity;
}

const isScreenHandle = (handle: unknown): handle is { screen: string } =>
  typeof handle === 'object' &&
  handle !== null &&
  typeof (handle as { screen?: unknown }).screen === 'string';

const isUnder = (pathname: string, to: string) => pathname === to || pathname.startsWith(`${to}/`);

const LAYOUTS: { value: LayoutMode; label: string; icon: LucideIcon }[] = [
  { value: 'sidebar', label: 'Sidebar layout', icon: PanelLeft },
  { value: 'top', label: 'Top navigation layout', icon: PanelTop },
];

/*
 * Chrome shared by both admin workspaces: sidebar + top bar from lg up,
 * top bar + bottom tab bar below it. Menus come from the caller, not from here.
 */
export const WorkspaceShell = ({ nav, identity }: WorkspaceShellProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const navigated = useRef(false);
  const { pathname } = useLocation();
  const { layout, setLayout } = useLayoutMode();

  const items = nav.flatMap((group) => group.items);
  // Name the screen being fetched: the route's own label first, then the menu entry it sits under.
  const routeScreen = useMatches().at(-1)?.handle;
  const navLabel = items
    .filter((item) => isUnder(pathname, item.to))
    .sort((a, b) => b.to.length - a.to.length)[0]?.label;
  const loadingScreen = isScreenHandle(routeScreen) ? routeScreen.screen : navLabel;
  const tabs = items.filter((item) => item.mobile === 'tab');
  const action = items.find((item) => item.mobile === 'action');
  const overflowItems = items.filter((item) => item.mobile === undefined);
  const openMenu = () => menuRef.current?.showModal();
  // The platform console sits above the companies, so it gets no switcher.
  const switchable = nav !== SUPER_ADMIN_NAV;

  // Tabbing after a navigation restarts inside the new page, not at the top of the window.
  useEffect(() => {
    if (navigated.current) mainRef.current?.focus({ preventScroll: true });
    navigated.current = true;
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-10 focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-fg"
      >
        Skip to content
      </a>

      {layout === 'sidebar' && (
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh flex-none flex-col px-3.5 py-4.5 transition-[width] duration-200 lg:flex',
            collapsed ? 'w-19' : 'w-56',
          )}
        >
          <div className="flex items-center gap-3 px-1.5 pt-1.5 pb-2">
            <span
              className={cn(
                'grid size-9.5 flex-none place-items-center rounded-12',
                accentTile(identity.accent),
              )}
            >
              <ProcessMark className="size-[74%]" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-base leading-tight font-bold tracking-[-0.015em]">
                  {identity.name}
                </span>
                <span className="block truncate text-11 text-fg-subtle">{identity.role}</span>
              </span>
            )}
          </div>

          <nav aria-label="Main" className="mt-4.5 flex flex-1 flex-col gap-4">
            {nav.map((group) => (
              <div key={group.title}>
                {!collapsed && (
                  <p className="px-2.5 pb-2.5 text-xs text-fg-subtle">{group.title}</p>
                )}
                <div className="flex flex-col gap-0.75">
                  {group.items
                    .filter((item) => item.mobile !== 'action')
                    .map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end ?? false}
                        title={item.label}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3.25 rounded-10 px-2.75 py-2.75 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-canvas-hover hover:text-fg hover:no-underline',
                            isActive && 'bg-surface font-semibold text-fg',
                            collapsed && 'justify-center',
                          )
                        }
                      >
                        <item.icon
                          aria-hidden="true"
                          className="size-4.25 flex-none"
                          strokeWidth={1.7}
                        />
                        <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
                        {item.badge !== undefined && !collapsed && (
                          <span className="ml-auto rounded-6 bg-surface-muted px-1.5 font-mono text-11 font-semibold text-fg-muted">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                </div>
              </div>
            ))}
          </nav>

          <button
            type="button"
            onClick={openMenu}
            aria-haspopup="dialog"
            className={cn(
              'mt-auto flex items-center gap-2.75 rounded-12 px-1.5 py-1.75 text-left transition-colors duration-150 hover:bg-canvas-hover',
              collapsed && 'justify-center',
            )}
          >
            <Avatar name={identity.user.name} className={accentAvatar(identity.accent)} />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-13 font-semibold">{identity.user.name}</span>
                <span className="block truncate text-11 text-fg-subtle">{identity.user.email}</span>
              </span>
            )}
            <span className="sr-only">Open account menu</span>
          </button>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:p-3 lg:pl-0">
        <div className="relative flex min-h-dvh flex-1 flex-col bg-surface lg:min-h-[calc(100dvh-1.5rem)] lg:overflow-hidden lg:rounded-18 lg:border lg:border-line-input lg:shadow-card">
          <header className="sticky top-0 z-30 flex h-14 flex-none items-center gap-3 border-b border-line-subtle bg-surface px-4 pt-[env(safe-area-inset-top)] lg:static lg:h-auto lg:px-5 lg:py-3.5">
            {layout === 'sidebar' && (
              <IconButton
                className="hidden lg:grid"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((value) => !value)}
              >
                <PanelLeft aria-hidden="true" className="size-4.25" strokeWidth={1.7} />
              </IconButton>
            )}

            {layout === 'top' && (
              <span
                className={cn(
                  'hidden size-8 flex-none place-items-center rounded-10 lg:grid',
                  accentTile(identity.accent),
                )}
              >
                <ProcessMark className="size-[74%]" />
              </span>
            )}

            {/* A plain name only repeats the open sidebar's brand; the vendor jump always earns its place. */}
            {(switchable || layout === 'top' || collapsed) && (
              <>
                <WorkspaceCompanyChip name={identity.name} switchable={switchable} />
                <span aria-hidden="true" className="hidden h-5.5 w-px flex-none bg-line lg:block" />
              </>
            )}

            <span className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <span
                className={cn(
                  'grid size-8 flex-none place-items-center rounded-10',
                  accentTile(identity.accent),
                )}
              >
                <ProcessMark className="size-[74%]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold tracking-[-0.015em]">
                  {identity.name}
                </span>
                <span className="block truncate text-11 text-fg-subtle">{identity.role}</span>
              </span>
            </span>

            <WorkspaceCommandPalette items={items} />

            <div className="ml-auto flex flex-none items-center gap-1">
              <div
                role="group"
                aria-label="Layout"
                className="mr-1.5 hidden gap-0.5 rounded-10 bg-surface-muted p-0.75 lg:flex"
              >
                {LAYOUTS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-pressed={layout === value}
                    onClick={() => setLayout(value)}
                    className="grid size-7 place-items-center rounded-7 text-fg-muted transition-[background-color,color,box-shadow] duration-150 hover:text-fg aria-pressed:bg-surface aria-pressed:text-fg aria-pressed:shadow-card"
                  >
                    <Icon aria-hidden="true" className="size-3.75" strokeWidth={1.8} />
                  </button>
                ))}
              </div>

              {/* Phones reach both from the account sheet; the tab bar's More covers every screen. */}
              <WorkspaceNotifications className="hidden lg:block" />
              <ThemeToggle className="hidden lg:grid" />
              {/* Also in the account sheet, which is where phones reach it. */}
              <LogoutButton className="hidden lg:grid" />
              <button
                type="button"
                onClick={openMenu}
                aria-haspopup="dialog"
                className={cn(
                  'grid size-11 place-items-center rounded-10 lg:size-8.5',
                  layout === 'sidebar' && 'lg:hidden',
                )}
              >
                <Avatar name={identity.user.name} className={accentAvatar(identity.accent)} />
                <span className="sr-only">Open account menu</span>
              </button>
            </div>
          </header>

          {layout === 'top' && (
            <nav
              aria-label="Main"
              className="hidden flex-none items-center gap-1 overflow-x-auto border-b border-line-subtle px-3.5 py-1.75 lg:flex"
            >
              {items
                .filter((item) => item.mobile !== 'action')
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                    className={({ isActive }) =>
                      cn(
                        'flex flex-none items-center gap-2 rounded-9 px-3 py-2.25 text-13 font-medium whitespace-nowrap text-fg-muted transition-colors duration-150 hover:bg-surface-muted hover:text-fg hover:no-underline',
                        isActive && 'bg-surface-muted font-semibold text-fg',
                      )
                    }
                  >
                    <item.icon aria-hidden="true" className="size-4 flex-none" strokeWidth={1.7} />
                    {item.label}
                  </NavLink>
                ))}
            </nav>
          )}

          <RouteProgress />

          <main
            id="main"
            ref={mainRef}
            tabIndex={-1}
            className="flex flex-1 flex-col gap-4.5 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] outline-none lg:px-6 lg:pt-6 lg:pb-7.5"
          >
            <Suspense fallback={<LoadingMark screen={loadingScreen} />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      {tabs.length > 1 && (
        <WorkspaceBottomNav
          tabs={tabs}
          action={action}
          hasOverflow={overflowItems.length > 0}
          moreActive={overflowItems.some((item) => isUnder(pathname, item.to))}
          onOpenMore={openMenu}
        />
      )}

      <WorkspaceMenuSheet
        ref={menuRef}
        identity={identity}
        overflowItems={overflowItems}
        layout={layout}
        sidebarCollapsed={collapsed}
      />
    </div>
  );
};
