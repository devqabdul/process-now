import type { ReactNode } from 'react';

import { cn } from '@lib/cn';

interface InputShellProps {
  invalid?: boolean;
  shake?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}

/*
 * The design's 52px field: icon + input + optional trailing slot.
 * Focus styling comes from :focus-within, invalid from the `invalid` prop.
 * Put the <input> in children with the `inputClasses` below.
 */
export const InputShell = ({
  invalid = false,
  shake = false,
  leading,
  trailing,
  children,
  className,
}: InputShellProps) => (
  <div
    data-invalid={invalid || undefined}
    className={cn(
      'group flex h-13 items-center gap-2.5 rounded-12 border-[1.5px] border-line-field bg-surface px-3.5 transition-[border-color,box-shadow,background-color] duration-200',
      'focus-within:border-focus focus-within:shadow-focus',
      'data-invalid:border-danger data-invalid:bg-danger-field data-invalid:focus-within:border-danger data-invalid:focus-within:shadow-none',
      shake && 'animate-shake',
      className,
    )}
  >
    {leading && (
      <span className="flex flex-none text-fg-subtle transition-colors duration-200 group-focus-within:text-focus group-data-invalid:text-danger">
        {leading}
      </span>
    )}
    {children}
    {trailing}
  </div>
);

export const inputClasses =
  'h-full min-w-0 flex-1 border-none bg-transparent text-[14.5px] text-fg outline-none';
