import type { ReactNode } from 'react';

import { cn } from '@lib/cn';

interface InputShellProps {
  invalid?: boolean;
  shake?: boolean;
  // lg is the sign-in screen's 52px field; every other form uses md.
  size?: 'md' | 'lg';
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}

/*
 * Icon + input + optional trailing slot: 44px on phones, 40px from lg up (52px with size="lg").
 * Focus styling comes from :focus-within, invalid from the `invalid` prop.
 * Put the <input> in children with the `inputClasses` below.
 */
export const InputShell = ({
  invalid = false,
  shake = false,
  size = 'md',
  leading,
  trailing,
  children,
  className,
}: InputShellProps) => (
  <div
    data-invalid={invalid || undefined}
    className={cn(
      'group flex items-center gap-2.5 border-[1.5px] border-line-field bg-surface transition-[border-color,box-shadow,background-color] duration-200',
      size === 'lg' ? 'h-control-hero rounded-12 px-3.5' : 'h-control rounded-10 px-3',
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
  'h-full min-w-0 flex-1 border-none bg-transparent text-base text-fg outline-none lg:text-13';
