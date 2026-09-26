import { ClipboardList, NotebookPen, ReceiptText } from 'lucide-react';
import type { ReactNode } from 'react';

import { ResetAppButton } from '@components/shared/reset-app-button';
import { BrandLockup } from '@components/shared/brand-lockup';

// What the product does today — no figures, so nothing here can go stale or mislead.
const FEATURES = [
  { icon: ClipboardList, text: 'Log every lot a vendor drops off, and what goes back.' },
  { icon: ReceiptText, text: 'Bill on return at the price agreed, and track what is paid.' },
  { icon: NotebookPen, text: "See the day's earnings, costs and machine hours at a glance." },
];

interface AuthLayoutProps {
  children: ReactNode;
}

// Split screen: dark brand panel (desktop only) + auth pane. Below 1040px the panel
// collapses into a small lockup above the form.
export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="flex min-h-dvh bg-surface text-fg">
    <aside
      aria-hidden="true"
      className="relative hidden w-[47%] min-w-[460px] flex-col justify-between overflow-hidden bg-brand-bg px-14 py-13 text-brand-fg min-[1041px]:flex"
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[64px_64px] opacity-45" />
      <div className="absolute -top-55 -right-57.5 size-150 animate-drift rounded-full bg-[radial-gradient(circle,rgba(245,144,82,0.17)_0%,rgba(245,144,82,0)_68%)]" />
      <div className="absolute -bottom-47.5 -left-50 size-130 animate-drift rounded-full bg-[radial-gradient(circle,rgba(23,117,108,0.22)_0%,rgba(23,117,108,0)_68%)] [animation-direction:reverse] [animation-duration:18s]" />

      <BrandLockup tone="inverse" size="md" className="relative" />

      <div className="relative max-w-[470px]">
        <h2 className="mb-4.5 text-[40px] leading-[1.14] font-semibold tracking-[-0.03em] text-pretty">
          Every order, job and payment in one place.
        </h2>
        <p className="mb-9 max-w-[410px] text-sm leading-[1.7] text-pretty text-brand-muted">
          Orders, bills and daily production for job-work shops — one sign-in for the whole
          business.
        </p>

        <ul className="space-y-3.5">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-brand-fg">
              <span className="grid size-8 flex-none place-items-center rounded-10 border border-white/9 bg-white/4">
                <Icon className="size-4 text-brand-muted" strokeWidth={2} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative font-mono text-11 text-brand-faint">© 2026 ProcessNow</p>
    </aside>

    <main className="relative flex min-w-0 flex-1 flex-col items-center justify-center bg-surface px-5.5 py-7 min-[1041px]:px-10 min-[1041px]:py-11">
      <div className="absolute top-6.5 right-8 flex items-center gap-4">
        <span className="text-13 text-fg-subtle">Need help?</span>
        <a href="mailto:support@processnow.io" className="text-13 font-semibold">
          Contact support
        </a>
      </div>

      <BrandLockup className="mb-8.5 w-full max-w-[372px] min-[1041px]:hidden" />
      <div className="w-full max-w-[372px]">{children}</div>
      <p className="mt-8 flex items-center gap-1 text-13 text-fg-subtle">
        App not loading right?
        <ResetAppButton className="-ml-1" />
      </p>
    </main>
  </div>
);
