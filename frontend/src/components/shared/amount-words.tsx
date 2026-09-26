import { numberInWords } from '@utils/format/number-words';

interface AmountWordsProps {
  value: string | number | null | undefined;
  money?: boolean;
  unit?: string;
}

/** "₹1,25,000 · One Lakh Twenty Five Thousand Rupees" — read-back for a typed number. */
export const AmountWords = ({ value, money = false, unit }: AmountWordsProps) => {
  const read = numberInWords(value, { money, ...(unit ? { unit } : {}) });
  if (!read) return null;
  return (
    <>
      <span className="font-medium text-fg-secondary tabular-nums">{read.digits}</span>
      <span aria-hidden="true"> · </span>
      {read.words}
    </>
  );
};
