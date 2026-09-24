import Link from 'next/link';
import { appUrls, siteConfig } from '@/config/site';
import { Mark, Wordmark } from './mark';

// Final call to action on ink, then the footer. The large mark echoes the
// hero: one cavity already popped, the next sale is yours.

export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="pf-defer on-ink relative overflow-hidden bg-ink text-paper"
    >
      <Mark className="pointer-events-none absolute right-[max(var(--pf-gutter),calc((100vw-var(--pf-max))/2+var(--pf-gutter)))] top-1/2 hidden size-[min(34vw,460px)] -translate-y-1/2 text-white/[0.06] lg:block" />
      <div className="pf-wrap relative py-24 lg:py-40">
        <h2 id="cta-title" className="pf-display pf-h1 max-w-[14ch]">
          Put your whole shop on one stock record.
        </h2>
        <p className="pf-lede mt-6 text-ink-mute">
          Start on the free plan or try a paid one for 14 days. Bring your
          product list, add your staff and make your first sale today.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="pf-btn pf-btn--paper">
            Start free trial
          </Link>
          <a
            href={`mailto:${siteConfig.email}?subject=Walkthrough%20for%20my%20pharmacy`}
            className="pf-btn pf-btn--ghost text-paper [--btn-bg-hover:rgb(255_255_255/0.08)] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.25)]"
            style={{ ['--btn-fg' as string]: 'var(--color-paper)' }}
          >
            Book a walkthrough
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="pf-defer bg-paper [contain-intrinsic-size:auto_320px]">
      <div className="pf-wrap grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark />
          <p className="mt-4 max-w-[34ch] text-[0.95rem] text-ink-soft">
            Point of sale, online store and supplier ordering for pharmacies and
            medical stores, on one stock record.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-8 text-[0.95rem] sm:grid-cols-3 md:col-span-7"
        >
          <div>
            <p className="font-semibold">Product</p>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li>
                <a className="hover:text-ink" href="#how">
                  How it works
                </a>
              </li>
              <li>
                <a className="hover:text-ink" href="#product">
                  Counter, store, suppliers
                </a>
              </li>
              <li>
                <a className="hover:text-ink" href="#pricing">
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold">Account</p>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li>
                <Link className="hover:text-ink" href="/signup">
                  Start free trial
                </Link>
              </li>
              <li>
                <a className="hover:text-ink" href={appUrls.pos}>
                  Sign in
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold">Help</p>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li>
                <a className="hover:text-ink" href="#faq">
                  Questions
                </a>
              </li>
              <li>
                <a
                  className="hover:text-ink break-all"
                  href={`mailto:${siteConfig.email}`}
                >
                  Email us
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <div className="pf-wrap">
        <div className="flex flex-wrap justify-between gap-3 border-t border-foil-deep/50 py-6 text-[0.85rem] text-ink-soft">
          <span>© {year} PharmaFlow</span>
          <span>Made for pharmacies and medical stores.</span>
        </div>
      </div>
    </footer>
  );
}
