import { CircleAlert } from 'lucide-react';

import { cn } from '@lib/cn';

interface FieldErrorProps {
  id: string;
  message?: string | undefined;
  // Keep a blank line when there's no error: only for a single-field step whose button mustn't jump.
  reserve?: boolean;
}

export const FieldError = ({ id, message, reserve = false }: FieldErrorProps) =>
  !message && !reserve ? null : (
    <div className={cn('mt-label flex items-start gap-1.5', reserve && 'min-h-5')}>
      {message && (
        <>
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 size-3.25 flex-none text-danger-strong"
            strokeWidth={2}
          />
          <span id={id} role="alert" className="text-xs leading-[1.45] text-danger-strong">
            {message}
          </span>
        </>
      )}
    </div>
  );
