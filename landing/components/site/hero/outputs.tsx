'use client';

import { m, AnimatePresence } from 'framer-motion';
import { CheckIcon, TruckIcon } from '../icons';
import {
  cheapestSupplier,
  type DemoState,
  type SaleLine,
} from '@/lib/demo-engine';
import { cn } from '@/lib/utils';
import { useHasMounted } from '../use-in-view';

const rs = (n: number) =>
  `Rs ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const spring = { type: 'spring', stiffness: 380, damping: 30 } as const;

type OutputProps = {
  state: DemoState;
  stock: number;
  reduced: boolean;
  /** increments when this output was touched by the latest action */
  pulse: number;
};

function Tag({
  children,
  tone = 'ink',
}: {
  children: React.ReactNode;
  tone?: 'ink' | 'amber' | 'cross';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-semibold leading-4',
        tone === 'ink' && 'bg-foil text-ink-soft',
        tone === 'amber' && 'bg-amber-tint text-amber-ink',
        tone === 'cross' && 'bg-cross-tint text-cross-deep',
      )}
    >
      {children}
    </span>
  );
}

/** Thermal receipt at the counter. Prints the batch FEFO picked. */
export function ReceiptTape({ state, reduced, pulse }: OutputProps) {
  const lines = state.sales.filter((l) => l.channel === 'counter').slice(0, 3);
  const total = lines.reduce((s, l) => s + l.price, 0);
  return (
    <figure className="relative" aria-label="Counter receipt">
      <figcaption className="mb-2 flex items-center justify-between text-[0.8rem] font-semibold text-ink-soft">
        <span>At the counter</span>
        <PulseDot pulse={pulse} reduced={reduced} />
      </figcaption>
      <div className="pf-paper-edge pf-shadow-paper bg-paper-bright px-4 pt-4 pb-7 text-ink">
        <div className="text-center">
          <div
            className="text-[0.85rem] font-bold"
            style={{ fontStretch: '85%' }}
          >
            Noor Pharmacy
          </div>
          <div
            className="pf-dot text-[0.7rem] text-ink-soft"
            style={{ fontFamily: 'var(--font-doto)' }}
          >
            COUNTER 1
          </div>
        </div>
        <div className="my-3 border-t border-dashed border-foil-deep" />
        <ul className="min-h-[9.5rem] space-y-2.5" aria-live="off">
          <AnimatePresence initial={false}>
            {lines.length === 0 && (
              <m.li
                key="empty"
                className="pt-6 text-center text-[0.8rem] text-ink-soft"
                exit={{ opacity: 0 }}
              >
                Waiting for the first sale
              </m.li>
            )}
            {lines.map((l: SaleLine) => (
              <m.li
                key={l.id}
                layout={!reduced}
                initial={
                  reduced
                    ? { opacity: 0 }
                    : { opacity: 0, y: -10, clipPath: 'inset(0 0 100% 0)' }
                }
                animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="text-[0.8rem] leading-tight"
              >
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{state.product.name}</span>
                  <span className="pf-num">{l.price.toFixed(2)}</span>
                </div>
                <div
                  className="pf-dot mt-0.5 text-[0.7rem] text-ink-soft"
                  style={{ fontFamily: 'var(--font-doto)' }}
                >
                  1 x BATCH {l.batch}
                </div>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
        <div className="my-3 border-t border-dashed border-foil-deep" />
        <div className="flex justify-between text-[0.85rem] font-bold">
          <span>Total</span>
          <span className="pf-num">{rs(total)}</span>
        </div>
      </div>
    </figure>
  );
}

/** The pharmacy's own online store. White-label, so it wears the shop's colour. */
export function StoreCard({ state, stock, reduced, pulse }: OutputProps) {
  const mounted = useHasMounted();
  const lastOnline = state.sales.find((l) => l.channel === 'online');
  const status =
    stock === 0
      ? { text: 'Out of stock, hidden from the store', tone: 'amber' as const }
      : stock <= 3
        ? { text: `Only ${stock} left`, tone: 'amber' as const }
        : { text: `${stock} in stock`, tone: 'cross' as const };

  return (
    <figure aria-label="Online store listing">
      <figcaption className="mb-2 flex items-center justify-between text-[0.8rem] font-semibold text-ink-soft">
        <span>On your online store</span>
        <PulseDot pulse={pulse} reduced={reduced} />
      </figcaption>
      <div className="pf-shadow-ui overflow-hidden rounded-[18px] bg-white">
        <div className="flex items-center justify-between bg-[#23507a] px-3.5 py-2.5 text-white">
          <span
            className="text-[0.82rem] font-bold"
            style={{ fontStretch: '85%' }}
          >
            Noor Pharmacy
          </span>
          <span className="text-[0.7rem] opacity-80">noor-pharmacy</span>
        </div>
        <div className="flex items-center gap-3 px-3.5 py-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef3f8]">
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
              <rect x="3" y="7" width="18" height="10" rx="5" fill="#23507a" />
              <rect x="12" y="7" width="9" height="10" rx="5" fill="#9fc1de" />
              <rect x="11" y="7" width="2" height="10" fill="#9fc1de" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.86rem] font-semibold">
              {state.product.name}
            </div>
            <div className="text-[0.8rem] text-ink-soft">
              Strip of 10, Rs {state.product.price}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-foil px-3.5 py-2.5">
          <m.span
            key={status.text}
            initial={reduced || !mounted ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="pf-num"
          >
            <Tag tone={status.tone}>{status.text}</Tag>
          </m.span>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-[0.74rem] font-semibold',
              stock === 0 ? 'bg-foil text-ink-soft' : 'bg-[#23507a] text-white',
            )}
          >
            Add to cart
          </span>
        </div>
      </div>
      <div className="mt-2 h-6" aria-hidden="true">
        <AnimatePresence mode="wait">
          {lastOnline && (
            <m.div
              key={lastOnline.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="flex items-center gap-1.5 text-[0.78rem] text-ink-soft"
            >
              <CheckIcon className="size-3.5 text-cross" strokeWidth={3} />
              Order #{1040 + lastOnline.id} placed, cash on delivery
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </figure>
  );
}

/** Reorder list: wakes up at the reorder level, cheapest connected supplier first. */
export function ReorderSlip({
  state,
  stock,
  reduced,
  pulse,
  onPlace,
  onReceive,
}: OutputProps & { onPlace: () => void; onReceive: () => void }) {
  const best = cheapestSupplier(state.suppliers);
  const ranked = [...state.suppliers].sort((a, b) => a.unitPrice - b.unitPrice);

  return (
    <figure aria-label="Reorder list">
      <figcaption className="mb-2 flex items-center justify-between text-[0.8rem] font-semibold text-ink-soft">
        <span>On your reorder list</span>
        <PulseDot pulse={pulse} reduced={reduced} />
      </figcaption>
      <div
        className={cn(
          'pf-shadow-paper relative min-h-[12.25rem] rounded-[4px] px-4 py-3.5 transition-colors duration-300',
          state.reorder === 'idle' ? 'bg-paper-bright' : 'bg-[#fff8e8]',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {state.reorder === 'idle' && (
            <m.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[0.82rem]"
            >
              <div className="font-semibold">{state.product.name}</div>
              <p className="mt-1 text-ink-soft">
                <span className="pf-num">{stock}</span> in stock. It joins this
                list at <span className="pf-num">{state.reorderLevel}</span>.
              </p>
              <p className="mt-6 text-[0.78rem] text-ink-soft">
                Nothing to order yet.
              </p>
            </m.div>
          )}

          {state.reorder === 'suggested' && best && (
            <m.div
              key="suggested"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="text-[0.8rem]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{state.product.name}</span>
                <Tag tone="amber">At reorder level</Tag>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {ranked.map((s) => (
                  <li
                    key={s.name}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md px-2 py-1',
                      s.name === best.name
                        ? 'bg-white ring-1 ring-amber/60'
                        : 'text-ink-soft',
                    )}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="pf-num shrink-0">
                      Rs {s.unitPrice.toFixed(2)}
                      <span className="ml-2 text-[0.72rem] text-ink-soft">
                        {Math.round(s.fillRate * 100)}% filled
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onPlace}
                className="pf-btn pf-btn--sm mt-3 w-full"
              >
                Order {state.reorderQty} from {best.name.split(' ')[0]}
              </button>
            </m.div>
          )}

          {state.reorder === 'ordered' && best && (
            <m.div
              key="ordered"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="text-[0.82rem]"
            >
              <div className="flex items-center gap-2 font-semibold">
                <TruckIcon className="size-4 text-amber-ink" />
                Ordered {state.reorderQty} from {best.name}
              </div>
              <p className="mt-1 text-ink-soft">
                It&apos;s in their incoming-order queue. Stock goes up when you
                mark it received.
              </p>
              <button
                type="button"
                onClick={onReceive}
                className="pf-btn pf-btn--sm pf-btn--ghost mt-5 w-full bg-white"
              >
                Mark delivery received
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </figure>
  );
}

/** A small dot that blinks green when this output was just updated. */
function PulseDot({ pulse, reduced }: { pulse: number; reduced: boolean }) {
  return (
    <span className="relative inline-flex size-2.5" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-foil-deep" />
      <AnimatePresence>
        {pulse > 0 && (
          <m.span
            key={pulse}
            className="absolute inset-0 rounded-full bg-cross"
            initial={{ opacity: 1, scale: reduced ? 1 : 0.6 }}
            animate={{ opacity: 0, scale: reduced ? 1 : 2.4 }}
            transition={{
              duration: reduced ? 0.8 : 0.9,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * Phones get the same three places as one compact list: the idea (one sale,
 * three updates) without three full objects stacked down the screen.
 */
export function CompactOutputs({
  state,
  stock,
  reduced,
  pulses,
  onPlace,
  onReceive,
}: {
  state: DemoState;
  stock: number;
  reduced: boolean;
  pulses: { counter: number; store: number; reorder: number };
  onPlace: () => void;
  onReceive: () => void;
}) {
  const last = state.sales.find((l) => l.channel === 'counter');
  const best = cheapestSupplier(state.suppliers);
  const row = 'flex items-start gap-3 px-4 py-3.5';
  const head =
    'flex items-center justify-between gap-2 text-[0.8rem] font-semibold text-ink-soft';

  return (
    <ul
      className="pf-shadow-paper divide-y divide-foil overflow-hidden rounded-[16px] bg-paper-bright text-[0.9rem]"
      aria-label="Where the sale shows up"
    >
      <li className={row}>
        <div className="min-w-0 flex-1">
          <div className={head}>
            At the counter <PulseDot pulse={pulses.counter} reduced={reduced} />
          </div>
          <div className="mt-1">
            {last ? (
              <>
                Receipt: 1 × {state.product.name},{' '}
                <span className="whitespace-nowrap">batch {last.batch}</span>
              </>
            ) : (
              <span className="text-ink-soft">Waiting for the first sale</span>
            )}
          </div>
        </div>
      </li>
      <li className={row}>
        <div className="min-w-0 flex-1">
          <div className={head}>
            On your online store{' '}
            <PulseDot pulse={pulses.store} reduced={reduced} />
          </div>
          <div className="mt-1 pf-num">
            {stock === 0
              ? 'Out of stock, hidden from the store'
              : `${stock} in stock, Rs ${state.product.price} a strip`}
          </div>
        </div>
      </li>
      <li className={cn(row, state.reorder !== 'idle' && 'bg-[#fff8e8]')}>
        <div className="min-w-0 flex-1">
          <div className={head}>
            On your reorder list{' '}
            <PulseDot pulse={pulses.reorder} reduced={reduced} />
          </div>
          {state.reorder === 'idle' && (
            <div className="mt-1 pf-num text-ink-soft">
              Joins the list at {state.reorderLevel}. Nothing to order yet.
            </div>
          )}
          {state.reorder === 'suggested' && best && (
            <>
              <div className="mt-1">
                At reorder level. Cheapest: {best.name}, Rs{' '}
                {best.unitPrice.toFixed(2)}
              </div>
              <button
                type="button"
                onClick={onPlace}
                className="pf-btn pf-btn--sm mt-3 w-full"
              >
                Order {state.reorderQty} from {best.name.split(' ')[0]}
              </button>
            </>
          )}
          {state.reorder === 'ordered' && best && (
            <>
              <div className="mt-1">
                Ordered {state.reorderQty} from {best.name}.
              </div>
              <button
                type="button"
                onClick={onReceive}
                className="pf-btn pf-btn--sm pf-btn--ghost mt-3 w-full bg-white"
              >
                Mark delivery received
              </button>
            </>
          )}
        </div>
      </li>
    </ul>
  );
}
