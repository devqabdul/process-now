import type { LucideIcon } from 'lucide-react';

import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { EmptyState } from '@components/shared/empty-state';

interface LoadErrorProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

// The one shape a failed read takes: what didn't load, that nothing was lost, and a way back.
export const LoadError = ({
  icon,
  title,
  description,
  onRetry,
  isRetrying = false,
}: LoadErrorProps) => (
  <Card className="p-0">
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        <Button size="md" loading={isRetrying} onClick={onRetry}>
          Retry
        </Button>
      }
    />
  </Card>
);
