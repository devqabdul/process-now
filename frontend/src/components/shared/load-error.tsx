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
  // Standalone on a page it draws its own card; inside a table or card list the container frames it.
  framed?: boolean;
}

// The one shape a failed read takes: what didn't load, that nothing was lost, and a way back.
export const LoadError = ({
  icon,
  title,
  description,
  onRetry,
  isRetrying = false,
  framed = false,
}: LoadErrorProps) => {
  const body = (
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
  );
  return framed ? <Card className="p-0">{body}</Card> : body;
};
