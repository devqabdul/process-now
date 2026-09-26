import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, Search, SearchX, Truck } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { vendorsKeys } from '@api/process-backend/vendors';
import { EmptyState } from '@components/shared/empty-state';
import { LetterTile } from '@components/ui/avatar';
import { Spinner } from '@components/ui/spinner';
import { cn } from '@lib/cn';
import { displayIdentifier } from '@utils/identifier';

import { useDismissable } from './use-dismissable';

interface WorkspaceCompanyChipProps {
  name: string;
  // Super Admin sits above the companies: the platform name renders without a dropdown.
  switchable: boolean;
}

// Long enough that typing a name doesn't fire a request per keystroke.
const SEARCH_DEBOUNCE_MS = 300;
const RESULTS = 'vendor-jump-results';

/** A company admin's jump to one vendor's orders, from anywhere in the workspace. */
export const WorkspaceCompanyChip = ({ name, switchable }: WorkspaceCompanyChipProps) => {
  // state
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  // wiring
  const { open, setOpen, ref } = useDismissable();
  const navigate = useNavigate();
  const { data, isPending, isFetching, isError } = useQuery({
    ...vendorsKeys.list({ ...(q ? { q } : {}) }),
    enabled: switchable && open,
  });

  // derived
  const vendors = data?.items ?? [];
  const activeVendor = vendors[active];

  // callbacks
  const toggle = () => {
    setSearch('');
    setQ('');
    setActive(0);
    setOpen(!open);
  };

  const jump = (vendorId: string) => {
    setOpen(false);
    void navigate(`/orders?vendorId=${vendorId}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (vendors.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + vendors.length) % vendors.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeVendor) jump(activeVendor.id);
    }
  };

  // effects
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setActive(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

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
        aria-haspopup="dialog"
        onClick={toggle}
        className="flex items-center gap-2 rounded-10 px-2.25 py-1.5 transition-colors duration-150 hover:bg-surface-muted"
      >
        {/* An action, not a location: a bare "Vendors" here read as the page you were on. */}
        <Truck aria-hidden="true" className="size-4 flex-none text-fg-subtle" strokeWidth={1.8} />
        <span className="text-sm font-medium text-fg-secondary">Jump to a vendor</span>
        <ChevronDown aria-hidden="true" className="size-3.25 flex-none text-fg-subtle" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Jump to a vendor"
          className="absolute top-[calc(100%+5px)] left-0 z-50 w-80 animate-pop rounded-12 border border-line bg-surface shadow-popover"
        >
          <div className="flex items-center gap-2.25 border-b border-line-subtle px-3 py-2.5">
            <Search aria-hidden="true" className="size-3.75 flex-none text-fg-subtle" />
            <input
              ref={input}
              type="text"
              role="combobox"
              aria-label="Search vendors"
              aria-expanded={vendors.length > 0}
              aria-controls={RESULTS}
              aria-autocomplete="list"
              aria-activedescendant={activeVendor ? `vendor-jump-${activeVendor.id}` : undefined}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search vendors…"
              className="h-7 min-w-0 flex-1 border-none bg-transparent text-13 text-fg outline-none placeholder:text-placeholder"
            />
            {isFetching && <Spinner className="size-3.5 flex-none text-fg-subtle" />}
          </div>

          {isError ? (
            <p role="alert" className="px-3 py-4 text-13 text-fg-subtle">
              Couldn't load vendors. Close this and try again.
            </p>
          ) : isPending ? (
            <p className="px-3 py-4 text-13 text-fg-subtle">Loading vendors…</p>
          ) : vendors.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={q ? `No vendor matches “${q}”` : 'No vendors yet'}
              className="py-6"
            />
          ) : (
            <ul
              id={RESULTS}
              role="listbox"
              aria-label="Vendors"
              className="max-h-80 overflow-y-auto p-1.5"
            >
              {vendors.map((vendor, index) => (
                /* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- the combobox input owns the keyboard: ↑/↓ moves, Enter opens. */
                <li
                  key={vendor.id}
                  id={`vendor-jump-${vendor.id}`}
                  role="option"
                  aria-selected={index === active}
                  onClick={() => jump(vendor.id)}
                  onMouseMove={() => setActive(index)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-8 px-2.25 py-2',
                    index === active && 'bg-surface-muted',
                  )}
                >
                  <LetterTile name={vendor.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-13 font-semibold">{vendor.name}</span>
                    <span className="block truncate text-11 text-fg-subtle">
                      {displayIdentifier(vendor.phone)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/vendors"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-line-subtle px-3 py-2.5 text-13 font-semibold text-link hover:text-link-hover"
          >
            All vendors
            <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2} />
          </Link>
        </div>
      )}
    </div>
  );
};
