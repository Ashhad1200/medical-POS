import type { PublicPlan } from './api';

// Plan feature flags (plans.features jsonb) in the words a pharmacy owner uses.
export const FEATURE_LABELS: Record<string, string> = {
  purchase_orders: 'Purchase orders & supplier ordering',
  exports: 'CSV / Excel exports',
  storefront: 'Your own online store',
  custom_domain: 'Your own domain for the store',
  ai_analytics: 'AI sales analytics',
  multi_branch: 'More than one branch',
  api_access: 'API access',
};

/** Every plan gets these, whatever its flags say. */
export const INCLUDED_EVERYWHERE = [
  'Counter checkout & receipts',
  'Batch & expiry tracking, sold earliest-expiry first',
  'Staff roles: counter, warehouse, manager',
];

export type BillingPeriod = 'monthly' | 'yearly';

export function priceFor(plan: PublicPlan, period: BillingPeriod): number {
  return (
    Number(period === 'yearly' ? plan.price_yearly : plan.price_monthly) || 0
  );
}

export function isFree(plan: PublicPlan): boolean {
  return Number(plan.price_monthly) === 0 && Number(plan.price_yearly) === 0;
}

/** "$29", "PKR 2,499" or "Free". Whole amounts drop the decimals. */
export function formatPrice(amount: number, currency = 'USD'): string {
  if (!amount) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    // unknown currency code from the API: show it plainly rather than crash
    return `${currency} ${amount.toLocaleString('en-US')}`;
  }
}

/** How much a year up front saves versus twelve monthly payments. */
export function yearlySaving(plan: PublicPlan): {
  amount: number;
  months: number;
} {
  const monthly = Number(plan.price_monthly) || 0;
  const yearly = Number(plan.price_yearly) || 0;
  if (!monthly || !yearly) return { amount: 0, months: 0 };
  const amount = Math.max(0, monthly * 12 - yearly);
  return { amount, months: Math.round(amount / monthly) };
}

/** The biggest yearly discount on offer, in whole months (for the toggle). */
export function bestYearlyMonthsFree(plans: PublicPlan[]): number {
  return plans.reduce((best, p) => Math.max(best, yearlySaving(p).months), 0);
}

export function limitLabel(value: number | null, noun: string): string {
  return value == null
    ? `Unlimited ${noun}`
    : `Up to ${value.toLocaleString('en-US')} ${noun}`;
}

export function enabledFeatures(plan: PublicPlan): string[] {
  return Object.entries(FEATURE_LABELS)
    .filter(([key]) => plan.features?.[key])
    .map(([, label]) => label);
}

export type StoreProfile = {
  staff: number;
  products: number;
  onlineStore: boolean;
};

export type Recommendation = {
  plan: PublicPlan;
  reasons: string[];
};

const fits = (limit: number | null, need: number) =>
  limit == null || limit >= need;

/**
 * The cheapest public plan whose real limits cover the store. Returns null
 * when nothing fits (then the page points people at a conversation instead).
 */
export function recommendPlan(
  plans: PublicPlan[],
  profile: StoreProfile,
): Recommendation | null {
  const candidates = [...plans]
    .sort((a, b) => Number(a.price_monthly) - Number(b.price_monthly))
    .filter(
      (p) =>
        fits(p.max_users, profile.staff) &&
        fits(p.max_products, profile.products) &&
        (!profile.onlineStore || !!p.features?.storefront),
    );

  const plan = candidates[0];
  if (!plan) return null;

  const reasons = [
    plan.max_users == null
      ? `No limit on staff logins (you have ${profile.staff})`
      : `${profile.staff} of ${plan.max_users} staff logins`,
    plan.max_products == null
      ? `No limit on products (you have ${profile.products.toLocaleString('en-US')})`
      : `${profile.products.toLocaleString('en-US')} of ${plan.max_products.toLocaleString('en-US')} products`,
  ];
  if (profile.onlineStore) reasons.push('Includes your own online store');
  return { plan, reasons };
}
