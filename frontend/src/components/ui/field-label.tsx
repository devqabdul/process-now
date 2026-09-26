import type { LabelHTMLAttributes } from 'react';

import { cn } from '@lib/cn';

// Shared with group labels (a <legend> over radio cards) so there is one label style.
export const fieldLabelClasses = 'text-label font-semibold text-fg-secondary';

export const FieldLabel = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  // eslint-disable-next-line jsx-a11y/label-has-associated-control -- callers pass htmlFor
  <label className={cn(fieldLabelClasses, className)} {...props} />
);
