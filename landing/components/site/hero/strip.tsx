'use client';

import { m, AnimatePresence } from 'framer-motion';
import type { Batch } from '@/lib/demo-engine';
import { cn } from '@/lib/utils';

const COLS = 5;
const W = 176;
const H = 104;

function cavityCenter(i: number) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return { cx: 24 + col * 32, cy: 27 + row * 34 };
}

// jagged foil where a tablet was pushed through
function tearPath(cx: number, cy: number) {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (Math.PI * 2 * k) / 10 + 0.3;
    const r = k % 2 === 0 ? 7.5 : 3.2;
    pts.push(
      `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`,
    );
  }
  return `M${pts.join('L')}Z`;
}

type Props = {
  batch: Batch;
  active: boolean;
  /** cavity index that was just pushed out, to animate */
  lastPopped: number | null;
  reduced: boolean;
};

/** One blister strip = one batch. Sealed cavities are stock, popped ones are sold. */
export function Strip({ batch, active, lastPopped, reduced }: Props) {
  const popped = batch.capacity - batch.qty;
  const gradId = `foil-${batch.code}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn(
        'block w-full h-auto overflow-visible transition-[filter] duration-300',
        !active && batch.qty === 0 && 'opacity-60',
      )}
      role="img"
      aria-label={`Batch ${batch.code}, expires ${batch.expiry}: ${batch.qty} of ${batch.capacity} left`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f3f1" />
          <stop offset="0.45" stopColor="#dde2df" />
          <stop offset="0.55" stopColor="#e9ecea" />
          <stop offset="1" stopColor="#d3d9d5" />
        </linearGradient>
        <radialGradient id="pf-bubble" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.7" stopColor="#eef2ef" stopOpacity="0.95" />
          <stop offset="1" stopColor="#d8dfdb" stopOpacity="0.95" />
        </radialGradient>
      </defs>

      <rect
        x="0.75"
        y="0.75"
        width={W - 1.5}
        height={H - 1.5}
        rx="11"
        fill={`url(#${gradId})`}
        stroke={active ? '#0a7a4d' : '#bcc4bf'}
        strokeWidth={active ? 1.75 : 1.25}
      />

      {Array.from({ length: batch.capacity }, (_, i) => {
        const { cx, cy } = cavityCenter(i);
        const isPopped = i < popped;
        const justPopped = i === lastPopped && !reduced;
        return (
          <g key={i}>
            {isPopped ? (
              <m.g
                initial={justPopped ? { scale: 1.25, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              >
                <circle cx={cx} cy={cy} r="12" fill="#cfd6d2" />
                <path d={tearPath(cx, cy)} fill="#aeb8b2" />
              </m.g>
            ) : (
              <g>
                <circle
                  cx={cx}
                  cy={cy + 1.2}
                  r="12.6"
                  fill="#0e2b22"
                  opacity="0.07"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r="12.8"
                  fill="url(#pf-bubble)"
                  stroke="#0e2b22"
                  strokeOpacity="0.22"
                />
                <circle
                  cx={cx}
                  cy={cy + 0.8}
                  r="9.6"
                  fill="#0e2b22"
                  opacity="0.08"
                />
                <circle cx={cx} cy={cy} r="9.6" fill="#fffdf8" />
                <line
                  x1={cx - 6}
                  y1={cy}
                  x2={cx + 6}
                  y2={cy}
                  stroke="#e4e2da"
                  strokeWidth="1"
                />
                <path
                  d={`M${cx - 9} ${cy - 3} A 10 10 0 0 1 ${cx - 2} ${cy - 10}`}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.95"
                />
              </g>
            )}
            {/* the tablet leaving the strip */}
            <AnimatePresence>
              {justPopped && (
                <m.circle
                  key={`fly-${batch.code}-${i}`}
                  cx={cx}
                  cy={cy}
                  r="9.6"
                  fill="#fffdf8"
                  stroke="#d9d6cc"
                  initial={{ y: 0, opacity: 1, scale: 1 }}
                  animate={{ y: -46, opacity: 0, scale: 0.7 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </AnimatePresence>
          </g>
        );
      })}

      <text
        x="12"
        y={H - 11}
        className="pf-dot"
        fontSize="11"
        fontWeight="900"
        fill="#3c4f47"
        style={{ fontFamily: 'var(--font-doto)' }}
      >
        {batch.code}
      </text>
      <text
        x={W - 12}
        y={H - 11}
        textAnchor="end"
        className="pf-dot"
        fontSize="11"
        fontWeight="900"
        fill="#3c4f47"
        style={{ fontFamily: 'var(--font-doto)' }}
      >
        EXP {batch.expiry}
      </text>
    </svg>
  );
}
