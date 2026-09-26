import { Eye, EyeOff, Landmark, Plus } from 'lucide-react';
import { type KeyboardEvent, useRef } from 'react';

import type { BankAccount } from '@api/process-backend/bank-accounts';
import { IconButton } from '@components/ui/icon-button';
import { Skeleton } from '@components/ui/skeleton';
import { cn } from '@lib/cn';
import { formatMoney } from '@utils/format/money';

const SLIDE = 'relative w-[88%] flex-none snap-start lg:w-full';
const FACE = 'flex aspect-[1.586] flex-col justify-between rounded-20 p-5';
const MASK = '₹ ••••••';

interface WalletCarouselProps {
  accounts: BankAccount[];
  selectedId: string | undefined;
  hideBalance: boolean;
  onSelect: (id: string) => void;
  onToggleHideBalance: () => void;
  onAdd: () => void;
}

// One card per account; the card scrolled into view is the account the chart and Recent show.
export const WalletCarousel = ({
  accounts,
  selectedId,
  hideBalance,
  onSelect,
  onToggleHideBalance,
  onAdd,
}: WalletCarouselProps) => {
  const scroller = useRef<HTMLUListElement>(null);
  const settle = useRef<number | undefined>(undefined);

  // callbacks
  const slideOf = (id: string) =>
    scroller.current?.querySelector<HTMLElement>(`[data-account="${id}"]`);

  const show = (id: string) => {
    onSelect(id);
    const slide = slideOf(id);
    scroller.current?.scrollTo({ left: slide?.offsetLeft ?? 0, behavior: 'smooth' });
  };

  // Picks the card the scroll settled on, so a swipe past three cards fetches one statement.
  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const list = scroller.current;
      if (!list) return;
      const slides = [...list.querySelectorAll<HTMLElement>('[data-account]')];
      const nearest = slides.reduce<HTMLElement | undefined>(
        (best, slide) =>
          !best ||
          Math.abs(slide.offsetLeft - list.scrollLeft) < Math.abs(best.offsetLeft - list.scrollLeft)
            ? slide
            : best,
        undefined,
      );
      if (nearest?.dataset.account) onSelect(nearest.dataset.account);
    }, 120);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = accounts.findIndex((account) => account.id === selectedId);
    const next = accounts[Math.min(accounts.length - 1, Math.max(0, index + step))];
    if (!next) return;
    show(next.id);
    slideOf(next.id)?.querySelector('button')?.focus({ preventScroll: true });
  };

  return (
    <div>
      <ul
        ref={scroller}
        aria-label="Accounts"
        onScroll={onScroll}
        className="relative -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none]"
      >
        {accounts.map((account) => {
          const closed = account.isActive === false;
          return (
            <li key={account.id} data-account={account.id} className={SLIDE}>
              <div
                className={cn(
                  FACE,
                  'bg-linear-135 from-primary to-primary-hover text-primary-fg shadow-raise',
                  closed && 'opacity-70',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <Landmark aria-hidden="true" className="size-7 opacity-80" strokeWidth={1.6} />
                  <p className="min-w-0 truncate text-right text-13 font-semibold">
                    {account.name}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-0.5 text-xs text-primary-fg/75">
                    Balance
                    <IconButton
                      aria-label="Hide balances"
                      aria-pressed={hideBalance}
                      onClick={onToggleHideBalance}
                      className="relative z-10 -my-3 text-primary-fg/75 hover:bg-primary-fg/10 hover:text-primary-fg aria-pressed:bg-transparent"
                    >
                      {hideBalance ? (
                        <EyeOff aria-hidden="true" className="size-4" strokeWidth={1.9} />
                      ) : (
                        <Eye aria-hidden="true" className="size-4" strokeWidth={1.9} />
                      )}
                    </IconButton>
                  </p>
                  <p className="mt-0.5 truncate text-[28px] leading-tight font-semibold tracking-[-0.02em]">
                    {hideBalance ? MASK : formatMoney(account.balance)}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-3 text-xs text-primary-fg/75">
                  {hideBalance ? (
                    <span />
                  ) : (
                    <dl className="flex flex-wrap gap-x-3">
                      <div className="flex gap-1">
                        <dt>In</dt>
                        <dd className="font-semibold text-primary-fg">
                          {formatMoney(account.moneyIn)}
                        </dd>
                      </div>
                      <div className="flex gap-1">
                        <dt>Out</dt>
                        <dd className="font-semibold text-primary-fg">
                          {formatMoney(account.moneyOut)}
                        </dd>
                      </div>
                    </dl>
                  )}
                  {closed && (
                    <span className="rounded-7 bg-primary-fg/15 px-2 py-1 text-11 leading-none font-semibold text-primary-fg">
                      Closed
                    </span>
                  )}
                </div>
              </div>
              {/* The whole card selects; the eye above stays its own button. */}
              <button
                type="button"
                aria-label={account.name}
                aria-pressed={account.id === selectedId}
                onClick={() => show(account.id)}
                onKeyDown={onKeyDown}
                className="absolute inset-0 rounded-20"
              />
            </li>
          );
        })}
        <li className={SLIDE}>
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              FACE,
              'w-full items-center justify-center gap-2 border-2 border-dashed border-line-field text-13 font-semibold text-fg-secondary transition-colors hover:bg-surface-hover hover:text-fg',
            )}
          >
            <Plus aria-hidden="true" className="size-5" strokeWidth={2} />
            New account
          </button>
        </li>
      </ul>

      {accounts.length > 1 && (
        <div className="mt-1 flex justify-center">
          {accounts.map((account) => {
            const active = account.id === selectedId;
            return (
              <button
                key={account.id}
                type="button"
                aria-label={`Show ${account.name}`}
                aria-current={active || undefined}
                onClick={() => show(account.id)}
                className="grid h-11 w-5 place-items-center lg:h-6"
              >
                <span
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    active ? 'w-4 bg-fg' : 'w-1.5 bg-line-field',
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const WalletCardSkeleton = () => (
  <div className={cn(FACE, 'w-[88%] border border-line bg-surface lg:w-full')}>
    <Skeleton className="size-7 rounded-8" />
    <div>
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="mt-3 h-6 w-1/2" />
    </div>
    <Skeleton className="h-2.5 w-2/5" />
  </div>
);
