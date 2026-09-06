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

const supplierPortal = {
  getCatalogue: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  getIncomingOrders: vi.fn(),
  updateIncomingOrder: vi.fn(),
};
const connection = { list: vi.fn(), request: vi.fn(), respond: vi.fn() };
const b2b = { connectedSuppliers: vi.fn(), catalogue: vi.fn(), order: vi.fn() };
vi.mock('@/lib/services', () => ({
  supplierPortalServices: supplierPortal,
  connectionServices: connection,
  b2bServices: b2b,
}));

let orgType = 'pharmacy';
vi.mock('@/auth/auth-context', () => ({
  useAuth: () => ({ role: 'admin', orgType }),
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
  orgType = 'pharmacy';
  [...Object.values(supplierPortal), ...Object.values(connection), ...Object.values(b2b)].forEach(
    (f) => f.mockReset(),
  );
});

describe('SupplierOrdersPage (2c.3)', () => {
  it('accepts a pending order via the API', async () => {
    supplierPortal.getIncomingOrders.mockResolvedValue({
      data: { data: [{ id: 'po1', po_number: 'B2B-1', pharmacy_name: 'Shop', status: 'pending', total_amount: 500, created_at: new Date().toISOString(), items: [{}] }] },
    });
    supplierPortal.updateIncomingOrder.mockResolvedValue({ data: { data: {} } });
    const user = userEvent.setup();
    const { SupplierOrdersPage } = await import('./supplier/incoming-orders');
    wrap(<SupplierOrdersPage />);

    await waitFor(() => expect(screen.getByText('B2B-1')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /accept/i }));
    expect(supplierPortal.updateIncomingOrder).toHaveBeenCalledWith('po1', { status: 'ordered' });
  });
});

describe('ConnectionsPage (2c.4)', () => {
  it('pharmacy view offers "Connect a supplier"; supplier view offers "Approve"', async () => {
    connection.list.mockResolvedValue({
      data: { data: [{ id: 'c1', status: 'pending', supplier_name: 'Sup', supplier_code: 'sup-1', pharmacy_name: 'Ph', pharmacy_code: 'ph-1', credit_limit: 0, payment_terms_days: 0 }] },
    });
    const { ConnectionsPage } = await import('./connections');

    const { unmount } = wrap(<ConnectionsPage />);
    await waitFor(() => expect(screen.getByText(/connect a supplier/i)).toBeInTheDocument());
    unmount();

    orgType = 'supplier';
    wrap(<ConnectionsPage />);
    await waitFor(() => expect(screen.getByText('Ph')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.queryByText(/connect a supplier/i)).toBeNull();
  });
});

describe('ReorderPage (2c.5)', () => {
  it('builds a cart from a supplier catalogue and submits the order', async () => {
    b2b.connectedSuppliers.mockResolvedValue({
      data: { data: [{ supplier_org_id: 's1', name: 'Acme Dist' }] },
    });
    b2b.catalogue.mockResolvedValue({
      data: {
        data: {
          connection: { credit_limit: 100000 },
          products: [
            { id: 'sp1', name: 'Widget', manufacturer: 'Acme', unit_price: 20, moq: 5 },
          ],
        },
      },
    });
    b2b.order.mockResolvedValue({ data: { data: { poNumber: 'B2B-9' } } });

    const user = userEvent.setup();
    const { ReorderPage } = await import('./reorder');
    wrap(<ReorderPage />);

    // pick the supplier
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Acme Dist'));

    // catalogue loads → add the item (first click jumps to MOQ 5)
    await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'add Widget' }));

    const send = await screen.findByRole('button', { name: /send order/i });
    await waitFor(() => expect(send).not.toBeDisabled());
    await user.click(send);

    expect(b2b.order).toHaveBeenCalledWith('s1', {
      items: [{ supplierProductId: 'sp1', quantity: 5 }],
    });
  });
});
