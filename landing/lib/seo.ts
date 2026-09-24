import type { PublicPlan } from './api';

type Site = { name: string; url: string; description: string };
type QA = { q: string; a: string };

type Offer = {
  '@type': 'Offer';
  name: string;
  price: string;
  priceCurrency: string;
  url: string;
  priceSpecification?: {
    '@type': 'UnitPriceSpecification';
    price: string;
    priceCurrency: string;
    unitText: 'MONTH';
  };
};

type SoftwareApplication = {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  url: string;
  description: string;
  applicationCategory: string;
  applicationSubCategory: string;
  operatingSystem: string;
  offers?: Offer[];
};

type FaqPage = {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: {
    '@type': 'Question';
    name: string;
    acceptedAnswer: { '@type': 'Answer'; text: string };
  }[];
};

/**
 * JSON-LD for the marketing page: the product with its real plan prices, and
 * the FAQ. Built from the same data the page renders so the two never drift.
 */
export function structuredData(
  site: Site,
  plans: PublicPlan[],
  faqs: QA[],
): [SoftwareApplication, FaqPage] {
  const offers: Offer[] = plans.map((p) => ({
    '@type': 'Offer',
    name: p.name,
    price: String(Number(p.price_monthly) || 0),
    priceCurrency: p.currency || 'USD',
    ...(Number(p.price_monthly) > 0 && {
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: String(Number(p.price_monthly)),
        priceCurrency: p.currency || 'USD',
        unitText: 'MONTH',
      },
    }),
    url: `${site.url}/signup?plan=${encodeURIComponent(p.code)}`,
  }));

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: site.name,
      url: site.url,
      description: site.description,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Pharmacy point of sale',
      operatingSystem: 'Web browser',
      ...(offers.length && { offers }),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];
}
