import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/api', () => ({
  api: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  tokenStore: { get: () => null, set: vi.fn() },
  apiError: (e) => e?.message,
}));

const svc = {
  getKpis: vi.fn(),
  getInsights: vi.fn(),
  getPredictions: vi.fn(),
  getAlerts: vi.fn(),
};
vi.mock('@/lib/services', () => ({ aiAnalyticsServices: svc }));

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset());
  svc.getKpis.mockResolvedValue({ data: { data: {} } });
  svc.getPredictions.mockResolvedValue({ data: { data: { forecast: [] } } });
  svc.getAlerts.mockResolvedValue({ data: { data: { alerts: [] } } });
});

describe('AiAnalyticsPage — low-stock reorder link (2b.7)', () => {
  const lowStockInsight = {
    title: 'Low Stock Alert',
    description: '2 products are below reorder level',
    confidence: 95,
    priority: 'high',
    reorderableCount: 1,
    data: [
      {
        id: 'p1',
        name: 'Panadol',
        reorder: {
          supplierOrgId: 'sup-9',
          supplierName: 'MedSupply',
          supplierProductId: 'sp-1',
          unitPrice: 8,
          moq: 10,
        },
      },
      { id: 'p2', name: 'Orphan Item', reorder: null },
    ],
  };

  it('shows a deep link to /reorder for a connected-supplier match, none otherwise', async () => {
    svc.getInsights.mockResolvedValue({
      data: { data: { insights: [lowStockInsight] } },
    });
    const { AiAnalyticsPage } = await import('./ai-analytics');
    wrap(<AiAnalyticsPage />);

    const link = await screen.findByRole('link', { name: /reorder panadol from medsupply/i });
    expect(link).toHaveAttribute(
      'href',
      '/reorder?supplier=sup-9&sku=Panadol',
    );

    expect(
      screen.queryByRole('link', { name: /reorder orphan item/i }),
    ).not.toBeInTheDocument();
  });

  it('renders no reorder link when the insight carries no data rows', async () => {
    svc.getInsights.mockResolvedValue({
      data: {
        data: {
          insights: [{ title: 'Low Stock Alert', description: 'x', confidence: 95, priority: 'high' }],
        },
      },
    });
    const { AiAnalyticsPage } = await import('./ai-analytics');
    wrap(<AiAnalyticsPage />);
    await waitFor(() => expect(screen.getByText('Low Stock Alert')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /reorder/i })).not.toBeInTheDocument();
  });
});
