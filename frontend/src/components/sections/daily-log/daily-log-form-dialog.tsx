import { NotebookPen } from 'lucide-react';

import type { DailyLog } from '@api/process-backend/daily-logs';
import { Button } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { formatWeekdayDate, shiftIsoDate } from '@utils/format/date';

import { DailyLogFields } from './daily-log-fields';
import {
  type DailyLogFormInput,
  type DailyLogSaveResult,
  useDailyLogForm,
} from './use-daily-log-form';

interface DailyLogFormDialogProps {
  // null = closed; a log = editing that day; 'new' = logging a day picked in the form.
  target: DailyLog | 'new' | null;
  today: string;
  rate: number | undefined;
  onClose: () => void;
  onSubmit: (values: DailyLogFormInput) => Promise<DailyLogSaveResult>;
}

export const DailyLogFormDialog = ({
  target,
  today,
  rate,
  onClose,
  onSubmit,
}: DailyLogFormDialogProps) => {
  const editing = target !== null && target !== 'new' ? target : null;
  const { form, submit } = useDailyLogForm({
    // A missed day is usually yesterday's.
    date: editing?.logDate ?? shiftIsoDate(today, -1),
    log: editing,
    onSubmit,
    resetKey: target,
  });
  const { isSubmitting } = form.formState;

  return (
    <Dialog
      open={!!target}
      title={editing ? `Edit ${formatWeekdayDate(editing.logDate)}` : 'Log another day'}
      description="Machine hours and electricity units for one day. There is one log per day."
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-surface-muted text-fg-secondary">
          <NotebookPen aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      sheet
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={submit}
      action={
        <Button type="submit" size="md" loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving…' : 'Save log'}
        </Button>
      }
    >
      <DailyLogFields
        form={form}
        idPrefix="daily-log"
        rate={rate}
        {...(editing ? {} : { pickDate: { max: today } })}
      />
    </Dialog>
  );
};
