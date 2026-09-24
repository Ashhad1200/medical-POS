import { siteConfig } from '@/config/site';
import type { QA } from './faq-data';
import { PlusIcon } from './icons';

// Native <details>: works before (and without) JavaScript, and every answer is
// in the HTML for search engines, not only the open ones.
export default function Faq({ items }: { items: QA[] }) {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="pf-defer border-t border-foil-deep/50 bg-paper"
    >
      <div className="pf-wrap grid gap-12 py-24 lg:grid-cols-12 lg:gap-6 lg:py-36">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--pf-header-h)+48px)]">
            <h2 id="faq-title" className="pf-display pf-h2">
              Questions pharmacists ask us
            </h2>
            <p className="pf-body mt-5 text-ink-soft">
              Something else on your mind? Write to{' '}
              <a
                className="pf-link font-semibold text-ink"
                href={`mailto:${siteConfig.email}`}
              >
                {siteConfig.email}
              </a>
              .
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          {items.map((item) => (
            <details
              key={item.q}
              className="pf-faq group border-b border-foil-deep/60 first:border-t"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-sm py-6 transition-colors hover:text-cross-deep [&::-webkit-details-marker]:hidden">
                <h3 className="text-[1.08rem] font-semibold">{item.q}</h3>
                <PlusIcon className="mt-1 size-5 shrink-0 text-ink-soft transition-transform duration-300 ease-[var(--ease-pf-out)] group-open:rotate-45" />
              </summary>
              <p className="pf-body pb-7 pr-10 text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
