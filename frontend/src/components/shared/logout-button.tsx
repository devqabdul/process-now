import { LogOut } from 'lucide-react';

import { IconButton } from '@components/ui/icon-button';
import { useLogout } from '@hooks/use-logout';

export const LogoutButton = ({ className }: { className?: string }) => {
  const { logout, isLoggingOut } = useLogout();

  return (
    <IconButton
      aria-label="Log out"
      title="Log out"
      disabled={isLoggingOut}
      onClick={() => void logout()}
      className={className}
    >
      <LogOut aria-hidden="true" className="size-4.25" strokeWidth={1.7} />
    </IconButton>
  );
};
