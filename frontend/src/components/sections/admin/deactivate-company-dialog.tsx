import { TriangleAlert } from 'lucide-react';

import type { Company } from '@api/process-backend/companies';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';
import { SlideToConfirm } from '@components/ui/slide-to-confirm';

interface DeactivateCompanyDialogProps {
  company: Company | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeactivateCompanyDialog = ({
  company,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: DeactivateCompanyDialogProps) => (
  <Dialog
    open={!!company}
    title={`Deactivate ${company?.name}?`}
    description={`Nobody from ${company?.name} can sign in, and anyone signed in now is stopped on their next action. Orders, bills and history stay exactly as they are — you can switch it back on at any time.`}
    icon={
      <span className="grid size-9 flex-none place-items-center rounded-10 bg-danger-softer text-danger-strong">
        <TriangleAlert aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
      </span>
    }
    busy={isSubmitting}
    onClose={onClose}
    action={
      <SlideToConfirm
        label={`Deactivate ${company?.name}`}
        busyLabel="Deactivating…"
        busy={isSubmitting}
        onConfirm={onConfirm}
      />
    }
  >
    <FieldError id="deactivate-company-error" message={error ?? undefined} />
  </Dialog>
);
