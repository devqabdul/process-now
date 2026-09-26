import { Menu } from 'lucide-react';
import { useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';

import type { NavItem } from '@constants/navigation';
import { cn } from '@lib/cn';

interface WorkspaceBottomNavProps {
  tabs: NavItem[];
  action: NavItem | undefined;
  overflowItems: NavItem[];
  moreActive: boolean;
}

const TAB =
  'relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-11 leading-none font-semibold text-fg-subtle transition-colors duration-150 hover:text-fg hover:no-underline';
// Colour only: a weight change would reflow the label mid-slide.
const TAB_ACTIVE = 'text-fg';

const Badge = ({ count }: { count: number }) => (
  <span className="absolute -top-1 -right-2 grid min-w-4 place-items-center rounded-full border-[1.5px] border-surface bg-danger px-1 font-mono text-11 font-semibold text-brand-fg">
    {count}
  </span>
);

// Icon over label on every tab; one shared pill slides under the active one.
const Tab = ({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) => (
  <NavLink
    to={item.to}
    end={item.end ?? false}
    onClick={onPress}
    className={cn(TAB, active && TAB_ACTIVE)}
  >
    <span className="relative">
      <item.icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.2 : 1.7} />
      {item.badge !== undefined && <Badge count={item.badge} />}
    </span>
    {item.mobileLabel ?? item.label}
  </NavLink>
);

const isOn = (item: NavItem, path: string) =>
  item.end ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);

// [Home · Orders · Bills · Menu] (+). Menu holds the screens that don't fit; the account
// lives behind the header avatar, so the two never share a sheet.
export const WorkspaceBottomNav = ({
  tabs,
  action,
  overflowItems,
  moreActive,
}: WorkspaceBottomNavProps) => {
  const sheetRef = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  // The tapped tab lights up at once; the URL only moves once the next page's code has loaded.
  const [pressed, setPressed] = useState<{ to: string; from: string } | null>(null);
  const pending = pressed?.from === pathname ? pressed.to : null;
  const count = tabs.length + (overflowItems.length > 0 ? 1 : 0);
  const activeIndex = pending
    ? tabs.findIndex((item) => item.to === pending)
    : moreActive
      ? tabs.length
      : tabs.findIndex((item) => isOn(item, pathname));
  const menuActive = activeIndex === tabs.length;
  const close = () => sheetRef.current?.close();

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 lg:hidden"
      >
        <div className="mx-auto flex h-14 max-w-md items-center gap-2.5">
          <div className="relative flex h-full min-w-0 flex-1 items-stretch rounded-full border border-line bg-surface p-1 shadow-popover">
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-y-1 left-1 rounded-full bg-surface-muted transition-[translate,opacity] duration-200 ease-(--ease-out-expo)',
                activeIndex < 0 && 'opacity-0',
              )}
              style={{
                width: `calc((100% - 0.5rem) / ${count})`,
                translate: `${Math.max(activeIndex, 0) * 100}% 0`,
              }}
            />
            {tabs.map((item, index) => (
              <Tab
                key={item.to}
                item={item}
                active={index === activeIndex}
                onPress={() => setPressed({ to: item.to, from: pathname })}
              />
            ))}

            {overflowItems.length > 0 && (
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => sheetRef.current?.showModal()}
                className={cn(TAB, menuActive && TAB_ACTIVE)}
              >
                <Menu aria-hidden="true" className="size-5" strokeWidth={menuActive ? 2.2 : 1.7} />
                Menu
              </button>
            )}
          </div>

          {action && (
            <NavLink
              to={action.to}
              aria-label={action.mobileLabel ?? action.label}
              className="grid size-14 flex-none place-items-center rounded-full border border-brand-line bg-brand-bg text-brand-fg shadow-popover hover:no-underline active:scale-[0.98]"
            >
              <action.icon aria-hidden="true" className="size-5.5" strokeWidth={2.2} />
            </NavLink>
          )}
        </div>
      </nav>

      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click to dismiss; <dialog> already closes on Escape */}
      <dialog
        ref={sheetRef}
        aria-label="Menu"
        onClick={(event) => {
          if (event.target === sheetRef.current) close();
        }}
        className="sheet-up mx-0 mt-auto mb-0 w-full max-w-none rounded-t-20 border border-line bg-surface p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] text-fg shadow-popover lg:hidden"
      >
        {overflowItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={close}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-9 px-2.75 py-3 text-sm font-medium text-fg-secondary transition-colors duration-150 hover:bg-surface-muted hover:text-fg hover:no-underline',
                isActive && 'bg-surface-muted font-semibold text-fg',
              )
            }
          >
            <item.icon aria-hidden="true" className="size-4.25 flex-none" strokeWidth={1.7} />
            {item.label}
          </NavLink>
        ))}
      </dialog>
    </>
  );
};
