import { Check, ChevronDown } from 'lucide-react';

import { LetterTile } from '@components/ui/avatar';

import { useDismissable } from './use-dismissable';

interface WorkspaceCompanyChipProps {
  name: string;
  // Super Admin sits above the companies: the platform name renders without a switcher.
  switchable: boolean;
}

export const WorkspaceCompanyChip = ({ name, switchable }: WorkspaceCompanyChipProps) => {
  const { open, setOpen, ref } = useDismissable();

  if (!switchable) {
    return (
      <span className="hidden truncate text-sm font-bold tracking-[-0.015em] lg:block">{name}</span>
    );
  }

  return (
    <div ref={ref} className="relative hidden flex-none lg:block">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-10 px-2.25 py-1.5 transition-colors duration-150 hover:bg-surface-muted"
      >
        <span className="truncate text-sm font-bold tracking-[-0.015em]">{name}</span>
        <ChevronDown aria-hidden="true" className="size-3.25 flex-none text-fg-subtle" />
        <span className="sr-only">Switch company</span>
      </button>

      {open && (
        <div
          role="group"
          aria-label="Companies"
          className="absolute top-[calc(100%+5px)] left-0 z-40 w-53 animate-pop rounded-12 border border-line bg-surface p-1.5 shadow-popover"
        >
          {/* TODO(api): company list comes from the API */}
          <button
            type="button"
            aria-current={true}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.25 rounded-8 bg-surface-muted px-2.25 py-2 text-[12.5px] font-semibold transition-colors duration-150 hover:bg-surface-hover"
          >
            <LetterTile name={name} size="sm" />
            <span className="truncate">{name}</span>
            <Check aria-hidden="true" className="ml-auto size-3.5 flex-none text-link" />
          </button>
        </div>
      )}
    </div>
  );
};
