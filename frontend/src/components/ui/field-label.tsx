import type { LabelHTMLAttributes } from 'react';

import { cn } from '@lib/cn';

export const FieldLabel = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  // eslint-disable-next-line jsx-a11y/label-has-associated-control -- callers pass htmlFor
  <label className={cn('text-[12.5px] font-semibold text-fg-secondary', className)} {...props} />
);
