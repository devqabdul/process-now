import { Building2, Hash, IndianRupee, Percent, Receipt, WifiOff } from 'lucide-react';

import { FormField } from '@components/shared/form-field';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { Toast } from '@components/shared/toast';
import { Button } from '@components/ui/button';
import { Card, CardTitle } from '@components/ui/card';
import { FieldError } from '@components/ui/field-error';
import { Skeleton } from '@components/ui/skeleton';

import { useCompanySettingsPage } from './use-company-settings-page';

const ICON = 'size-4';

export const CompanySettingsPage = () => {
  const { form, isLoading, isError, isSubmitting, saved, handleSubmit, dismissSaved, retry } =
    useCompanySettingsPage();
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <>
      <title>Settings · ProcessNow</title>
      <PageHeader
        title="Settings"
        subtitle="Your company's details and the rates behind every bill and the dashboard."
      />

      {isError ? (
        <LoadError
          framed
          icon={WifiOff}
          title="Couldn't load the settings"
          description="They didn't come back. Check your connection and try again — nothing has been changed."
          onRetry={retry}
        />
      ) : isLoading ? (
        <Card className="w-full max-w-2xl p-4 lg:p-5">
          <Skeleton className="h-2.5 w-24" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-11 w-full rounded-10" />
            ))}
          </div>
        </Card>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="w-full max-w-2xl">
          <Card className="p-4 lg:p-5">
            <CardTitle className="text-fg-subtle">Company</CardTitle>
            <div className="mt-3.5 grid gap-x-field-x gap-y-field sm:grid-cols-2">
              <FormField
                id="name"
                className="sm:col-span-2"
                label="Company name"
                required
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
                help="Clear it and new bills carry no GST line."
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
                help="Goes in front of new order and bill numbers: FN-0001."
                leading={<Hash className={ICON} strokeWidth={1.8} aria-hidden="true" />}
                {...register('numberPrefix')}
              />
            </div>
          </Card>

          <Card className="mt-3.5 p-4 lg:p-5">
            <CardTitle className="text-fg-subtle">Rates</CardTitle>
            <div className="mt-3.5 grid gap-x-field-x gap-y-field sm:grid-cols-2">
              <FormField
                id="gstRate"
                label="GST rate"
                required
                inputMode="decimal"
                placeholder="18"
                error={errors.gstRate}
                help="Applied to new bills while you have a GST number."
                trailing={<Percent className={ICON} strokeWidth={1.8} aria-hidden="true" />}
                {...register('gstRate')}
              />
              <FormField
                id="electricityRate"
                label="Electricity rate"
                required
                inputMode="decimal"
                placeholder="8.50"
                error={errors.electricityRate}
                help="Per unit, for the dashboard's electricity cost."
                leading={<IndianRupee className={ICON} strokeWidth={1.8} aria-hidden="true" />}
                {...register('electricityRate')}
              />
            </div>
          </Card>

          <FieldError id="settings-form-error" message={errors.root?.message} />

          <div className="mt-3.5 flex justify-end">
            <Button type="submit" size="md" loading={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </form>
      )}

      <Toast message={saved} onDismiss={dismissSaved} />
    </>
  );
};
