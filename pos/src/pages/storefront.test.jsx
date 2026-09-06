import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/api', () => ({
  api: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  tokenStore: { get: () => null, set: vi.fn() },
  apiError: (e) => e?.message,
}));

const svc = {
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  getOrders: vi.fn(),
  updateOrder: vi.fn(),
};
vi.mock('@/lib/services', () => ({ storefrontServices: svc }));

let feature = true;
vi.mock('@/auth/auth-context', () => ({
  useAuth: () => ({
    role: 'admin',
    hasFeature: (k) => (k === 'storefront' ? feature : false),
  }),
}));

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  feature = true;
  Object.values(svc).forEach((f) => f.mockReset());
});

describe('StorefrontSettingsPage', () => {
  it('shows the feature-locked card when the plan lacks storefront', async () => {
    feature = false;
    const { StorefrontSettingsPage } = await import('./storefront-settings');
    wrap(<StorefrontSettingsPage />);
    expect(
      await screen.findByText(/available on the Pro and Enterprise plans/i),
    ).toBeInTheDocument();
    expect(svc.getSettings).not.toHaveBeenCalled();
  });

  it('loads existing settings into the form', async () => {
    svc.getSettings.mockResolvedValue({
      data: { data: { display_name: 'My Pharmacy', slug: 'my-pharmacy', is_live: true, delivery_fee: 60, min_order: 200 } },
    });
    const { StorefrontSettingsPage } = await import('./storefront-settings');
    wrap(<StorefrontSettingsPage />);
    await waitFor(() =>
      expect(screen.getByDisplayValue('My Pharmacy')).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue('my-pharmacy')).toBeInTheDocument();
  });
});

describe('StorefrontOrdersPage', () => {
  const order = {
    id: 'o1',
    order_number: 'SF-1',
    customer_name: 'Buyer',
    customer_phone: '0300',
    customer_city: 'Karachi',
    payment_method: 'cod',
    total: 150,
    status: 'placed',
    placed_at: new Date().toISOString(),
    items: [{ name: 'X', quantity: 2 }],
  };

  it('renders orders and advances status via the API', async () => {
    svc.getOrders.mockResolvedValue({ data: { data: [order] } });
    svc.updateOrder.mockResolvedValue({ data: { data: {} } });
    const user = userEvent.setup();
    const { StorefrontOrdersPage } = await import('./storefront-orders');
    wrap(<StorefrontOrdersPage />);

    await waitFor(() => expect(screen.getByText('SF-1')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(svc.updateOrder).toHaveBeenCalledWith('o1', { status: 'confirmed' });
  });
});
