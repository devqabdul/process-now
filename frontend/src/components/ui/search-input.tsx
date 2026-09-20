import { Search, X } from 'lucide-react';

import { cn } from '@lib/cn';

import { InputShell, inputClasses } from './input-shell';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // Visible placeholders aren't labels; this names the field for screen readers.
  label: string;
  className?: string;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search…',
  label,
  className,
}: SearchInputProps) => (
  <InputShell
    leading={<Search aria-hidden="true" className="size-3.75" strokeWidth={1.8} />}
    trailing={
      value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="-mr-1.5 grid size-11 flex-none place-items-center rounded-8 text-fg-subtle lg:size-8 transition-colors duration-150 hover:bg-surface-muted hover:text-fg"
        >
          <X aria-hidden="true" className="size-3" strokeWidth={2.2} />
        </button>
      )
    }
    className={cn('h-11 gap-2.25 rounded-10 border px-3 lg:h-9.5', className)}
  >
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className={cn(inputClasses, 'text-[13px] [&::-webkit-search-cancel-button]:appearance-none')}
    />
  </InputShell>
);
