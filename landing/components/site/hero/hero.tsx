'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { AnimatePresence, LazyMotion, MotionConfig, m } from 'framer-motion';
import {
  createInitialState,
  demoReducer,
  fefoBatch,
  nextAutoplayAction,
  totalStock,
  type DemoAction,
  type DemoEvent,
  type DemoState,
} from '@/lib/demo-engine';
import { cn } from '@/lib/utils';
import { Strip } from './strip';
import { CompactOutputs, ReceiptTape, ReorderSlip, StoreCard } from './outputs';
import { useHasMounted, useInView, usePageVisible } from '../use-in-view';
import { usePrefersReducedMotion } from '../use-reduced-motion';

const LINES = [
  'Sell a strip at the counter.',
  'Your online store already knows.',
  'So does your reorder list.',
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

const loadFeatures = () =>
  import('../motion-features').then((mod) => mod.default);

type Pulses = { counter: number; store: number; reorder: number };

function pulsesFor(events: DemoEvent[], prev: Pulses): Pulses {
  const next = { ...prev };
  for (const e of events) {
    if (e.kind === 'sale') {
      if (e.channel === 'counter') next.counter++;
      next.store++;
      next.reorder++;
    }
    if (e.kind === 'delivery-received') {
      next.store++;
      next.reorder++;
    }
    if (e.kind === 'reorder-placed') next.reorder++;
  }
  return next;
}

function announce(events: DemoEvent[], state: DemoState): string {
  const stock = totalStock(state);
  const parts: string[] = [];
  for (const e of events) {
    if (e.kind === 'sale')
      parts.push(
        `Sold 1 ${e.channel === 'counter' ? 'at the counter' : 'online'} from batch ${e.batch}. ${stock} left.`,
      );
    if (e.kind === 'out-of-stock')
      parts.push('Out of stock. The online store hides it.');
    if (e.kind === 'reorder-suggested')
      parts.push('Reached the reorder level. Suppliers listed cheapest first.');
    if (e.kind === 'reorder-placed') parts.push('Order sent to the supplier.');
    if (e.kind === 'delivery-received')
      parts.push(`Delivery received as batch ${e.batch}. ${stock} in stock.`);
  }
  return parts.join(' ');
}

export default function Hero() {
  const reduced = usePrefersReducedMotion();
  const [state, dispatch] = useReducer(
    demoReducer,
    undefined,
    createInitialState,
  );
  const [pulses, setPulses] = useState<Pulses>({
    counter: 0,
    store: 0,
    reorder: 0,
  });
  const [auto, setAuto] = useState(true);
  const stepRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, '-10% 0px');
  const pageVisible = usePageVisible();

  const stock = totalStock(state);
  const active = fefoBatch(state.batches);
  const lastSale = state.events.find((e) => e.kind === 'sale');

  // translate each action's events into output pulses
  useEffect(() => {
    if (state.events.length) setPulses((p) => pulsesFor(state.events, p));
  }, [state.events]);

  // idle autoplay: only on screen, only in a visible tab, never with reduced
  // motion, and it stops for good the moment someone takes over
  useEffect(() => {
    if (!auto || reduced || !inView || !pageVisible) return;
    const next = nextAutoplayAction(state, stepRef.current);
    const delay =
      stepRef.current === 0 ? 1500 : next.type === 'sell' ? 1450 : 2600;
    const t = window.setTimeout(() => {
      stepRef.current += 1;
      dispatch(next);
    }, delay);
    return () => window.clearTimeout(t);
  }, [auto, reduced, inView, pageVisible, state]);

  const act = useCallback((a: DemoAction) => {
    setAuto(false);
    dispatch(a);
  }, []);

  const ticks = [pulses.counter, pulses.store, pulses.reorder];

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        <section
          aria-labelledby="hero-title"
          className="relative overflow-x-clip pt-[calc(var(--pf-header-h)+clamp(24px,4.5vh,56px))]"
        >
          <div className="pf-wrap">
            <h1
              id="hero-title"
              className="pf-display pf-h1 max-w-[16ch] lg:max-w-none"
            >
              {LINES.map((line, i) => (
                // the one page-load sequence: plain CSS, so it runs from the
                // first paint instead of waiting for hydration
                <span
                  key={line}
                  className="pf-settle relative block"
                  style={{ ['--d' as string]: `${80 + i * 120}ms` }}
                >
                  <Tick count={ticks[i]} reduced={reduced} delay={i * 0.16} />
                  {line}
                </span>
              ))}
            </h1>

            <div
              className="pf-rise mt-6 grid gap-6 md:grid-cols-12 md:items-end lg:mt-7"
              style={{ ['--d' as string]: '420ms' }}
            >
              <p className="pf-lede text-ink-soft md:col-span-7 lg:col-span-6">
                PharmaFlow is point-of-sale software for pharmacies and medical
                stores. Your counter, your own online store and your orders to
                suppliers all work from the same stock, batch by batch, earliest
                expiry first.
              </p>
              <div className="flex flex-col gap-3 md:col-span-5 md:items-end lg:col-span-6">
                <div className="flex flex-wrap gap-3">
                  <Link href="/signup" className="pf-btn">
                    Start free trial
                  </Link>
                  <a href="#how" className="pf-btn pf-btn--ghost">
                    See how it works
                  </a>
                </div>
                <p className="pf-small text-ink-soft">
                  Free plan, or 14 days free on paid plans. No card needed.
                </p>
              </div>
            </div>
          </div>

          {/* the counter top: one stock record and the three places that read it */}
          <div
            ref={stageRef}
            className="pf-rise relative mt-10 border-t border-white/70 bg-foil lg:mt-12"
            style={{
              boxShadow: 'inset 0 1px 0 rgb(14 43 34 / 0.08)',
              ['--d' as string]: '300ms',
            }}
          >
            <div className="pf-wrap relative py-7 lg:py-9">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[0.95rem] font-semibold">
                  Try it: one medicine, one stock record
                </h2>
                <p className="pf-small text-ink-soft">
                  Sample shop and suppliers, running in your browser.
                </p>
              </div>

              <Stage
                state={state}
                stock={stock}
                activeCode={active?.code}
                lastSale={
                  lastSale && lastSale.kind === 'sale' ? lastSale : undefined
                }
                pulses={pulses}
                reduced={reduced}
                auto={auto && !reduced}
                onAct={act}
              />

              <p className="sr-only" aria-live="polite">
                {announce(state.events, state)}
              </p>
            </div>
          </div>
        </section>
      </LazyMotion>
    </MotionConfig>
  );
}

function Stage({
  state,
  stock,
  activeCode,
  lastSale,
  pulses,
  reduced,
  auto,
  onAct,
}: {
  state: DemoState;
  stock: number;
  activeCode?: string;
  lastSale?: Extract<DemoEvent, { kind: 'sale' }>;
  pulses: Pulses;
  reduced: boolean;
  auto: boolean;
  onAct: (a: DemoAction) => void;
}) {
  const mounted = useHasMounted();
  const gridRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const storeRef = useRef<HTMLDivElement>(null);
  const reorderRef = useRef<HTMLDivElement>(null);
  const paths = useConnectors(gridRef, shelfRef, [
    receiptRef,
    storeRef,
    reorderRef,
  ]);
  const level = state.reorderLevel;
  const low = stock <= level;
  const scale = 20;

  return (
    <div ref={gridRef} className="relative">
      {/* connectors, desktop only */}
      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full xl:block"
        aria-hidden="true"
      >
        {paths.map((d, i) => (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke="#bcc4bf"
              strokeWidth="1.5"
              strokeDasharray="2 6"
              strokeLinecap="round"
            />
            <AnimatePresence>
              {!reduced &&
                [pulses.counter, pulses.store, pulses.reorder][i] > 0 && (
                  <m.path
                    key={[pulses.counter, pulses.store, pulses.reorder][i]}
                    d={d}
                    fill="none"
                    stroke="#0a7a4d"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, pathOffset: 0, opacity: 1 }}
                    animate={{
                      pathLength: [0, 0.35, 0],
                      pathOffset: [0, 0.3, 1],
                      opacity: [1, 1, 0],
                    }}
                    // ripple outwards in headline order: counter, store, reorder
                    transition={{
                      duration: 0.9,
                      delay: i * 0.16,
                      ease: 'easeInOut',
                    }}
                  />
                )}
            </AnimatePresence>
          </g>
        ))}
      </svg>

      <div className="relative grid gap-6 sm:grid-cols-2 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)_minmax(0,1fr)] xl:grid-rows-[auto_auto] xl:gap-x-14 xl:gap-y-8">
        {/* shelf: the record itself */}
        <div
          ref={shelfRef}
          className="rounded-[20px] bg-paper px-5 pt-5 pb-5 sm:col-span-2 lg:px-7 lg:pt-6 xl:col-span-1 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-center"
          style={{
            boxShadow:
              '0 0 0 1px rgb(14 43 34 / 0.08), 0 24px 48px -28px rgb(14 43 34 / 0.35)',
          }}
        >
          {/* stacked on phones and inside the xl centre column; side by side in between */}
          <div className="grid [grid-template-areas:'head'_'strips'_'controls'] md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-x-10 md:[grid-template-areas:'head_strips'_'controls_strips'] xl:grid-cols-1 xl:gap-x-0 xl:[grid-template-areas:'head'_'strips'_'controls']">
            <div className="[grid-area:head]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[0.82rem] font-semibold text-ink-soft">
                    {state.product.name}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <m.span
                      key={stock}
                      initial={
                        reduced || !mounted ? false : { y: -8, opacity: 0.2 }
                      }
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 28,
                      }}
                      className={cn(
                        'pf-display pf-num text-[4.2rem] leading-[0.9]',
                        low ? 'text-amber-ink' : 'text-ink',
                      )}
                    >
                      {stock}
                    </m.span>
                    <span className="text-[0.9rem] text-ink-soft">
                      in stock
                    </span>
                  </div>
                </div>
                <div className="pb-1 text-right text-[0.8rem] text-ink-soft">
                  Reorder level{' '}
                  <span className="pf-num font-semibold text-ink">{level}</span>
                </div>
              </div>

              {/* stock against the reorder level */}
              <div
                className="relative mt-3 h-2 rounded-full bg-foil"
                aria-hidden="true"
              >
                <m.div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    low ? 'bg-amber' : 'bg-cross',
                  )}
                  animate={{
                    width: `${Math.min(100, (stock / scale) * 100)}%`,
                  }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 260, damping: 30 }
                  }
                />
                <div
                  className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink"
                  style={{ left: `${(level / scale) * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 [grid-area:strips] md:mt-0 md:self-center xl:mt-6">
              <AnimatePresence initial={false} mode="popLayout">
                {state.batches.map((b) => {
                  const isActive = b.code === activeCode;
                  return (
                    <m.div
                      key={b.code}
                      layout={!reduced}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 60 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        rotate: isActive ? -1.5 : 1,
                      }}
                      exit={
                        reduced
                          ? { opacity: 0 }
                          : { opacity: 0, y: 30, rotate: 6 }
                      }
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 28,
                      }}
                    >
                      <div className="mb-1.5 h-5 text-[0.74rem] font-semibold">
                        {isActive ? (
                          <span className="text-cross">
                            Sells first, expires first
                          </span>
                        ) : b.qty === 0 ? (
                          <span className="text-ink-soft">Empty</span>
                        ) : (
                          <span className="text-ink-soft">Next batch</span>
                        )}
                      </div>
                      <Strip
                        batch={b}
                        active={isActive}
                        lastPopped={
                          lastSale?.batch === b.code ? lastSale.cavity : null
                        }
                        reduced={reduced}
                      />
                    </m.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="[grid-area:controls] md:self-end xl:self-auto">
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="pf-btn pf-btn--sm"
                  onClick={() => onAct({ type: 'sell', channel: 'counter' })}
                >
                  Sell 1 at the counter
                </button>
                <button
                  type="button"
                  className="pf-btn pf-btn--sm pf-btn--ghost bg-white"
                  onClick={() => onAct({ type: 'sell', channel: 'online' })}
                >
                  Order 1 online
                </button>
                <button
                  type="button"
                  className="ml-auto text-[0.8rem] font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                  onClick={() => onAct({ type: 'reset' })}
                >
                  Reset
                </button>
              </div>
              <p className="mt-3 min-h-5 text-[0.78rem] text-ink-soft">
                {auto
                  ? 'Playing by itself. Press any button to take over.'
                  : stock === 0
                    ? 'Sold out. The online store has hidden it until stock comes back.'
                    : 'Your turn. Every button changes the same record.'}
              </p>
            </div>
          </div>
        </div>

        <div className="sm:hidden">
          <CompactOutputs
            state={state}
            stock={stock}
            reduced={reduced}
            pulses={pulses}
            onPlace={() => onAct({ type: 'place-reorder' })}
            onReceive={() => onAct({ type: 'receive-delivery' })}
          />
        </div>
        <div
          ref={receiptRef}
          className="hidden sm:col-start-1 sm:row-span-2 sm:row-start-2 sm:block xl:row-start-1 xl:self-center"
        >
          <ReceiptTape
            state={state}
            stock={stock}
            reduced={reduced}
            pulse={pulses.counter}
          />
        </div>
        <div
          ref={storeRef}
          className="hidden sm:col-start-2 sm:row-start-2 sm:block xl:col-start-3 xl:row-start-1 xl:self-end"
        >
          <StoreCard
            state={state}
            stock={stock}
            reduced={reduced}
            pulse={pulses.store}
          />
        </div>
        <div
          ref={reorderRef}
          className="hidden sm:col-start-2 sm:row-start-3 sm:block xl:col-start-3 xl:row-start-2 xl:self-start"
        >
          <ReorderSlip
            state={state}
            stock={stock}
            reduced={reduced}
            pulse={pulses.reorder}
            onPlace={() => onAct({ type: 'place-reorder' })}
            onReceive={() => onAct({ type: 'receive-delivery' })}
          />
        </div>
      </div>
    </div>
  );
}

/** Curved connectors from the shelf to each output, recomputed on resize. */
function useConnectors(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fromRef: React.RefObject<HTMLDivElement | null>,
  toRefs: React.RefObject<HTMLDivElement | null>[],
): string[] {
  const [paths, setPaths] = useState<string[]>([]);
  const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;

  useIso(() => {
    const container = containerRef.current;
    const from = fromRef.current;
    if (!container || !from || typeof ResizeObserver === 'undefined') return;

    const compute = () => {
      const c = container.getBoundingClientRect();
      const f = from.getBoundingClientRect();
      const next = toRefs.map((r) => {
        const el = r.current;
        if (!el) return '';
        const t = el.getBoundingClientRect();
        const toLeft = t.left > f.right;
        const x1 = (toLeft ? f.right : f.left) - c.left;
        const y1 = f.top + f.height / 2 - c.top;
        const x2 = (toLeft ? t.left : t.right) - c.left;
        const y2 = t.top + t.height / 2 - c.top;
        const dx = (x2 - x1) * 0.55;
        return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
      });
      setPaths(next);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    toRefs.forEach((r) => r.current && ro.observe(r.current));
    return () => ro.disconnect();
  }, []);

  return paths;
}

/** A pharmacist's tick in the margin, drawn when that line comes true. */
function Tick({
  count,
  reduced,
  delay,
}: {
  count: number;
  reduced: boolean;
  /** lines tick top to bottom, like checking items off a prescription */
  delay: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="absolute top-[0.2em] -left-[0.5em] hidden w-[0.36em] xl:block"
    >
      <AnimatePresence>
        {count > 0 && (
          <m.path
            key={count}
            d="M3 13.5 L9.2 19 L21 4.5"
            fill="none"
            stroke="#0a7a4d"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={
              reduced
                ? { pathLength: 1, opacity: 0 }
                : { pathLength: 0, opacity: 1 }
            }
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={{
              duration: reduced ? 0.2 : 0.45,
              delay: reduced ? 0 : delay,
              ease: EASE,
            }}
          />
        )}
      </AnimatePresence>
    </svg>
  );
}
