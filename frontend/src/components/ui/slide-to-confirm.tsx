import { ArrowRight } from 'lucide-react';
import { useRef, useState } from 'react';

import { Spinner } from '@components/ui/spinner';

// Short of the end still counts: a drag that stops a pixel early is a yes, not a miss.
const THRESHOLD = 96;

// The knob's diameter and the gap it keeps from the pill's edge (size-12 inside h-14),
// needed to turn a percentage into a left offset that never breaks the rounded edge.
const KNOB = 48;
const INSET = 4;
const TRAVEL = `100% - ${KNOB + INSET * 2}px`;

interface SlideToConfirmProps {
  label: string;
  hint?: string;
  busyLabel: string;
  busy?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}

/**
 * A native range input wearing a pill: dragging, touch and the slider role come from the
 * platform, so a keyboard reaches it too — arrows nudge it, End confirms in one press.
 * Released short of the end, the knob springs back and nothing happens.
 */
export const SlideToConfirm = ({
  label,
  hint = 'Slide to confirm',
  busyLabel,
  busy = false,
  disabled = false,
  onConfirm,
}: SlideToConfirmProps) => {
  const [value, setValue] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const locked = busy || disabled;

  // callbacks
  const commit = () => {
    if (value >= THRESHOLD) onConfirm();
    else setValue(0);
  };

  /*
   * A range input jumps to wherever it is clicked, which would turn this into a one-tap
   * destructive button. Only a press that lands on the knob is allowed to start a drag.
   */
  const onPointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return;
    const knobCentre =
      rect.left + INSET + KNOB / 2 + (value / 100) * (rect.width - KNOB - INSET * 2);
    if (Math.abs(event.clientX - knobCentre) > KNOB / 2) event.preventDefault();
  };

  return (
    <div
      ref={track}
      className="relative h-14 rounded-full bg-danger-solid shadow-button select-none"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 flex flex-col items-center justify-center text-center"
        style={{ left: KNOB + INSET }}
      >
        {busy ? (
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <Spinner className="size-4" /> {busyLabel}
          </span>
        ) : (
          <>
            <span className="px-3 text-sm leading-tight font-semibold text-white">{label}</span>
            <span className="px-3 text-xs leading-tight text-white/85">{hint}</span>
          </>
        )}
      </span>

      {/* The knob the input drags; the input itself is transparent and sits on top. */}
      <span
        aria-hidden="true"
        style={{ left: `calc(${INSET}px + ${value / 100} * (${TRAVEL}))` }}
        className="pointer-events-none absolute top-1 grid size-12 place-items-center rounded-full bg-surface text-danger-solid shadow-card transition-[left] duration-150"
      >
        <ArrowRight className="size-5" strokeWidth={2.2} />
      </span>

      <input
        type="range"
        min={0}
        max={100}
        step={2}
        value={value}
        aria-label={`${label} — ${hint}`}
        disabled={locked}
        onChange={(event) => setValue(Number(event.target.value))}
        onPointerDown={onPointerDown}
        // A released drag decides; a key press only ever confirms, so arrowing part way
        // and stopping doesn't throw the progress away.
        onPointerUp={commit}
        onKeyUp={() => value >= THRESHOLD && onConfirm()}
        onBlur={() => setValue(0)}
        className="absolute inset-0 size-full cursor-grab appearance-none bg-transparent opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed active:cursor-grabbing"
      />
    </div>
  );
};
