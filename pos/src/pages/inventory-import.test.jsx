import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api', () => ({
  api: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  apiError: (e) => e?.message,
}));

const med = { bulkImport: vi.fn() };
vi.mock('@/lib/services', () => ({ medicineServices: med }));

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  med.bulkImport.mockReset();
  med.bulkImport.mockResolvedValue({
    data: { data: { total: 1, inserted: 1, errorCount: 0, errors: [], results: [], dryRun: false } },
  });
});

describe('InventoryImportDialog', () => {
  it('parses pasted CSV and imports the rows', async () => {
    const user = userEvent.setup();
    const { InventoryImportDialog } = await import('./inventory-import');
    wrap(<InventoryImportDialog open onOpenChange={() => {}} />);

    const box = screen.getByRole('textbox');
    await user.click(box);
    await user.paste('name,manufacturer,quantity\nPanadol,GSK,10');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /import 1/i })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: /import 1/i }));

    expect(med.bulkImport).toHaveBeenCalledWith(
      [{ name: 'Panadol', manufacturer: 'GSK', quantity: '10' }],
      false,
    );
  });

  it('dry run calls the API with dryRun=true and shows the preview count', async () => {
    med.bulkImport.mockResolvedValue({
      data: { data: { total: 2, inserted: 1, errorCount: 1, errors: [{ row: 2, message: 'name is required' }], results: [], dryRun: true } },
    });
    const user = userEvent.setup();
    const { InventoryImportDialog } = await import('./inventory-import');
    wrap(<InventoryImportDialog open onOpenChange={() => {}} />);

    await user.click(screen.getByRole('textbox'));
    await user.paste('name,manufacturer\nA,Acme\n,Acme');
    await user.click(screen.getByRole('button', { name: /dry run/i }));

    expect(med.bulkImport).toHaveBeenCalledWith(expect.any(Array), true);
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });
});
