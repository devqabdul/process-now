import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { BrandLockup } from '@components/shared/brand-lockup';
import { cn } from '@lib/cn';

// Marketing snapshot on the brand panel — illustrative figures from the design, not live data.
const PIPELINE = [
  {
    label: 'Received',
    count: '18',
    dot: 'bg-brand-faint',
    value: 'text-brand-muted',
    pulse: false,
  },
  {
    label: 'Fusing',
    count: '42',
    dot: 'bg-warning-bright',
    value: 'text-warning-bright',
    pulse: true,
  },
  {
    label: 'Inspection',
    count: '31',
    dot: 'bg-brand-muted',
    value: 'text-brand-muted',
    pulse: false,
  },
  {
    label: 'Dispatch',
    count: '26',
    dot: 'bg-success-bright',
    value: 'text-success-bright',
    pulse: true,
  },
];

const TRUST_MARKS = ['SOC 2', 'ISO 27001', '256-bit TLS'];

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
        <p className="mb-9 max-w-[410px] text-[14.5px] leading-[1.7] text-pretty text-brand-muted">
          Vendors place orders. Operators move jobs through your workflow. Admins see all of it,
          live.
        </p>

        <div className="rounded-14 border border-white/9 bg-white/4 px-4.5 py-4.25">
          <div className="mb-3.75 flex items-center gap-2">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-success-bright" />
            <span className="font-mono text-[9.5px] tracking-[0.11em] text-brand-muted uppercase">
              Live on the floor
            </span>
            <span className="ml-auto font-mono text-[9.5px] text-brand-faint">117 jobs</span>
          </div>
          <div className="flex items-center">
            {PIPELINE.map((stage, index) => (
              <div key={stage.label} className="flex min-w-0 flex-1 items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.75 flex items-center gap-1.5">
                    <span
                      className={cn(
                        'size-2 flex-none rounded-full',
                        stage.dot,
                        stage.pulse && 'animate-pulse-dot',
                      )}
                    />
                    <span className={cn('font-mono text-[13px] font-semibold', stage.value)}>
                      {stage.count}
                    </span>
                  </div>
                  <div className="truncate pr-2 text-[9.5px] text-brand-muted">{stage.label}</div>
                </div>
                {index < PIPELINE.length - 1 && (
                  <ChevronRight
                    className="mr-2 size-3 flex-none text-brand-line"
                    strokeWidth={2.4}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-3.25 font-mono text-[10px] text-brand-faint">
        <span>© 2026 ProcessNow</span>
        {TRUST_MARKS.map((mark) => (
          <span key={mark} className="flex items-center gap-3.25">
            <span className="h-2.5 w-px bg-brand-line" />
            {mark}
          </span>
        ))}
      </div>
    </aside>

    <main className="relative flex min-w-0 flex-1 flex-col items-center justify-center bg-surface px-5.5 py-7 min-[1041px]:px-10 min-[1041px]:py-11">
      <div className="absolute top-6.5 right-8 flex items-center gap-4">
        <span className="text-[12.5px] text-fg-subtle">Need help?</span>
        <a href="mailto:support@processnow.io" className="text-[12.5px] font-semibold">
          Contact support
        </a>
      </div>

      <BrandLockup className="mb-8.5 w-full max-w-[372px] min-[1041px]:hidden" />
      <div className="w-full max-w-[372px]">{children}</div>
    </main>
  </div>
);
