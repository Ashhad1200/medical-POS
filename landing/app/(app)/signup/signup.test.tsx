// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPlan } from '@/lib/api';
import SignupPage from './page';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let search = new URLSearchParams('plan=pro');
vi.mock('next/navigation', () => ({ useSearchParams: () => search }));

const getPublicPlans = vi.fn();
const signup = vi.fn();
vi.mock('@/lib/api', () => ({
  getPublicPlans: () => getPublicPlans(),
  signup: (input: unknown) => signup(input),
}));

const plan = (code: string, monthly: number, trial: number): PublicPlan => ({
  code,
  name: code[0].toUpperCase() + code.slice(1),
  description: null,
  price_monthly: monthly,
  price_yearly: monthly * 10,
  currency: 'USD',
  max_users: 5,
  max_products: 2000,
  trial_days: trial,
  features: {},
});

beforeEach(() => {
  search = new URLSearchParams('plan=pro');
  getPublicPlans.mockResolvedValue([
    plan('pro', 79, 14),
    plan('free', 0, 0),
    plan('basic', 29, 14),
  ]);
});
afterEach(() => {
  cleanup();
  signup.mockReset();
});

async function fill() {
  const user = userEvent.setup();
  render(<SignupPage />);
  await user.type(
    await screen.findByLabelText('Pharmacy or store name'),
    'Noor Pharmacy',
  );
  await user.type(screen.getByLabelText('Your name'), 'Sana');
  await user.type(screen.getByLabelText('Work email'), 'sana@noor.pk');
  await user.type(screen.getByLabelText('Password'), 'longenough1');
  return user;
}

describe('Signup page', () => {
  it('preselects the plan from the link and lists plans cheapest first', async () => {
    render(<SignupPage />);
    const pro = await screen.findByRole('radio', { name: /Pro/ });
    expect(pro).toBeChecked();
    const names = screen
      .getAllByRole('radio')
      .map((r) => r.closest('label')!.textContent);
    expect(names[0]).toMatch(/^Free/);
    expect(names[2]).toMatch(/^Pro/);
  });

  it('creates the pharmacy and says what to do next', async () => {
    signup.mockResolvedValue({
      token: 't',
      plan: 'pro',
      user: { id: '1', email: 'sana@noor.pk', fullName: 'Sana' },
      organization: {
        code: 'noor',
        plan_status: 'trial',
        access_valid_till: null,
      },
    });
    const user = await fill();
    await user.click(
      screen.getByRole('button', { name: 'Create my pharmacy' }),
    );
    expect(signup).toHaveBeenCalledWith({
      organizationName: 'Noor Pharmacy',
      fullName: 'Sana',
      email: 'sana@noor.pk',
      password: 'longenough1',
      planCode: 'pro',
    });
    expect(
      await screen.findByRole('heading', { name: 'Your pharmacy is ready.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to your dashboard' }),
    ).toBeInTheDocument();
  });

  it('shows the server’s reason when signup fails', async () => {
    signup.mockRejectedValue(
      new Error('An account with that email already exists'),
    );
    const user = await fill();
    await user.click(
      screen.getByRole('button', { name: 'Create my pharmacy' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with that email already exists',
    );
  });

  it('falls back to the cheapest plan when the link names an unknown one', async () => {
    search = new URLSearchParams('plan=gold');
    render(<SignupPage />);
    expect(await screen.findByRole('radio', { name: /Free/ })).toBeChecked();
  });
});
