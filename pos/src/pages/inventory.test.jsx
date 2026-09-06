import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api', () => ({
  api: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  tokenStore: { get: () => null, set: vi.fn() },
  apiError: (e) => e?.message,
}));

const getAll = vi.fn(async () => ({
  data: {
    data: {
      medicines: [
        {
          id: 'p1',
          name: 'Paracetamol',
          manufacturer: 'GSK',
          category: 'tablet',
          total_quantity: 80,
          max_price: 10,
          low_stock_threshold: 10,
          prescription_required: false,
        },
        {
          id: 'p2',
          name: 'Tramadol',
          manufacturer: 'Acme',
          category: 'tablet',
          total_quantity: 5,
          max_price: 40,
          low_stock_threshold: 10,
          prescription_required: true,
        },
      ],
    },
  },
}));

vi.mock('@/lib/services', () => ({
  medicineServices: {
    getAll: (...a) => getAll(...a),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/auth/auth-context', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

async function renderInventory() {
  const { InventoryPage } = await import('./inventory');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <InventoryPage />
    </QueryClientProvider>
  );
}

describe('InventoryPage', () => {
  it('renders rows and marks prescription items with an Rx badge', async () => {
    await renderInventory();
    await waitFor(() => expect(screen.getByText('Paracetamol')).toBeInTheDocument());

    const tramadolRow = screen.getByText('Tramadol').closest('tr');
    expect(within(tramadolRow).getByText('Rx')).toBeInTheDocument();

    const paracetamolRow = screen.getByText('Paracetamol').closest('tr');
    expect(within(paracetamolRow).queryByText('Rx')).toBeNull();
  });

  it('the new-product dialog exposes the prescription toggle', async () => {
    const user = userEvent.setup();
    await renderInventory();
    await waitFor(() => expect(screen.getByText('Paracetamol')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /new product/i }));

    // Radix Dialog portals to document.body; findBy* searches it.
    const toggle = await screen.findByRole('switch', {}, { timeout: 3000 });
    expect(toggle).toBeInTheDocument();
    expect(screen.getByText(/prescription required/i)).toBeInTheDocument();
  });
});
