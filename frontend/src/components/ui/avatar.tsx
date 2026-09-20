import { cn } from '@lib/cn';

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

interface AvatarProps {
  name: string;
  size?: 'md' | 'lg';
  className?: string;
}

// A person: round ink tile with initials.
export const Avatar = ({ name, size = 'md', className }: AvatarProps) => (
  <span
    aria-hidden="true"
    className={cn(
      'grid flex-none place-items-center rounded-full bg-linear-135 from-brand-line to-brand-bg font-semibold text-brand-fg',
      size === 'lg' ? 'size-9.5 text-[12.5px]' : 'size-8 text-[11.5px]',
      className,
    )}
  >
    {initials(name)}
  </span>
);

export const LETTER_TILE_TONES = ['amber', 'teal', 'violet', 'blue', 'ink'] as const;
export type LetterTileTone = (typeof LETTER_TILE_TONES)[number];

const TONES: Record<LetterTileTone, string> = {
  amber: 'bg-warning-solid',
  teal: 'bg-success-solid',
  violet: 'bg-violet-solid',
  blue: 'bg-info-solid',
  ink: 'bg-brand-bg',
};

// Stable tone per name, so a company or vendor keeps its colour across screens.
export const toneFor = (seed: string): LetterTileTone => {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return LETTER_TILE_TONES[Math.abs(hash) % LETTER_TILE_TONES.length] ?? 'ink';
};

interface LetterTileProps {
  name: string;
  tone?: LetterTileTone;
  size?: 'sm' | 'md';
  className?: string;
}

// An organisation (company, vendor): rounded square with its first letter.
export const LetterTile = ({ name, tone, size = 'md', className }: LetterTileProps) => (
  <span
    aria-hidden="true"
    className={cn(
      'grid flex-none place-items-center font-bold text-brand-fg',
      size === 'sm' ? 'size-5 rounded-6 text-[9.5px]' : 'size-7 rounded-9 text-[11.5px]',
      TONES[tone ?? toneFor(name)],
      className,
    )}
  >
    {name.trim()[0]?.toUpperCase()}
  </span>
);
