import { IndianRupee, Landmark, WalletMinimal } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import type { BankAccount } from '@api/process-backend/bank-accounts';
import { type Bill, PAYMENT_METHODS, type PaymentMethod } from '@api/process-backend/billing';
import { AmountWords } from '@components/shared/amount-words';
import { FormField } from '@components/shared/form-field';
import { SelectField } from '@components/shared/select-field';
import { Button } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';
import { formatMoney } from '@utils/format/money';

const ICON = 'size-4 text-fg-subtle';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank transfer',
  cheque: 'Cheque',
  other: 'Other',
};

// Compared in whole paise, so a float's rounding can't refuse an exact payment.
const toPaise = (value: string) => Math.round(Number(value) * 100);
const isAmount = (value: string) => /^\d+(\.\d{1,2})?$/.test(value.trim());

export interface PaymentInput {
  amount: string;
  method: PaymentMethod;
  bankAccountId: string;
}

interface RecordPaymentDialogProps {
  bill: Bill | null;
  // Active accounts only: a closed one takes no new money.
  accounts: BankAccount[];
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (payment: PaymentInput) => void;
}

/** Opens at the full amount due — the usual case; a part payment is a deliberate edit. */
export const RecordPaymentDialog = ({
  bill,
  accounts,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: RecordPaymentDialogProps) => {
  // The page keys this dialog by bill, so each one opens with its own amount due.
  const [amount, setAmount] = useState(bill?.amountDue ?? '');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [bankAccountId, setBankAccountId] = useState(
    accounts.length === 1 ? (accounts[0]?.id ?? '') : '',
  );
  const [touched, setTouched] = useState(false);

  // derived
  const due = bill?.amountDue ?? '0';
  const amountError = !isAmount(amount)
    ? 'Enter an amount, like 450 or 450.50.'
    : toPaise(amount) < 1
      ? 'Enter more than zero.'
      : toPaise(amount) > toPaise(due)
        ? `Only ${formatMoney(due)} is due on this bill.`
        : null;

  // callbacks
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!amountError) onConfirm({ amount: amount.trim(), method, bankAccountId });
  };

  return (
    <Dialog
      open={!!bill}
      title={`Payment for ${bill?.billNo}`}
      description={`${bill?.order.vendor.name} owes ${formatMoney(due)} of ${formatMoney(bill?.total)}.`}
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-success-soft text-success">
          <WalletMinimal aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={submit}
      action={
        <Button type="submit" size="md" loading={isSubmitting} className="w-full">
          Record payment
        </Button>
      }
    >
      <FormField
        id="payment-amount"
        label="Amount received"
        required
        inputMode="decimal"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        error={touched && amountError ? { type: 'custom', message: amountError } : undefined}
        leading={<IndianRupee className={ICON} strokeWidth={1.8} aria-hidden="true" />}
        help={<AmountWords value={amount} money />}
      />

      <SelectField
        id="payment-method"
        label="Paid by"
        required
        value={method}
        onChange={(event) => setMethod(event.target.value as PaymentMethod)}
      >
        {PAYMENT_METHODS.map((value) => (
          <option key={value} value={value}>
            {METHOD_LABELS[value]}
          </option>
        ))}
      </SelectField>

      <SelectField
        id="payment-account"
        label="Received into"
        hint="Optional"
        value={bankAccountId}
        onChange={(event) => setBankAccountId(event.target.value)}
        leading={<Landmark className={ICON} strokeWidth={1.8} aria-hidden="true" />}
      >
        <option value="">No account</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </SelectField>

      <FieldError id="record-payment-error" message={error ?? undefined} />
    </Dialog>
  );
};
