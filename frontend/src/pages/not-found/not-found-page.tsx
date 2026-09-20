import { Link } from 'react-router';

import { buttonClasses } from '@components/ui/button';
import { cn } from '@lib/cn';

export const NotFoundPage = () => (
  <main className="grid min-h-dvh place-items-center bg-canvas p-6">
    <title>Page not found · ProcessNow</title>
    <div className="w-full max-w-[420px] rounded-16 border border-line bg-surface p-7 shadow-card">
      <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-fg-subtle uppercase">404</p>
      <h1 className="mb-2 text-xl font-semibold tracking-[-0.02em]">This page doesn’t exist yet</h1>
      <p className="mb-5 text-[13.5px] leading-relaxed text-fg-muted">
        The link may be wrong, or this part of ProcessNow hasn’t been built yet.
      </p>
      <Link
        to="/login"
        className={cn(buttonClasses('primary', 'md'), 'hover:text-primary-fg hover:no-underline')}
      >
        Go to sign in
      </Link>
    </div>
  </main>
);
