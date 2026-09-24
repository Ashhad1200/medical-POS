import { describe, it, expect } from 'vitest';
import type { PublicPlan } from './api';
import { trialAnswer } from './faq';

const plan = (
  p: Partial<PublicPlan> & { code: string; name: string },
): PublicPlan => ({
  description: null,
  price_monthly: 10,
  price_yearly: 100,
  currency: 'USD',
  max_users: null,
  max_products: null,
  trial_days: 14,
  features: {},
  ...p,
});

describe('trialAnswer', () => {
  it('describes the seed catalogue in one sentence per idea', () => {
    const text = trialAnswer([
      plan({
        code: 'free',
        name: 'Free',
        price_monthly: 0,
        price_yearly: 0,
        trial_days: 0,
        max_users: 2,
        max_products: 200,
      }),
      plan({ code: 'basic', name: 'Basic' }),
      plan({ code: 'pro', name: 'Pro' }),
      plan({ code: 'enterprise', name: 'Enterprise', trial_days: 30 }),
    ]);
    expect(text).toBe(
      'Basic and Pro start with 14 days free, Enterprise with 30. ' +
        'The Free plan has no time limit (up to 2 staff logins, up to 200 products). ' +
        'You don’t need a card to start, and your data stays when you move to a paid plan.',
    );
  });

  it('uses the singular verb for a single plan and skips a missing free plan', () => {
    expect(
      trialAnswer([plan({ code: 'pro', name: 'Pro', trial_days: 7 })]),
    ).toBe(
      'Pro starts with 7 days free. You don’t need a card to start, and your data stays when you move to a paid plan.',
    );
  });

  it('still answers when the plans could not be loaded', () => {
    expect(trialAnswer([])).toBe(
      'You don’t need a card to start, and your data stays when you move to a paid plan.',
    );
  });

  it('lists three or more names with commas', () => {
    const text = trialAnswer([
      plan({ code: 'a', name: 'A' }),
      plan({ code: 'b', name: 'B' }),
      plan({ code: 'c', name: 'C' }),
    ]);
    expect(text.startsWith('A, B and C start with 14 days free.')).toBe(true);
  });
});
