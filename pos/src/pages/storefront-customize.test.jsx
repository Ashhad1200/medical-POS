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

const sf = { getCustomization: vi.fn(), saveCustomization: vi.fn() };
const med = { getAll: vi.fn() };
vi.mock('@/lib/services', () => ({
  storefrontServices: sf,
  medicineServices: med,
}));

let feature = true;
vi.mock('@/auth/auth-context', () => ({
  useAuth: () => ({ role: 'admin', hasFeature: (k) => (k === 'storefront' ? feature : false) }),
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
  sf.getCustomization.mockReset();
  sf.saveCustomization.mockReset();
  med.getAll.mockReset();
  sf.getCustomization.mockResolvedValue({
    data: { data: { banners: [], deals: [], featured: [] } },
  });
  med.getAll.mockResolvedValue({
    data: { data: [{ id: 'p1', name: 'Panadol' }, { id: 'p2', name: 'Vitamin C' }] },
  });
  sf.saveCustomization.mockResolvedValue({
    data: { data: { banners: [], deals: [], featured: [] } },
  });
});

describe('StorefrontCustomizePage', () => {
  it('feature-locks without the storefront plan', async () => {
    feature = false;
    const { StorefrontCustomizePage } = await import('./storefront-customize');
    wrap(<StorefrontCustomizePage />);
    expect(
      await screen.findByText(/available on the pro and enterprise plans/i),
    ).toBeInTheDocument();
    expect(sf.getCustomization).not.toHaveBeenCalled();
  });

  it('adds a banner and saves the whole customization payload', async () => {
    const user = userEvent.setup();
    const { StorefrontCustomizePage } = await import('./storefront-customize');
    wrap(<StorefrontCustomizePage />);

    await waitFor(() => expect(screen.getByText(/homepage banners/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /add banner/i }));
    await user.click(screen.getByRole('button', { name: /save storefront/i }));

    expect(sf.saveCustomization).toHaveBeenCalledTimes(1);
    const body = sf.saveCustomization.mock.calls[0][0];
    expect(body.banners).toHaveLength(1);
    expect(body.banners[0].bg_style).toBe('color');
    expect(body).toHaveProperty('deals');
    expect(body).toHaveProperty('featured');
  });
});
