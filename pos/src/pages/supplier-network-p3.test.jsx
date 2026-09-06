import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api', () => ({
  api: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  tokenStore: { get: () => null, set: vi.fn() },
  apiError: (e) => e?.message,
}));

const supplierPortal = {
  getReturns: vi.fn(),
  resolveReturn: vi.fn(),
  analytics: vi.fn(),
};
const b2b = {
  connectedSuppliers: vi.fn(),
  search: vi.fn(),
  catalogue: vi.fn(),
  order: vi.fn(),
  getReturns: vi.fn(),
  createReturn: vi.fn(),
};
vi.mock('@/lib/services', () => ({
  supplierPortalServices: supplierPortal,
  b2bServices: b2b,
}));

let orgType = 'supplier';
vi.mock('@/auth/auth-context', () => ({
  useAuth: () => ({ role: 'admin', orgType }),
}));

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  orgType = 'supplier';
  [...Object.values(supplierPortal), ...Object.values(b2b)].forEach((f) => f.mockReset());
});

describe('SupplierAnalyticsPage (3.4)', () => {
  it('renders totals and the top-pharmacies list', async () => {
    supplierPortal.analytics.mockResolvedValue({
      data: {
        data: {
          totals: { orders: 7, revenue: 12000, pharmacies: 3 },
          topPharmacies: [{ name: 'City Pharmacy', orders: 4, revenue: 8000 }],
          fillRate: 92.5,
          statusBreakdown: { pending: 1, received: 5, cancelled: 1 },
        },
      },
    });
    const { SupplierAnalyticsPage } = await import('./supplier/analytics');
    wrap(<SupplierAnalyticsPage />);

    await waitFor(() => expect(screen.getByText('92.5%')).toBeInTheDocument());
    expect(screen.getByText('City Pharmacy')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument(); // orders
  });
});

describe('ReturnsPage (3.2)', () => {
  const row = {
    id: 'r1',
    po_number: 'B2B-1',
    pharmacy_name: 'City Pharmacy',
    supplier_name: 'Acme',
    item_name: 'Aspirin',
    quantity: 3,
    refund_amount: 60,
    reason: 'near_expiry',
    status: 'requested',
    created_at: new Date().toISOString(),
  };

  it('supplier view can accept a requested return', async () => {
    supplierPortal.getReturns.mockResolvedValue({ data: { data: [row] } });
    supplierPortal.resolveReturn.mockResolvedValue({ data: { data: {} } });
    const user = userEvent.setup();
    const { ReturnsPage } = await import('./returns');
    wrap(<ReturnsPage />);

    await waitFor(() => expect(screen.getByText('B2B-1')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /accept/i }));
    expect(supplierPortal.resolveReturn).toHaveBeenCalledWith('r1', { action: 'accept' });
  });

  it('pharmacy view is read-only (no resolve buttons)', async () => {
    orgType = 'pharmacy';
    b2b.getReturns.mockResolvedValue({ data: { data: [row] } });
    const { ReturnsPage } = await import('./returns');
    wrap(<ReturnsPage />);
    await waitFor(() => expect(screen.getByText('B2B-1')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull();
  });
});

describe('ReorderPage price compare (3.1)', () => {
  it('searches across suppliers and picks an offer into the cart', async () => {
    orgType = 'pharmacy';
    b2b.connectedSuppliers.mockResolvedValue({
      data: { data: [{ supplier_org_id: 's1', name: 'Acme', fill_rate: 90 }] },
    });
    b2b.search.mockResolvedValue({
      data: {
        data: [
          {
            name: 'Aspirin',
            offers: [
              { supplierProductId: 'sp1', supplierOrgId: 's1', supplierName: 'Acme', unitPrice: 18, moq: 5 },
            ],
          },
        ],
      },
    });
    b2b.catalogue.mockResolvedValue({
      data: { data: { connection: { credit_limit: 100000 }, products: [{ id: 'sp1', name: 'Aspirin', manufacturer: 'X', unit_price: 18, moq: 5 }] } },
    });
    b2b.order.mockResolvedValue({ data: { data: { poNumber: 'B2B-9' } } });

    const user = userEvent.setup();
    const { ReorderPage } = await import('./reorder');
    wrap(<ReorderPage />);

    await user.type(
      screen.getByPlaceholderText(/compare a product/i),
      'aspirin',
    );
    // offer button appears
    const offer = await screen.findByRole('button', { name: /acme.*18/i });
    await user.click(offer);

    // supplier selected + item added → Send order enabled with qty=MOQ
    const send = await screen.findByRole('button', { name: /send order/i });
    await waitFor(() => expect(send).not.toBeDisabled());
    await user.click(send);
    expect(b2b.order).toHaveBeenCalledWith('s1', {
      items: [{ supplierProductId: 'sp1', quantity: 5 }],
    });
  });
});
