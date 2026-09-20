import { Ellipsis } from 'lucide-react';
import { NavLink } from 'react-router';

import type { NavItem } from '@constants/navigation';
import { cn } from '@lib/cn';

interface WorkspaceBottomNavProps {
  tabs: NavItem[];
  action: NavItem | undefined;
  hasOverflow: boolean;
  moreActive: boolean;
  onOpenMore: () => void;
}

const TAB =
  'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-fg-subtle transition-colors duration-150 hover:no-underline';

const Tab = ({ item }: { item: NavItem }) => (
  <NavLink
    to={item.to}
    end={item.end ?? false}
    className={({ isActive }) => cn(TAB, isActive && 'text-fg')}
  >
    <span className="relative">
      <item.icon aria-hidden="true" className="size-5.5" strokeWidth={1.7} />
      {item.badge !== undefined && (
        <span className="absolute -top-1 -right-2 grid min-w-4 place-items-center rounded-full border-[1.5px] border-surface bg-danger px-1 font-mono text-[9px] font-semibold text-brand-fg">
          {item.badge}
        </span>
      )}
    </span>
    {item.mobileLabel ?? item.label}
  </NavLink>
);

// The action ("+ New") sits in the middle of the tabs: Home · Orders · + New · Bills · More.
export const WorkspaceBottomNav = ({
  tabs,
  action,
  hasOverflow,
  moreActive,
  onOpenMore,
}: WorkspaceBottomNavProps) => {
  const split = Math.ceil(tabs.length / 2);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {tabs.slice(0, split).map((item) => (
          <Tab key={item.to} item={item} />
        ))}

        {action && (
          <NavLink key={action.to} to={action.to} className={cn(TAB, 'gap-1.5')}>
            <span className="grid size-11 place-items-center rounded-full bg-primary text-primary-fg shadow-button">
              <action.icon aria-hidden="true" className="size-5.5" strokeWidth={2} />
            </span>
            {action.mobileLabel ?? action.label}
          </NavLink>
        )}

        {tabs.slice(split).map((item) => (
          <Tab key={item.to} item={item} />
        ))}

        {hasOverflow && (
          <button
            type="button"
            onClick={onOpenMore}
            className={cn(TAB, moreActive && 'text-fg')}
            aria-haspopup="dialog"
          >
            <Ellipsis aria-hidden="true" className="size-5.5" strokeWidth={1.7} />
            More
          </button>
        )}
      </div>
    </nav>
  );
};
