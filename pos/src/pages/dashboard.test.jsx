import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/api', () => ({
  api: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  tokenStore: { get: () => null, set: vi.fn() },
  apiError: (e) => e?.message,
}));

vi.mock('@/lib/services', () => ({
  dashboardServices: {
    getStats: vi.fn(async () => ({
      data: {
        data: {
          totalUsers: 3,
          totalOrders: 12,
          todayRevenue: 4500,
          todayOrders: 6,
          pendingOrders: 2,
          lowStockItems: 1,
          monthlyStats: { totalSales: 90000, averageOrderValue: 750 },
          systemStatus: { status: 'healthy', database: 'PostgreSQL' },
        },
      },
    })),
  },
  medicineServices: {
    getStats: vi.fn(async () => ({
      data: { data: { total: 40, totalValue: 120000, expired: 0, expiringSoon: 3, outOfStock: 1 } },
    })),
  },
}));

vi.mock('@/auth/auth-context', () => ({
  useAuth: () => ({
    profile: { fullName: 'Dana Fox', organization: { name: 'Wellness' } },
    role: 'admin',
  }),
}));

async function renderDashboard() {
  const { DashboardPage } = await import('./dashboard');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  it('greets the user and renders the KPI numbers from the API', async () => {
    await renderDashboard();

    expect(screen.getByText(/Welcome back, Dana/)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText('PKR 4,500')).toBeInTheDocument()
    );
    expect(screen.getByText('PKR 90,000')).toBeInTheDocument(); // month sales
    expect(screen.getByText('40')).toBeInTheDocument(); // products
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  });
});
