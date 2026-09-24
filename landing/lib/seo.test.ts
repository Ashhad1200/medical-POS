import { describe, it, expect } from 'vitest';
import type { PublicPlan } from './api';
import { structuredData } from './seo';

const site = {
  name: 'PharmaFlow',
  url: 'https://example.test',
  description: 'd',
};
const plan = (
  code: string,
  monthly: number | string,
  currency = 'USD',
): PublicPlan => ({
  code,
  name: code.toUpperCase(),
  description: null,
  price_monthly: monthly,
  price_yearly: 0,
  currency,
  max_users: null,
  max_products: null,
  trial_days: 14,
  features: {},
});

describe('structuredData', () => {
  it('describes the app with one offer per plan', () => {
    const [app] = structuredData(
      site,
      [plan('free', 0), plan('pro', '79')],
      [],
    );
    expect(app['@type']).toBe('SoftwareApplication');
    expect(app.offers).toHaveLength(2);
    expect(app.offers?.[0]).toMatchObject({
      price: '0',
      priceCurrency: 'USD',
      url: 'https://example.test/signup?plan=free',
    });
    expect(app.offers?.[0]).not.toHaveProperty('priceSpecification');
    expect(app.offers?.[1]).toMatchObject({
      price: '79',
      priceSpecification: { unitText: 'MONTH', price: '79' },
    });
  });

  it('leaves offers out when plans are unavailable', () => {
    const [app] = structuredData(site, [], []);
    expect(app).not.toHaveProperty('offers');
  });

  it('turns the FAQ into a FAQPage', () => {
    const [, faq] = structuredData(site, [], [{ q: 'Q?', a: 'A.' }]);
    expect(faq).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Q?',
          acceptedAnswer: { '@type': 'Answer', text: 'A.' },
        },
      ],
    });
  });
});
