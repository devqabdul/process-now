import { ClipboardList, CloudOff } from 'lucide-react';
import { Link } from 'react-router';

import { DateSwitcher } from '@components/sections/dashboard/date-switcher';
import { PendingOrdersTable } from '@components/sections/dashboard/pending-orders-table';
import { StatGrid } from '@components/sections/dashboard/stat-grid';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { buttonClasses } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { cn } from '@lib/cn';

import { useDashboardPage } from './use-dashboard-page';

export const DashboardPage = () => {
  const { date, today, dayLabel, dashboard, isError, isRetrying, setDate, retry } =
    useDashboardPage();

  return (
    <>
      <title>Dashboard · ProcessNow</title>
      <PageHeader
        title="Dashboard"
        subtitle={`${dayLabel} at a glance.`}
        actions={<DateSwitcher date={date} max={today} onChange={setDate} />}
      />

      {isError ? (
        <LoadError
          icon={CloudOff}
          title="We couldn't load these numbers"
          description="The dashboard didn't come through. Check your connection and try again — nothing has been lost."
          isRetrying={isRetrying}
          onRetry={retry}
        />
      ) : (
        <>
          <StatGrid dashboard={dashboard} />

          {dashboard && !dashboard.dailyLog && (
            <Card className="p-0">
              <EmptyState
                icon={ClipboardList}
                title="Daily log not filled in"
                description="Machine hours and electricity units for this day haven't been recorded. Add them to complete the day's numbers."
                action={
                  <Link
                    to="/daily-log"
                    className={cn(
                      buttonClasses('primary', 'md'),
                      'hover:text-primary-fg hover:no-underline',
                    )}
                  >
                    Add daily log
                  </Link>
                }
              />
            </Card>
          )}

          <PendingOrdersTable dashboard={dashboard} />
        </>
      )}
    </>
  );
};
