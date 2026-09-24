import { cn } from '@/lib/utils';

/**
 * The PharmaFlow mark: a pharmacy cross made of five blister cavities, one of
 * them already popped. Stock, pharmacy and movement in one glyph.
 */
export function Mark({ className }: { className?: string }) {
  const cell = (x: number, y: number, popped = false) =>
    popped ? (
      <rect
        x={x + 0.9}
        y={y + 0.9}
        width={7.2}
        height={7.2}
        rx={3}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
    ) : (
      <rect x={x} y={y} width={9} height={9} rx={3.4} fill="currentColor" />
    );
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn('size-7', className)}
    >
      {cell(11.5, 1)}
      {cell(1, 11.5)}
      {cell(11.5, 11.5)}
      {cell(22, 11.5, true)}
      {cell(11.5, 22)}
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink', className)}>
      <Mark className="text-cross" />
      <span
        className="text-[1.35rem] leading-none tracking-[-0.01em]"
        style={{ fontStretch: '78%', fontWeight: 800 }}
      >
        PharmaFlow
      </span>
    </span>
  );
}
