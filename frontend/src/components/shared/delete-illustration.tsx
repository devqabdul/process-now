// Four-point sparkle centred on (x, y).
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

const SPARKLES: [number, number, number][] = [
  [14, 30, 3.2],
  [22, 16, 2.6],
  [30, 8, 3.2],
  [60, 7, 3.2],
  [74, 16, 2.6],
  [82, 26, 3.2],
  [18, 44, 2.4],
  [76, 40, 2.4],
];

/** The bin with its lid lifted, over a few sparkles: the header of every delete confirmation. */
export const DeleteIllustration = () => (
  <svg viewBox="0 0 96 72" className="h-18 w-24 animate-pop" aria-hidden="true">
    <g className="fill-fg-muted">
      {SPARKLES.map(([x, y, r]) => (
        <path key={`${x}-${y}`} d={sparkle(x, y, r)} />
      ))}
    </g>
    <g className="fill-danger-solid">
      {/* Lid and handle, tipped open. */}
      <g transform="rotate(-38 36 30)">
        <rect x="28" y="26" width="30" height="7" rx="2.5" />
        <rect x="37" y="20" width="12" height="7" rx="2" />
      </g>
      <path d="M58 26 L62 30 L50 30 Z" />
      <rect x="34" y="34" width="30" height="34" rx="5" />
    </g>
    <g className="stroke-surface" strokeWidth="3" strokeLinecap="round">
      <path d="M42 42v18M49 42v18M56 42v18" />
    </g>
  </svg>
);
