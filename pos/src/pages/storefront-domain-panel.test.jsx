import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api', () => ({
  api: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  apiError: (e) => e?.message,
}));

const sf = {
  getDomain: vi.fn(),
  addDomain: vi.fn(),
  verifyDomain: vi.fn(),
  removeDomain: vi.fn(),
};
vi.mock('@/lib/services', () => ({ storefrontServices: sf }));

let feature = true;
vi.mock('@/auth/auth-context', () => ({
  useAuth: () => ({ hasFeature: (k) => (k === 'custom_domain' ? feature : false) }),
}));

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  feature = true;
  Object.values(sf).forEach((f) => f.mockReset());
  sf.getDomain.mockResolvedValue({ data: { data: null } });
  sf.addDomain.mockResolvedValue({ data: { data: {} } });
  sf.verifyDomain.mockResolvedValue({ data: { data: { status: 'pending', failureReason: 'x' } } });
});

describe('CustomDomainPanel', () => {
  it('renders nothing without the custom_domain feature', async () => {
    feature = false;
    const { CustomDomainPanel } = await import('./storefront-domain-panel');
    const { container } = wrap(<CustomDomainPanel storeIsLive />);
    expect(container).toBeEmptyDOMElement();
  });

  it('nudges the pharmacy to go live before offering a domain', async () => {
    const { CustomDomainPanel } = await import('./storefront-domain-panel');
    wrap(<CustomDomainPanel storeIsLive={false} />);
    expect(await screen.findByText(/make your store live first/i)).toBeInTheDocument();
    expect(sf.getDomain).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('adds a domain when the store is live and none is set', async () => {
    const user = userEvent.setup();
    const { CustomDomainPanel } = await import('./storefront-domain-panel');
    wrap(<CustomDomainPanel storeIsLive />);

    const box = await screen.findByRole('textbox');
    await user.type(box, 'noorpharmacy.pk');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(sf.addDomain).toHaveBeenCalledWith('noorpharmacy.pk');
  });

  it('shows DNS records + "Check now" for a pending domain', async () => {
    sf.getDomain.mockResolvedValue({
      data: {
        data: {
          domain: 'noorpharmacy.pk',
          status: 'pending',
          failureReason: 'verification TXT record not found yet',
          records: [
            { type: 'TXT', host: 'noorpharmacy.pk', value: 'medpos-verify=abc' },
            { type: 'A', host: 'noorpharmacy.pk', value: 'cname.medpos.app' },
          ],
        },
      },
    });
    const user = userEvent.setup();
    const { CustomDomainPanel } = await import('./storefront-domain-panel');
    wrap(<CustomDomainPanel storeIsLive />);

    expect(await screen.findByText('medpos-verify=abc')).toBeInTheDocument();
    expect(screen.getByText(/TXT record not found/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /check now/i }));
    expect(sf.verifyDomain).toHaveBeenCalled();
  });
});
