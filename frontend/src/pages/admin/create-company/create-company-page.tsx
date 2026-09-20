import {
  AtSign,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Hash,
  Lock,
  Receipt,
  Smartphone,
  User,
} from 'lucide-react';
import { Link, useOutletContext } from 'react-router';

import { PageHeader } from '@components/shared/page-header';
import { FormField } from '@components/shared/form-field';
import { Button, buttonClasses } from '@components/ui/button';
import { Card, CardTitle } from '@components/ui/card';

import { toMobileInput } from '@utils/identifier';

import { useCreateCompanyPage } from './use-create-company-page';

const ICON = 'size-4';

export const CreateCompanyPage = () => {
  const {
    form,
    showPassword,
    isSubmitting,
    createdName,
    successHeadingRef,
    togglePassword,
    handleSubmit,
    addAnother,
  } = useCreateCompanyPage();
  // Inside the desktop side sheet the panel already carries the heading and a way out.
  const { inSheet } = useOutletContext<{ inSheet?: boolean }>() ?? {};
  const { register, formState } = form;
  const { errors } = formState;
  const adminPhone = register('adminPhone');

  return (
    <>
      <title>New company · ProcessNow</title>
      {!inSheet && (
        <PageHeader
          title="New company"
          subtitle="Add a business and the admin who will run it."
          actions={
            <Link to="/admin/companies" className={buttonClasses('secondary', 'sm')}>
              Back to companies
            </Link>
          }
        />
      )}

      {createdName ? (
        <Card role="status" className="mx-auto w-full max-w-2xl animate-rise p-5">
          <span className="grid size-10 place-items-center rounded-12 bg-success-soft text-success">
            <CheckCircle2 aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            className="mt-3.5 text-base font-semibold outline-none"
          >
            {createdName} is on ProcessNow
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-fg-subtle">
            Its admin can sign in now with the mobile number or email you entered, and start adding
            service types, vendors and orders.
          </p>
          <div className="mt-4.5 flex flex-wrap gap-2">
            <Link to="/admin/companies" className={buttonClasses('primary', 'md')}>
              View companies
            </Link>
            <Button variant="secondary" size="md" onClick={addAnother}>
              Add another company
            </Button>
          </div>
        </Card>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
          <Card className="p-4 lg:p-5">
            <CardTitle className="text-fg-subtle">Company</CardTitle>
            <div className="mt-3.5 grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <FormField
                id="name"
                className="sm:col-span-2"
                label="Company name"
                required
                placeholder="FuseNow"
                autoComplete="organization"
                error={errors.name}
                leading={<Building2 className={ICON} strokeWidth={1.8} aria-hidden="true" />}
                {...register('name')}
              />
              <FormField
                id="gstNo"
                label="GST number"
                hint="Optional"
                placeholder="27AABCF1234M1Z5"
                autoCapitalize="characters"
                spellCheck={false}
                error={errors.gstNo}
                leading={<Receipt className={ICON} strokeWidth={1.8} aria-hidden="true" />}
                {...register('gstNo')}
              />
              <FormField
                id="numberPrefix"
                label="Number prefix"
                hint="Optional"
                placeholder="FN"
                autoCapitalize="characters"
                spellCheck={false}
                error={errors.numberPrefix}
                leading={<Hash className={ICON} strokeWidth={1.8} aria-hidden="true" />}
                {...register('numberPrefix')}
              />
            </div>
          </Card>

          <Card className="mt-3.5 p-4 lg:p-5">
            <CardTitle className="text-fg-subtle">First company admin</CardTitle>
            <p className="mt-2 text-[12px] leading-[1.55] text-fg-subtle">
              This is the only login for the company. A mobile number or an email is enough — either
              one signs them in.
            </p>
            <div className="mt-3.5 grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <FormField
                id="adminName"
                className="sm:col-span-2"
                label="Admin name"
                required
                placeholder="Asha Rao"
                autoComplete="name"
                error={errors.adminName}
                leading={<User className={ICON} strokeWidth={1.8} aria-hidden="true" />}
                {...register('adminName')}
              />
              {/* Either field satisfies the rule, so neither is required on its own. */}
              <fieldset className="grid min-w-0 gap-x-4 gap-y-2 sm:col-span-2 sm:grid-cols-2">
                <legend className="sr-only">
                  Add a mobile number or an email — the admin signs in with one of them.
                </legend>
                <FormField
                  id="adminPhone"
                  label="Mobile number"
                  hint="Phone or email"
                  type="tel"
                  inputMode="numeric"
                  placeholder="9800022222"
                  autoComplete="tel-national"
                  error={errors.adminPhone}
                  leading={<Smartphone className={ICON} strokeWidth={1.8} aria-hidden="true" />}
                  {...adminPhone}
                  // No maxLength: it would truncate a pasted "+91 98000 22222" to "+91 98000".
                  onChange={(event) => {
                    event.target.value = toMobileInput(event.target.value);
                    return adminPhone.onChange(event);
                  }}
                />
                <FormField
                  id="adminEmail"
                  label="Email address"
                  hint="Phone or email"
                  type="email"
                  inputMode="email"
                  placeholder="asha@fusenow.in"
                  autoComplete="email"
                  spellCheck={false}
                  error={errors.adminEmail}
                  leading={<AtSign className={ICON} strokeWidth={1.8} aria-hidden="true" />}
                  {...register('adminEmail')}
                />
              </fieldset>
              <FormField
                id="password"
                className="sm:col-span-2"
                label="Password"
                required
                hint="At least 8 characters"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.password}
                leading={<Lock className={ICON} strokeWidth={1.8} aria-hidden="true" />}
                trailing={
                  <button
                    type="button"
                    onClick={togglePassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="grid size-11 flex-none place-items-center rounded-8 text-fg-subtle lg:size-7 transition-colors duration-150 hover:bg-surface-muted hover:text-fg-secondary"
                  >
                    {showPassword ? (
                      <EyeOff className="size-3.75" strokeWidth={1.8} aria-hidden="true" />
                    ) : (
                      <Eye className="size-3.75" strokeWidth={1.8} aria-hidden="true" />
                    )}
                  </button>
                }
                {...register('password')}
              />
            </div>
          </Card>

          {errors.root?.message && (
            <p
              role="alert"
              className="mt-3.5 rounded-12 border border-danger-line bg-danger-softer px-3.5 py-3 text-[12.5px] leading-[1.5] text-danger-strong"
            >
              {errors.root.message}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} className="mt-3.5">
            {isSubmitting ? 'Creating company…' : 'Create company'}
          </Button>
        </form>
      )}
    </>
  );
};
