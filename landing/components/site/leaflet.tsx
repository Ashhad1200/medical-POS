import { siteConfig } from '@/config/site';

// Outcomes and data handling, written as the two sections of a patient
// information leaflet that every pharmacist has read a thousand times.
// Numbered 4 and 5 because that is where they sit in a real leaflet.

const EFFECTS: { freq: string; items: string[] }[] = [
  {
    freq: 'Very common',
    items: [
      'Knowing how many you have without walking to the shelf.',
      'Selling the oldest batch first without having to think about it.',
    ],
  },
  {
    freq: 'Common',
    items: [
      'Ordering from the cheapest supplier, not the one who called last.',
      'Staff seeing only the screens their job needs.',
    ],
  },
  {
    freq: 'Uncommon',
    items: [
      'Online orders waiting for you when you open in the morning.',
      'Customers checking their own delivery instead of phoning the shop.',
    ],
  },
  {
    freq: 'Rare',
    items: [
      'Finding an expired box at the back of the shelf. If this happens, check your return suggestions. It was on there.',
    ],
  },
  {
    freq: 'Not known',
    items: ['Missing the paper register.'],
  },
];

const STORAGE: { title: string; body: string }[] = [
  {
    title: 'Keep out of reach of other pharmacies.',
    body: 'Each pharmacy is its own account. Your products, sales, customers and staff are only ever read inside your organisation.',
  },
  {
    title: 'One person, one session.',
    body: 'Signing in on a new device signs the old one out. Staff who are switched off, or an account that is suspended, are signed out at once.',
  },
  {
    title: 'Roles decide what staff can open.',
    body: 'Counter, warehouse, manager and admin each see their own part of the system.',
  },
  {
    title: 'Online payments are checked.',
    body: 'Payment confirmations are signature-checked before an order is marked paid, and a paid order is never marked unpaid again.',
  },
  {
    title: 'Prescription medicines stay off the web.',
    body: 'Your online store only lists items that don’t need a prescription.',
  },
  {
    title: 'Nothing to install.',
    body: 'It runs in the browser on the counter PC, a laptop or a tablet. Pay monthly or yearly, with no long contract.',
  },
];

export default function Leaflet() {
  return (
    <section
      aria-labelledby="leaflet-title"
      className="bg-paper pb-24 pt-4 lg:pb-36 lg:pt-6"
    >
      <div className="pf-wrap">
        <h2 id="leaflet-title" className="sr-only">
          What changes, and how your data is kept
        </h2>

        {/* the leaflet itself: a folded sheet with two panels */}
        <div className="pf-shadow-paper relative mx-auto grid max-w-[1120px] bg-paper-bright lg:grid-cols-2">
          {/* fold line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-10 -translate-x-1/2 lg:block"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgb(14 43 34 / 0.05) 45%, rgb(255 255 255 / 0.9) 50%, rgb(14 43 34 / 0.04) 55%, transparent)',
            }}
          />

          <div className="px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
            <h3
              className="pf-display text-[clamp(1.9rem,1.3rem+1.8vw,2.9rem)]"
              style={{ fontStretch: '80%' }}
            >
              4. Possible side effects
            </h3>
            <p className="pf-body mt-4 text-[0.98rem] text-ink-soft">
              Like all good medicines, PharmaFlow can cause side effects,
              although not everybody gets them.
            </p>
            <dl className="mt-8 space-y-6 text-[0.98rem]">
              {EFFECTS.map((e) => (
                <div key={e.freq}>
                  <dt className="font-bold">{e.freq}</dt>
                  <dd>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 marker:text-foil-deep">
                      {e.items.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 border-t border-foil pt-5 text-[0.9rem] text-ink-soft">
              <span className="font-semibold text-ink">
                Reporting side effects.
              </span>{' '}
              If you get any side effects, including ones not listed here, tell
              us at{' '}
              <a
                className="pf-link font-semibold text-ink"
                href={`mailto:${siteConfig.email}`}
              >
                {siteConfig.email}
              </a>
              .
            </p>
          </div>

          <div className="border-t border-foil px-6 py-10 sm:px-10 lg:border-t-0 lg:px-14 lg:py-14">
            <h3
              className="pf-display text-[clamp(1.9rem,1.3rem+1.8vw,2.9rem)]"
              style={{ fontStretch: '80%' }}
            >
              5. How to store PharmaFlow
            </h3>
            <p className="pf-body mt-4 text-[0.98rem] text-ink-soft">
              How your pharmacy’s data is kept, in plain words.
            </p>
            <dl className="mt-8 space-y-5 text-[0.98rem]">
              {STORAGE.map((s) => (
                <div key={s.title}>
                  <dt className="font-bold">{s.title}</dt>
                  <dd className="mt-1 text-ink-soft">{s.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
