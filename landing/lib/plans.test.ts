import { describe, it, expect } from 'vitest';
import type { PublicPlan } from './api';
import {
  bestYearlyMonthsFree,
  enabledFeatures,
  formatPrice,
  isFree,
  limitLabel,
  priceFor,
  recommendPlan,
  yearlySaving,
} from './plans';

// Mirrors the seed catalogue in server/db/migrations/002 (+ storefront flags).
const plan = (p: Partial<PublicPlan> & { code: string }): PublicPlan => ({
  name: p.code,
  description: null,
  price_monthly: 0,
  price_yearly: 0,
  currency: 'USD',
  max_users: null,
  max_products: null,
  trial_days: 14,
  features: {},
  ...p,
});

const PLANS: PublicPlan[] = [
  plan({
    code: 'pro',
    price_monthly: '79',
    price_yearly: '790',
    max_users: 20,
    max_products: 20000,
    features: { storefront: true, ai_analytics: true },
  }),
  plan({ code: 'free', max_users: 2, max_products: 200, trial_days: 0 }),
  plan({
    code: 'basic',
    price_monthly: '29',
    price_yearly: '290',
    max_users: 5,
    max_products: 2000,
    features: { purchase_orders: true, storefront: false },
  }),
  plan({
    code: 'enterprise',
    price_monthly: '199',
    price_yearly: '1990',
    trial_days: 30,
    features: { storefront: true },
  }),
];

describe('prices', () => {
  it('formats whole amounts without decimals and zero as Free', () => {
    expect(formatPrice(29)).toBe('$29');
    expect(formatPrice(33.5)).toBe('$33.50');
    expect(formatPrice(0)).toBe('Free');
    expect(formatPrice(2499, 'PKR')).toMatch(/PKR\s?2,499/);
  });

  it('falls back to a plain label for an unknown currency code', () => {
    expect(formatPrice(10, 'NOT-A-CODE')).toBe('NOT-A-CODE 10');
  });

  it('picks the price for the billing period from string or number columns', () => {
    expect(priceFor(PLANS[0], 'monthly')).toBe(79);
    expect(priceFor(PLANS[0], 'yearly')).toBe(790);
    expect(isFree(PLANS[1])).toBe(true);
    expect(isFree(PLANS[2])).toBe(false);
  });

  it('works out the yearly saving in money and months', () => {
    expect(yearlySaving(PLANS[2])).toEqual({ amount: 58, months: 2 });
    expect(yearlySaving(PLANS[1])).toEqual({ amount: 0, months: 0 });
    expect(bestYearlyMonthsFree(PLANS)).toBe(2);
    expect(bestYearlyMonthsFree([])).toBe(0);
  });
});

describe('plan copy', () => {
  it('labels limits, including unlimited', () => {
    expect(limitLabel(2000, 'products')).toBe('Up to 2,000 products');
    expect(limitLabel(null, 'staff logins')).toBe('Unlimited staff logins');
  });

  it('lists only enabled features, in a fixed order', () => {
    expect(enabledFeatures(PLANS[2])).toEqual([
      'Purchase orders & supplier ordering',
    ]);
    expect(enabledFeatures(PLANS[1])).toEqual([]);
  });
});

describe('recommendPlan', () => {
  it('returns the cheapest plan that covers staff and catalogue', () => {
    expect(
      recommendPlan(PLANS, { staff: 2, products: 150, onlineStore: false })
        ?.plan.code,
    ).toBe('free');
    expect(
      recommendPlan(PLANS, { staff: 4, products: 1500, onlineStore: false })
        ?.plan.code,
    ).toBe('basic');
    expect(
      recommendPlan(PLANS, { staff: 6, products: 1500, onlineStore: false })
        ?.plan.code,
    ).toBe('pro');
    expect(
      recommendPlan(PLANS, { staff: 30, products: 1500, onlineStore: false })
        ?.plan.code,
    ).toBe('enterprise');
  });

  it('requires the storefront flag when an online store is wanted', () => {
    const rec = recommendPlan(PLANS, {
      staff: 2,
      products: 100,
      onlineStore: true,
    });
    expect(rec?.plan.code).toBe('pro');
    expect(rec?.reasons).toContain('Includes your own online store');
  });

  it('explains the fit against the real limits', () => {
    const rec = recommendPlan(PLANS, {
      staff: 4,
      products: 1500,
      onlineStore: false,
    });
    expect(rec?.reasons).toEqual([
      '4 of 5 staff logins',
      '1,500 of 2,000 products',
    ]);
    const ent = recommendPlan(PLANS, {
      staff: 40,
      products: 50000,
      onlineStore: false,
    });
    expect(ent?.reasons[0]).toBe('No limit on staff logins (you have 40)');
  });

  it('returns null when no plan fits', () => {
    expect(
      recommendPlan(PLANS.slice(0, 3), {
        staff: 50,
        products: 10,
        onlineStore: false,
      }),
    ).toBeNull();
    expect(
      recommendPlan([], { staff: 1, products: 1, onlineStore: false }),
    ).toBeNull();
  });
});
