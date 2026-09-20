import { Bell } from 'lucide-react';

import { EmptyState } from '@components/shared/empty-state';
import { IconButton } from '@components/ui/icon-button';
import { cn } from '@lib/cn';

import { useDismissable } from './use-dismissable';

export const NotificationsEmpty = () => (
  <EmptyState
    icon={Bell}
    title="No notifications yet"
    description="Order updates, bill reminders and vendor activity will show up here."
  />
);

export const WorkspaceNotifications = ({ className }: { className?: string }) => {
  const { open, setOpen, ref } = useDismissable();

  return (
    <div ref={ref} className={cn('relative', className)}>
      <IconButton
        aria-label="Notifications — nothing yet"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell aria-hidden="true" className="size-4.25" strokeWidth={1.7} />
      </IconButton>

      {open && (
        <div
          role="group"
          aria-labelledby="workspace-notifications-heading"
          className="absolute top-[calc(100%+8px)] right-0 z-40 w-98 max-w-[calc(100vw-2rem)] animate-pop overflow-hidden rounded-16 border border-line bg-surface shadow-modal"
        >
          <p
            id="workspace-notifications-heading"
            className="px-4 pt-3.5 pb-3 text-sm font-bold tracking-[-0.01em]"
          >
            Notifications
          </p>
          {/* TODO(api): unread count + rows */}
          <div className="border-t border-line-subtle">
            <NotificationsEmpty />
          </div>
        </div>
      )}
    </div>
  );
};
