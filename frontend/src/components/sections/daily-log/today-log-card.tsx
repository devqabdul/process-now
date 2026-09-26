import { CloudOff } from 'lucide-react';

import type { DailyLog } from '@api/process-backend/daily-logs';
import { LoadError } from '@components/shared/load-error';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardTitle } from '@components/ui/card';
import { Skeleton } from '@components/ui/skeleton';

import { DailyLogFields } from './daily-log-fields';
import {
  type DailyLogFormInput,
  type DailyLogSaveResult,
  useDailyLogForm,
} from './use-daily-log-form';

interface TodayLogCardProps {
  today: string;
  // "Fri, 26 Sep"
  todayLabel: string;
  log: DailyLog | undefined;
  rate: number | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSubmit: (values: DailyLogFormInput) => Promise<DailyLogSaveResult>;
}

const TodayForm = ({
  today,
  log,
  rate,
  onSubmit,
}: Pick<TodayLogCardProps, 'today' | 'log' | 'rate' | 'onSubmit'>) => {
  const { form, submit } = useDailyLogForm({ date: today, log, onSubmit, resetKey: log });
  const { isSubmitting } = form.formState;
  return (
    <form noValidate onSubmit={submit} className="grid gap-field">
      <DailyLogFields form={form} idPrefix="today-log" rate={rate} />
      <div>
        <Button type="submit" size="md" loading={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? 'Saving…' : log ? 'Save changes' : "Save today's log"}
        </Button>
      </div>
    </form>
  );
};

export const TodayLogCard = ({
  todayLabel,
  loading,
  error,
  onRetry,
  ...form
}: TodayLogCardProps) => (
  <Card className="p-panel" aria-labelledby="today-log-title">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <CardTitle id="today-log-title" className="text-fg-muted">
        Today · <span className="tabular-nums">{todayLabel}</span>
      </CardTitle>
      {!loading && !error && (
        <Badge tone={form.log ? 'success' : 'warning'}>
          {form.log ? 'Logged' : 'Not logged yet'}
        </Badge>
      )}
    </div>
    {loading ? (
      <div aria-hidden="true" className="grid gap-field sm:grid-cols-2">
        <Skeleton className="h-control rounded-10" />
        <Skeleton className="h-control rounded-10" />
        <Skeleton className="h-control rounded-10 sm:col-span-2" />
      </div>
    ) : error ? (
      <LoadError
        icon={CloudOff}
        title="Couldn't load today's log"
        description="Today's numbers didn't come back. Check your connection and try again — nothing has been lost."
        onRetry={onRetry}
      />
    ) : (
      <TodayForm {...form} />
    )}
  </Card>
);
