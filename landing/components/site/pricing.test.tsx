// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicPlan } from '@/lib/api';
import Pricing from './pricing';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const getPublicPlans = vi.fn();
vi.mock('@/lib/api', () => ({
  getPublicPlans: () => getPublicPlans(),
}));

// the seed catalogue (server/db/migrations/002 + storefront flags)
const plan = (p: Partial<PublicPlan> & { code: string }): PublicPlan => ({
  name: p.code[0].toUpperCase() + p.code.slice(1),
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
const PLANS = [
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
    code: 'pro',
    price_monthly: '79',
    price_yearly: '790',
    max_users: 20,
    max_products: 20000,
    features: { purchase_orders: true, storefront: true },
  }),
  plan({
    code: 'enterprise',
    price_monthly: '199',
    price_yearly: '1990',
    trial_days: 30,
    features: { purchase_orders: true, storefront: true },
  }),
];

const verdict = () => screen.getByText(/fits,/).textContent;

afterEach(() => {
  cleanup();
  getPublicPlans.mockReset();
});

describe('Pricing', () => {
  it('recommends the cheapest plan that fits the default shop', () => {
    render(<Pricing initialPlans={PLANS} />);
    expect(verdict()).toBe('Basic fits, $29 a month.');
    expect(
      screen.getByText('3 of 5 staff logins. 1,000 of 2,000 products.'),
    ).toBeInTheDocument();
    const basic = screen.getByRole('article', { name: /Basic/ });
    expect(within(basic).getByText('Fits your shop')).toBeInTheDocument();
  });

  it('moves the recommendation as the shop grows', async () => {
    const user = userEvent.setup();
    render(<Pricing initialPlans={PLANS} />);
    const staff = screen.getByLabelText('Number of staff who need a login');
    await user.clear(staff);
    await user.type(staff, '6');
    expect(verdict()).toBe('Pro fits, $79 a month.');
    await user.clear(staff);
    await user.type(staff, '30');
    expect(verdict()).toBe('Enterprise fits, $199 a month.');
  });

  it('only recommends plans with the online store when one is wanted', async () => {
    const user = userEvent.setup();
    render(<Pricing initialPlans={PLANS} />);
    await user.selectOptions(
      screen.getByLabelText('Do you want an online store?'),
      'yes',
    );
    expect(verdict()).toBe('Pro fits, $79 a month.');
    expect(screen.getByRole('link', { name: 'Try Pro free' })).toHaveAttribute(
      'href',
      '/signup?plan=pro',
    );
  });

  it('switches every price to yearly and shows the saving', async () => {
    const user = userEvent.setup();
    render(<Pricing initialPlans={PLANS} />);
    await user.click(screen.getByLabelText('Yearly, 2 months free'));
    const basic = screen.getByRole('article', { name: /Basic/ });
    expect(within(basic).getByText('$290')).toBeInTheDocument();
    expect(within(basic).getByText('/year')).toBeInTheDocument();
    expect(within(basic).getByText('Saves $58 a year')).toBeInTheDocument();
    expect(verdict()).toBe('Basic fits, $290 a year.');
  });

  it('links each plan to signup with its code', () => {
    render(<Pricing initialPlans={PLANS} />);
    expect(
      screen.getByRole('link', { name: 'Start free on Free' }),
    ).toHaveAttribute('href', '/signup?plan=free');
    expect(
      screen.getByRole('link', { name: 'Start trial on Enterprise' }),
    ).toHaveAttribute('href', '/signup?plan=enterprise');
  });

  it('fetches plans itself when the server could not', async () => {
    getPublicPlans.mockResolvedValue(PLANS);
    render(<Pricing initialPlans={[]} />);
    expect((await screen.findByText(/fits,/)).textContent).toBe(
      'Basic fits, $29 a month.',
    );
  });

  it('says what to do when prices cannot load', async () => {
    getPublicPlans.mockRejectedValue(new Error('down'));
    render(<Pricing initialPlans={[]} />);
    expect(await screen.findByText('Prices didn’t load.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /@/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:/),
    );
  });
});
