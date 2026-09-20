import { Construction } from 'lucide-react';
import { Link, useMatches } from 'react-router';

import { EmptyState } from '@components/shared/empty-state';
import { PageHeader } from '@components/shared/page-header';
import { buttonClasses } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { cn } from '@lib/cn';

export interface ComingSoonHandle {
  screen: string;
  home?: string;
}

const isComingSoonHandle = (handle: unknown): handle is ComingSoonHandle =>
  typeof handle === 'object' &&
  handle !== null &&
  typeof (handle as ComingSoonHandle).screen === 'string';

// One placeholder for every menu entry that isn't built yet, so the menu stays navigable.
// The screen name comes from the route's handle, so a single lazy chunk serves them all.
export const ComingSoonPage = () => {
  const handle = useMatches().at(-1)?.handle;
  const { screen, home = '/' } = isComingSoonHandle(handle) ? handle : { screen: 'This screen' };

  return (
    <>
      <title>{`${screen} · ProcessNow`}</title>
      <PageHeader title={screen} subtitle="This screen is on the way." />
      <Card className="p-0">
        <EmptyState
          icon={Construction}
          title={`${screen} is coming soon`}
          description={`${screen} isn't built yet. Everything else in the menu works, so carry on there and check back shortly.`}
          action={
            <Link
              to={home}
              className={cn(
                buttonClasses('primary', 'md'),
                'hover:text-primary-fg hover:no-underline',
              )}
            >
              Back to dashboard
            </Link>
          }
        />
      </Card>
    </>
  );
};
