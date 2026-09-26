import { ToWords } from 'to-words';

// Indian groups by lakh and crore (1,25,000 → One Lakh Twenty Five Thousand); international by
// thousand and million. ponytail: one system app-wide; make it a company setting if one asks.
export type NumberSystem = 'indian' | 'international';
export const NUMBER_SYSTEM: NumberSystem = 'indian';

const LOCALE = { indian: 'en-IN', international: 'en-US' } as const;
// Money is always rupees, whichever way the digits are grouped.
const RUPEES = {
  name: 'Rupee',
  plural: 'Rupees',
  symbol: '₹',
  fractionalUnit: { name: 'Paisa', plural: 'Paise', symbol: '' },
};

const converters = new Map<string, ToWords>();
const converter = (system: NumberSystem, money: boolean) => {
  const key = `${system}:${money}`;
  let found = converters.get(key);
  if (!found) {
    found = new ToWords({
      localeCode: LOCALE[system],
      converterOptions: money
        ? { currency: true, doNotAddOnly: true, currencyOptions: RUPEES }
        : { currency: false },
    });
    converters.set(key, found);
  }
  return found;
};

const GROUPING: Record<NumberSystem, Intl.NumberFormat> = {
  indian: new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }),
  international: new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }),
};

interface WordsOptions {
  // Rupees and paise; otherwise a plain number, followed by `unit` if given ("Ninety Five kg").
  money?: boolean;
  unit?: string;
  system?: NumberSystem;
}

/**
 * "125000.5" → { digits: "1,25,000.5", words: "One Lakh Twenty Five Thousand Rupees And Fifty Paise" }.
 * Null for anything that isn't a finite, non-negative number, so a half-typed field shows nothing.
 */
export const numberInWords = (
  raw: string | number | null | undefined,
  { money = false, unit, system = NUMBER_SYSTEM }: WordsOptions = {},
) => {
  const text = String(raw ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  const words = converter(system, money).convert(value);
  return {
    digits: `${money ? '₹' : ''}${GROUPING[system].format(value)}`,
    words: unit && !money ? `${words} ${unit}` : words,
  };
};
