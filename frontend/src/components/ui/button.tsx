import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@lib/cn';

import { Spinner } from './spinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'ghost';
type ButtonSize = 'lg' | 'md' | 'sm';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-fg hover:bg-primary-hover hover:shadow-button active:translate-y-px disabled:hover:shadow-none',
  secondary:
    'border border-line bg-surface text-fg-secondary hover:border-line-strong hover:bg-surface-hover hover:text-fg',
  // White on --pn-danger-solid is 5.10:1 light / 5.97:1 dark; -strong flips light in dark
  // mode and must never carry white text.
  danger:
    'bg-danger-solid text-brand-fg hover:shadow-button active:translate-y-px disabled:hover:shadow-none',
  // The Cancel beside a destructive action: same weight and hue, so the pair reads as one choice.
  'danger-outline':
    'border-[1.5px] border-danger-solid bg-surface text-danger-strong hover:bg-danger-softer',
  ghost: 'bg-transparent text-fg-subtle hover:text-fg',
};

const SIZES: Record<ButtonSize, string> = {
  lg: 'h-13 w-full rounded-12 text-sm',
  md: 'h-11 rounded-12 px-5 text-sm',
  // Toolbar size: 44px touch target on phones, the design's 38px from lg up.
  sm: 'h-11 rounded-10 px-3.5 text-13 lg:h-9.5',
};

// Shared with links that look like buttons (e.g. a router <Link>).
export const buttonClasses = (variant: ButtonVariant = 'primary', size: ButtonSize = 'lg') =>
  cn(
    'inline-flex items-center justify-center gap-2.5 font-semibold transition-[background-color,box-shadow,transform,color] duration-200 disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
  );

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

// While loading: disabled (no double submit), aria-busy, inline spinner before the label.
export const Button = ({
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cn(buttonClasses(variant, size), loading && 'cursor-wait', className)}
    {...props}
  >
    {loading && <Spinner />}
    {children}
  </button>
);
