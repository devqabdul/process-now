import { Search, SearchX } from 'lucide-react';
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { EmptyState } from '@components/shared/empty-state';
import { IconButton } from '@components/ui/icon-button';
import type { NavItem } from '@constants/navigation';
import { cn } from '@lib/cn';

interface WorkspaceCommandPaletteProps {
  // The current workspace's screens: the palette searches these and nothing else.
  items: NavItem[];
}

const SHORTCUT = /Mac|iP(hone|ad|od)/.test(navigator.userAgent) ? '⌘ K' : 'Ctrl K';

export const WorkspaceCommandPalette = ({ items }: WorkspaceCommandPaletteProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  const needle = query.trim().toLowerCase();
  const results = needle ? items.filter((i) => i.label.toLowerCase().includes(needle)) : items;
  const activeItem = results[active];

  const open = () => {
    setQuery('');
    setActive(0);
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  };

  const go = (to: string) => {
    dialogRef.current?.close();
    navigate(to);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      open();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeItem) go(activeItem.to);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="hidden min-w-0 flex-1 items-center gap-2.5 rounded-10 border border-line bg-surface-subtle px-2.75 py-2 text-fg-subtle transition-[border-color,background-color] duration-150 hover:border-line-strong hover:bg-surface lg:flex lg:max-w-130"
      >
        <Search aria-hidden="true" className="size-3.75 flex-none" strokeWidth={1.8} />
        <span className="flex-1 truncate text-left text-[13px]">Search screens…</span>
        <span className="flex-none rounded-6 border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-[10.5px] text-fg-muted">
          {SHORTCUT}
        </span>
      </button>

      <IconButton aria-label="Search screens" onClick={open} className="ml-auto lg:hidden">
        <Search aria-hidden="true" className="size-4.75" strokeWidth={1.7} />
      </IconButton>

      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click to dismiss; <dialog> already closes on Escape */}
      <dialog
        ref={dialogRef}
        aria-label="Search screens"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="mx-auto mt-[12vh] mb-auto w-[min(34rem,calc(100vw-2rem))] max-w-none animate-palette-in rounded-16 border border-line bg-surface p-0 text-fg shadow-modal backdrop:bg-[rgba(17,20,23,0.32)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line-subtle px-3.5 py-3">
          <Search
            aria-hidden="true"
            className="size-4 flex-none text-fg-subtle"
            strokeWidth={1.8}
          />
          <input
            type="text"
            role="combobox"
            aria-label="Search screens"
            aria-expanded={results.length > 0}
            aria-controls="palette-results"
            aria-activedescendant={activeItem ? `palette-${activeItem.to}` : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search screens…"
            className="h-7 min-w-0 flex-1 border-none bg-transparent text-[14.5px] text-fg outline-none placeholder:text-placeholder"
          />
          <span className="flex-none rounded-6 border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-[10.5px] text-fg-muted">
            Esc
          </span>
        </div>

        {results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No screens match"
            description={`Nothing in this workspace is called “${query.trim()}”.`}
          />
        ) : (
          <ul
            id="palette-results"
            role="listbox"
            aria-label="Screens"
            className="max-h-88 overflow-y-auto p-1.5"
          >
            {results.map((item, index) => (
              /* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- the combobox input owns the keyboard: ↑/↓ moves, Enter opens. */
              <li
                key={item.to}
                id={`palette-${item.to}`}
                role="option"
                aria-selected={index === active}
                onClick={() => go(item.to)}
                onMouseMove={() => setActive(index)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-9 px-2.75 py-2.5 text-[13.5px] font-medium text-fg-secondary',
                  index === active && 'bg-surface-muted text-fg',
                )}
              >
                <item.icon aria-hidden="true" className="size-4.25 flex-none" strokeWidth={1.7} />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </dialog>
    </>
  );
};
