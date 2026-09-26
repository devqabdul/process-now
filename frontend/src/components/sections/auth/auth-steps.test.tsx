import { render, screen } from '@testing-library/react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { IdentifyStep } from './identify-step';
import { PasswordStep } from './password-step';

const field = <T extends string>(name: T): UseFormRegisterReturn<T> => ({
  name,
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn(),
});

describe('login steps', () => {
  it('marks both sign-in inputs as required', () => {
    const { unmount } = render(
      <IdentifyStep
        field={field('identifier')}
        error={undefined}
        kind="mobile"
        onKindChange={vi.fn()}
        isValid={false}
        shake={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Mobile number')).toBeRequired();
    unmount();

    render(
      <PasswordStep
        field={field('password')}
        error={undefined}
        identityShown="asha@fusenow.in"
        isMobile={false}
        showPassword={false}
        shake={false}
        isSubmitting={false}
        onTogglePassword={vi.fn()}
        onBack={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Password')).toBeRequired();
  });
});
