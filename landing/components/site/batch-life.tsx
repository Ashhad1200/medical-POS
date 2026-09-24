'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHasMounted } from './use-in-view';
import { usePrefersReducedMotion } from './use-reduced-motion';

const loadFeatures = () =>
  import('./motion-features').then((mod) => mod.default);

type Step = {
  title: string;
  body: string;
  entry: string;
  delta: number;
  qty: number;
  tone?: 'amber';
};

// One batch, start to finish. Every line here is something the product does today.
const STEPS: Step[] = [
  {
    title: 'It arrives',
    body: 'Your supplier delivers. Mark the purchase order received, all of it or only what turned up, and the batch goes into stock with its number, expiry date and cost.',
    entry: 'Received from Indus Medical Supply',
    delta: 20,
    qty: 20,
  },
  {
    title: 'It sells at the counter',
    body: 'Type the first letters of the name. PharmaFlow picks the batch that expires first, takes cash, card, bank transfer or credit, and prints a receipt with the batch on it.',
    entry: 'Counter sale, receipt 2231',
    delta: -2,
    qty: 18,
  },
  {
    title: 'It sells on your online store',
    body: 'The same stock, at the same price, is on your own online store. A customer orders, and the count drops before anyone at the counter can sell the last strip twice.',
    entry: 'Online order 1043, cash on delivery',
    delta: -1,
    qty: 17,
  },
  {
    title: 'It runs low',
    body: 'At the reorder level it joins your reorder list, with every connected supplier’s price side by side, cheapest first, and how reliably each one has delivered.',
    entry: 'Three weeks of sales, reorder level reached',
    delta: -11,
    qty: 6,
    tone: 'amber',
  },
  {
    title: 'It gets close to expiry',
    body: 'Within 60 days of expiry it appears in your return suggestions, grouped by supplier, so it goes back for credit instead of into the bin.',
    entry: 'Returned 4 to supplier, credit noted',
    delta: -4,
    qty: 2,
  },
];

export default function BatchLife() {
  const reduced = usePrefersReducedMotion();
  const mounted = useHasMounted();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    // a step becomes active as it crosses the middle band of the viewport
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting)
            setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const shown = STEPS.slice(0, active + 1);
  const current = STEPS[active];

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        <section id="how" aria-labelledby="how-title" className="bg-paper">
          <div className="pf-wrap grid gap-10 py-24 lg:grid-cols-12 lg:gap-6 lg:py-36">
            <div className="lg:col-span-5">
              <h2 id="how-title" className="pf-display pf-h2">
                Follow one batch from the delivery van to the last strip.
              </h2>
              <p className="pf-body mt-5 text-ink-soft">
                Every movement writes to the same record, so the counter, the
                online store and the reorder list never need to be told
                separately.
              </p>
              {/* the batch record, pinned while the steps scroll past */}
              <div className="sticky top-[calc(var(--pf-header-h)+40px)] mt-12 hidden lg:block">
                <div className="pf-shadow-paper rounded-[6px] bg-paper-bright">
                  <div className="flex items-start justify-between border-b border-foil px-6 pb-5 pt-6">
                    <div>
                      <div className="text-[0.85rem] font-semibold text-ink-soft">
                        Paracetamol 500 mg
                      </div>
                      <div
                        className="mt-1 flex gap-4 text-[0.95rem] text-ink"
                        style={{
                          fontFamily: 'var(--font-doto)',
                          fontWeight: 900,
                        }}
                      >
                        <span>B-2411</span>
                        <span>EXP 11/27</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <m.div
                        key={current.qty}
                        initial={
                          reduced || !mounted ? false : { y: -10, opacity: 0.2 }
                        }
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 380,
                          damping: 28,
                        }}
                        className={cn(
                          'pf-display pf-num text-[4.5rem] leading-[0.85]',
                          current.tone === 'amber'
                            ? 'text-amber-ink'
                            : 'text-ink',
                        )}
                      >
                        {current.qty}
                      </m.div>
                      <div className="mt-1 text-[0.8rem] text-ink-soft">
                        strips in this batch
                      </div>
                    </div>
                  </div>
                  <ol className="px-6 py-4" aria-label="Batch history">
                    <AnimatePresence initial={false}>
                      {shown.map((s, i) => (
                        <m.li
                          key={s.entry}
                          initial={
                            reduced ? { opacity: 0 } : { opacity: 0, x: -12 }
                          }
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 30,
                          }}
                          className={cn(
                            'grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-dashed border-foil py-3 text-[0.9rem] last:border-0',
                            i === active ? 'text-ink' : 'text-ink-soft',
                          )}
                        >
                          <span className="pf-num text-[0.8rem] text-ink-soft">
                            {i + 1}
                          </span>
                          <span>{s.entry}</span>
                          <span
                            className={cn(
                              'pf-num font-semibold',
                              s.delta > 0 ? 'text-cross' : '',
                            )}
                          >
                            {s.delta > 0
                              ? `+${s.delta}`
                              : `−${Math.abs(s.delta)}`}
                          </span>
                        </m.li>
                      ))}
                    </AnimatePresence>
                  </ol>
                </div>
                <p className="pf-small mt-4 text-ink-soft">
                  One record. Five places it was used.
                </p>
              </div>
            </div>

            <ol className="lg:col-span-6 lg:col-start-7 lg:pt-[18vh]">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  data-step={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  className={cn(
                    'border-t border-foil-deep/60 py-8 lg:flex lg:min-h-[52vh] lg:flex-col lg:justify-center lg:border-0 lg:py-0',
                  )}
                >
                  <div className="flex items-baseline gap-4">
                    <span
                      className="pf-display pf-num text-[1.1rem] text-cross"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <h3
                      className={cn(
                        'pf-h3 transition-colors duration-500',
                        i !== active && 'lg:text-ink-soft',
                      )}
                    >
                      {s.title}
                    </h3>
                  </div>
                  {/* focus by colour, not opacity: inactive steps still pass contrast */}
                  <p
                    className={cn(
                      'pf-body mt-3 pl-8 text-ink-soft transition-colors duration-500',
                      i === active && 'lg:text-ink',
                    )}
                  >
                    {s.body}
                  </p>
                  {/* on small screens the ledger line lives with its step */}
                  <div className="mt-4 ml-8 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-md bg-paper-bright px-3 py-2 text-[0.85rem] shadow-[0_0_0_1px_rgb(14_43_34/0.08)] lg:hidden">
                    <span>{s.entry}</span>
                    <span className="pf-num whitespace-nowrap font-semibold">
                      {s.delta > 0 ? `+${s.delta}` : `−${Math.abs(s.delta)}`},{' '}
                      {s.qty} left
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </LazyMotion>
    </MotionConfig>
  );
}
