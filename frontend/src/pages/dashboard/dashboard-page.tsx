import { ClipboardList, CloudOff } from 'lucide-react';
import { Link } from 'react-router';

import { DateSwitcher } from '@components/sections/dashboard/date-switcher';
import { PendingOrdersTable } from '@components/sections/dashboard/pending-orders-table';
import { StatGrid } from '@components/sections/dashboard/stat-grid';
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
          framed
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
            <Card className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
              <span className="hidden size-9 flex-none place-items-center rounded-10 bg-warning-soft text-warning sm:grid">
                <ClipboardList aria-hidden="true" className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">Daily log not filled in</h2>
                <p className="text-13 text-fg-subtle">
                  Add this day's machine hours and electricity units to complete its numbers.
                </p>
              </div>
              <Link
                to="/daily-log"
                className={cn(
                  buttonClasses('primary', 'md'),
                  'flex-none hover:text-primary-fg hover:no-underline',
                )}
              >
                Add daily log
              </Link>
            </Card>
          )}

          <PendingOrdersTable dashboard={dashboard} />
        </>
      )}
    </>
  );
};
