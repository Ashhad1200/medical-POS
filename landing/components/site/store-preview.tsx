'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const SWATCHES = [
  { name: 'Navy', value: '#23507a' },
  { name: 'Teal', value: '#0f6b6b' },
  { name: 'Plum', value: '#6b2f5b' },
  { name: 'Brick', value: '#9a3b26' },
  { name: 'Forest', value: '#2f5d31' },
];

const PRODUCTS = [
  { name: 'Paracetamol 500 mg', unit: 'Strip of 10', price: 42 },
  { name: 'ORS sachets', unit: 'Pack of 5', price: 90 },
  { name: 'Vitamin C 500 mg', unit: 'Bottle of 30', price: 480, deal: true },
  { name: 'Digital thermometer', unit: '1 piece', price: 650 },
];

/** A pharmacy's own store. Pick a colour to see it change, like the owner would. */
export default function StorePreview() {
  const [accent, setAccent] = useState(SWATCHES[0]);

  return (
    <div className="relative">
      <div
        className="pf-shadow-ui mx-auto w-full max-w-[340px] overflow-hidden rounded-[34px] border-[7px] border-ink bg-white"
        style={{ ['--acc' as string]: accent.value }}
      >
        <div className="flex h-6 items-center justify-center bg-white">
          <span className="h-1.5 w-16 rounded-full bg-ink/15" />
        </div>
        <div className="px-4 pb-3 pt-1">
          <div className="flex items-center justify-between">
            <span
              className="text-[1rem] font-bold text-[var(--acc)] transition-colors duration-300"
              style={{ fontStretch: '85%' }}
            >
              Noor Pharmacy
            </span>
            <span className="rounded-full bg-[var(--acc)] px-2.5 py-1 text-[0.7rem] font-semibold text-white transition-colors duration-300">
              Cart 2
            </span>
          </div>
          <div className="mt-3 rounded-2xl bg-[var(--acc)] p-4 text-white transition-colors duration-300">
            <div className="text-[0.7rem] opacity-80">This week</div>
            <div
              className="mt-0.5 text-[1.15rem] font-bold leading-tight"
              style={{ fontStretch: '82%' }}
            >
              Winter care: 10% off vitamins
            </div>
            <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[0.72rem] font-semibold text-[var(--acc)]">
              Shop the deal
            </div>
          </div>
          <div className="mt-3 flex gap-1.5 overflow-hidden text-[0.72rem] font-semibold">
            {['Pain relief', 'Cold & flu', 'Vitamins', 'Baby care'].map(
              (c, i) => (
                <span
                  key={c}
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1',
                    i === 0
                      ? 'bg-[var(--acc)] text-white'
                      : 'bg-foil text-ink-soft',
                  )}
                >
                  {c}
                </span>
              ),
            )}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {PRODUCTS.map((p) => (
              <li key={p.name} className="rounded-xl border border-foil p-2.5">
                <div className="mb-2 grid h-12 place-items-center rounded-lg bg-paper">
                  <span className="h-3 w-7 rounded-full bg-[var(--acc)] opacity-70 transition-colors duration-300" />
                </div>
                <div className="truncate text-[0.72rem] font-semibold">
                  {p.name}
                </div>
                <div className="text-[0.66rem] text-ink-soft">{p.unit}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="pf-num text-[0.74rem] font-bold">
                    Rs {p.price}
                  </span>
                  {p.deal && (
                    <span className="rounded bg-amber-tint px-1 text-[0.6rem] font-bold text-amber-ink">
                      −10%
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <fieldset className="mt-6 flex flex-col items-center gap-3">
        <legend className="mb-3 w-full text-center text-[0.85rem] font-semibold text-ink-soft">
          Try a colour. Every pharmacy’s store wears its own.
        </legend>
        <div className="flex gap-2.5">
          {SWATCHES.map((s) => (
            <label key={s.value} className="relative cursor-pointer">
              <input
                type="radio"
                name="store-accent"
                value={s.value}
                checked={accent.value === s.value}
                onChange={() => setAccent(s)}
                className="peer sr-only"
              />
              <span className="sr-only">{s.name}</span>
              <span
                aria-hidden="true"
                className="block size-9 rounded-full ring-offset-2 ring-offset-paper transition-transform duration-150 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-cross hover:scale-110"
                style={{ background: s.value }}
              />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
