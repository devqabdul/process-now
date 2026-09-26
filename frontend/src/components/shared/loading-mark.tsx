import { ProcessMark } from './process-mark';

interface LoadingMarkProps {
  // The screen being fetched, e.g. "Orders" → "Opening Orders…"
  screen?: string | undefined;
  message?: string;
}

/*
 * The wait state for a page whose chunk is still downloading: the mark turns, the message says
 * what for. Used inside a layout, so the chrome around it stays put.
 */
export const LoadingMark = ({ screen, message }: LoadingMarkProps) => {
  const label = message ?? (screen ? `Opening ${screen}…` : 'Loading…');

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 animate-fade-in flex-col items-center justify-center gap-4 py-16"
    >
      <span className="grid size-13 animate-mark-spin place-items-center rounded-16 bg-brand-bg text-brand-fg">
        <ProcessMark className="size-[74%]" />
      </span>
      <span className="flex items-center gap-2.5">
        <span className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-fg" />
        <span className="text-13 text-fg-subtle">{label}</span>
      </span>
    </div>
  );
};
