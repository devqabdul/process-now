import type { ServiceType } from '@api/process-backend/service-types';
import { ConfirmDeleteDialog } from '@components/shared/confirm-delete-dialog';

interface DeleteServiceTypeDialogProps {
  serviceType: ServiceType | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// The API refuses a service any order has used; deactivating is the way to retire those.
export const DeleteServiceTypeDialog = ({
  serviceType,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: DeleteServiceTypeDialogProps) => (
  <ConfirmDeleteDialog
    open={!!serviceType}
    title="Delete this service?"
    description={
      serviceType &&
      `${serviceType.name} will be removed. Only a service no order has used can be deleted — otherwise, deactivate it.`
    }
    errorId="delete-service-type-error"
    error={error}
    isSubmitting={isSubmitting}
    onClose={onClose}
    onConfirm={onConfirm}
  />
);
