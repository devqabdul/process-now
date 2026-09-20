import { CircleAlert } from 'lucide-react';

interface FieldErrorProps {
  id: string;
  message?: string | undefined;
}

// Always reserves one line so the layout doesn't jump when an error appears.
export const FieldError = ({ id, message }: FieldErrorProps) => (
  <div className="mt-2 flex min-h-5 items-start gap-1.5">
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
