import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}));

const auth = {
  profile: { fullName: 'A', organization: { name: 'Shop' } },
  role: 'admin',
  orgType: 'pharmacy',
  logout: vi.fn(),
  hasFeature: vi.fn(),
};
vi.mock('@/auth/auth-context', () => ({ useAuth: () => auth }));

async function renderLayout() {
  const { AppLayout } = await import('./app-layout');
  render(
    <MemoryRouter>
      <AppLayout />
    </MemoryRouter>,
  );
}

describe('AppLayout nav', () => {
  it('hides feature-gated items when the plan lacks the feature', async () => {
    auth.orgType = 'pharmacy';
    auth.hasFeature.mockReturnValue(false);
    await renderLayout();
    expect(screen.queryByText('Online store')).toBeNull();
    expect(screen.queryByText('Store orders')).toBeNull();
    // a non-gated item is still there
    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });

  it('shows the supplier nav (not the pharmacy nav) for a supplier org', async () => {
    auth.orgType = 'supplier';
    auth.hasFeature.mockReturnValue(false);
    await renderLayout();
    expect(screen.getByText('Catalogue')).toBeInTheDocument();
    expect(screen.getByText('Incoming orders')).toBeInTheDocument();
    expect(screen.getByText('Connections')).toBeInTheDocument();
    // pharmacy-only items are gone
    expect(screen.queryByText('New order')).toBeNull();
    expect(screen.queryByText('Inventory')).toBeNull();
    auth.orgType = 'pharmacy';
  });

  it('shows the storefront items when the feature is on', async () => {
    auth.hasFeature.mockImplementation((k) => k === 'storefront');
    await renderLayout();
    expect(screen.getByText('Online store')).toBeInTheDocument();
    expect(screen.getByText('Store orders')).toBeInTheDocument();
  });
});
