import { ProcessMark } from './process-mark';

interface AppSplashProps {
  message?: string;
}

// First paint, before any chrome exists. In-app page loads use LoadingMark inside the layout.
export const AppSplash = ({ message = 'Loading your workspace…' }: AppSplashProps) => (
  <div className="grid min-h-dvh place-items-center bg-surface px-6">
    <div className="flex animate-fade-in flex-col items-center gap-4.5">
      <span className="grid size-13 animate-mark-spin place-items-center rounded-16 bg-brand-bg text-brand-fg">
        <ProcessMark className="size-[74%]" />
      </span>
      <span className="font-mono text-[13px] font-semibold tracking-[0.12em]">PROCESSNOW</span>
      <div className="flex items-center gap-2.5">
        <span className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-fg" />
        <span className="text-[12.5px] text-fg-subtle">{message}</span>
      </div>
    </div>
  </div>
);
