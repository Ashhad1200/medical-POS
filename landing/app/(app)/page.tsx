import Header from '@/components/site/header';
import Hero from '@/components/site/hero/hero';
import Problem from '@/components/site/problem';
import BatchLife from '@/components/site/batch-life';
import Product from '@/components/site/product';
import Leaflet from '@/components/site/leaflet';
import Pricing from '@/components/site/pricing';
import Faq from '@/components/site/faq';
import { FinalCta, Footer } from '@/components/site/closing';
import { faqItems } from '@/components/site/faq-data';
import { getPublicPlansSafe } from '@/lib/api';
import { siteConfig } from '@/config/site';
import { structuredData } from '@/lib/seo';

// Plans come from the API at render time (cached 10 min) so prices are in the
// HTML for search engines; the pricing section refetches if this came back empty.
export const revalidate = 600;

export default async function Page() {
  const plans = await getPublicPlansSafe();
  const faqs = faqItems(plans);

  return (
    <div className="pf min-h-screen">
      <script
        type="application/ld+json"
        // plan names come from the API: escape '<' so none can close this tag
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            structuredData(siteConfig, plans, faqs),
          ).replace(/</g, '\\u003c'),
        }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Problem />
        <BatchLife />
        <Product />
        <Leaflet />
        <Pricing initialPlans={plans} />
        <Faq items={faqs} />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
