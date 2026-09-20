import { Bell, ChevronDown, LogOut, Moon, Sun } from 'lucide-react';
import { type RefObject, useState } from 'react';
import { NavLink } from 'react-router';

import { Avatar } from '@components/ui/avatar';
import type { NavItem, WorkspaceIdentity } from '@constants/navigation';
import { cn } from '@lib/cn';
import type { LayoutMode } from '@lib/layout-mode';
import { accentAvatar } from '@constants/roles';
import { useLogout } from '@hooks/use-logout';
import { useTheme } from '@lib/theme';

import { NotificationsEmpty } from './workspace-notifications';

interface WorkspaceMenuSheetProps {
  ref: RefObject<HTMLDialogElement | null>;
  identity: WorkspaceIdentity;
  // Menu entries that don't fit the phone tab bar; hidden on desktop, where the sidebar has them.
  overflowItems: NavItem[];
  layout: LayoutMode;
  sidebarCollapsed: boolean;
}

const ROW =
  'flex items-center gap-3 rounded-9 px-2.75 py-2.5 text-[13.5px] font-medium text-fg-secondary transition-colors duration-150 hover:bg-surface-muted hover:text-fg hover:no-underline';

// Bottom sheet on phones; on desktop a popover beside the sidebar user row, or under the
// top bar's avatar in the top-nav layout. Margin (not anchor positioning) places it,
// so it works in every browser that ships <dialog>.
export const WorkspaceMenuSheet = ({
  ref,
  identity,
  overflowItems,
  layout,
  sidebarCollapsed,
}: WorkspaceMenuSheetProps) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { logout, isLoggingOut } = useLogout();

  const close = () => ref.current?.close();
  const isDark = theme === 'dark';

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click to dismiss; <dialog> already closes on Escape */
    <dialog
      ref={ref}
      aria-label="Account menu"
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
      className={cn(
        'mx-0 mt-auto mb-0 w-full max-w-none rounded-t-20 border border-line bg-surface p-1.5 text-fg shadow-popover backdrop:bg-[rgba(17,20,23,0.32)]',
        'lg:mr-auto lg:mb-4 lg:w-61.5 lg:rounded-14 lg:backdrop:bg-transparent',
        layout === 'top'
          ? 'lg:mt-15 lg:mr-4 lg:mb-auto lg:ml-auto'
          : sidebarCollapsed
            ? 'lg:ml-21.5'
            : 'lg:ml-58.5',
      )}
    >
      <div className="flex items-center gap-2.75 px-2.5 py-2.5">
        <Avatar name={identity.user.name} size="lg" className={accentAvatar(identity.accent)} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold">{identity.user.name}</p>
          <p className="truncate text-[11.5px] text-fg-subtle">{identity.user.email}</p>
        </div>
      </div>

      {overflowItems.length > 0 && (
        <div className="border-t border-line-subtle pt-1.5 lg:hidden">
          {overflowItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={close} className={ROW}>
              <item.icon aria-hidden="true" className="size-4.25 flex-none" strokeWidth={1.7} />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* The phone top bar keeps only search and the avatar, so both controls live here. */}
      <div className="mt-1.5 border-t border-line-subtle pt-1.5 lg:hidden">
        <button
          type="button"
          aria-expanded={notificationsOpen}
          onClick={() => setNotificationsOpen((shown) => !shown)}
          className={cn(ROW, 'w-full')}
        >
          <Bell aria-hidden="true" className="size-4.25 flex-none" strokeWidth={1.7} />
          Notifications
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'ml-auto size-3.75 flex-none text-fg-subtle transition-transform duration-200',
              notificationsOpen && 'rotate-180',
            )}
          />
        </button>
        {notificationsOpen && <NotificationsEmpty />}

        <button
          type="button"
          aria-pressed={isDark}
          onClick={toggleTheme}
          className={cn(ROW, 'w-full')}
        >
          {isDark ? (
            <Sun aria-hidden="true" className="size-4.25 flex-none" strokeWidth={1.7} />
          ) : (
            <Moon aria-hidden="true" className="size-4.25 flex-none" strokeWidth={1.7} />
          )}
          Dark theme
          <span className="ml-auto text-[11.5px] font-semibold text-fg-subtle">
            {isDark ? 'On' : 'Off'}
          </span>
        </button>
      </div>

      <div className="mt-1.5 border-t border-line-subtle pt-1.5">
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={() => {
            close();
            void logout();
          }}
          className={cn(ROW, 'w-full hover:bg-danger-soft hover:text-danger-strong')}
        >
          <LogOut aria-hidden="true" className="size-4.25 flex-none" strokeWidth={1.7} />
          Log out
        </button>
      </div>
    </dialog>
  );
};
