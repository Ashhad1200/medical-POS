import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStore, placeOrder, getOrderStatus, storeView } from './storefront';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const res = (status: number, body: unknown, ok?: boolean) => ({
  ok: ok ?? (status >= 200 && status < 300),
  status,
  json: async () => body,
});

beforeEach(() => mockFetch.mockReset());

describe('getStore', () => {
  it('returns the payload on 200', async () => {
    mockFetch.mockResolvedValue(
      res(200, { data: { store: { slug: 's' }, products: [] } }),
    );
    const out = await getStore('s');
    expect(out?.store.slug).toBe('s');
    expect(mockFetch.mock.calls[0][0]).toMatch(/\/public\/storefront\/s$/);
  });

  it('returns null on 404 (unknown / not live)', async () => {
    mockFetch.mockResolvedValue(res(404, {}));
    expect(await getStore('nope')).toBeNull();
  });
});

describe('placeOrder', () => {
  const input = {
    customer: { name: 'A', phone: '1', address: 'x' },
    paymentMethod: 'cod' as const,
    items: [{ productId: 'p1', quantity: 2 }],
  };

  it('POSTs the cart and returns the placed order', async () => {
    mockFetch.mockResolvedValue(
      res(201, { success: true, data: { orderNumber: 'SF-9', total: 110 } }),
    );
    const out = await placeOrder('s', input);
    expect(out.orderNumber).toBe('SF-9');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/public\/storefront\/s\/order$/);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body).items[0]).toEqual({ productId: 'p1', quantity: 2 });
  });

  it('returns the payment init block for an online order', async () => {
    mockFetch.mockResolvedValue(
      res(201, {
        success: true,
        data: {
          orderNumber: 'SF-10',
          total: 110,
          paymentStatus: 'unpaid',
          payment: {
            provider: 'jazzcash',
            ref: 'T123',
            redirectUrl: 'https://sandbox.jazzcash.com.pk/x',
            fields: { pp_TxnRefNo: 'T123' },
          },
        },
      }),
    );
    const out = await placeOrder('s', { ...input, paymentMethod: 'online' });
    expect(out.payment?.provider).toBe('jazzcash');
    expect(out.payment?.redirectUrl).toMatch(/^https:/);
    expect(out.paymentStatus).toBe('unpaid');
  });

  it('surfaces the server message on rejection', async () => {
    mockFetch.mockResolvedValue(
      res(400, { success: false, message: 'Minimum order is 100' }, false),
    );
    await expect(placeOrder('s', input)).rejects.toThrow(/Minimum order/);
  });
});

describe('storeView (customization view-model, 1e-d.2)', () => {
  const products = [
    { id: 'a', name: 'A', price: 80, originalPrice: 100, discountPct: 20 },
    { id: 'b', name: 'B', price: 50 },
    { id: 'c', name: 'C', price: 30 },
  ] as never[];

  it('deals = products carrying a discountPct; featured resolves ids to products', () => {
    const v = storeView({
      products,
      banners: [{ headline: 'Hi' }] as never[],
      featured: ['c', 'missing'],
    });
    expect(v.deals.map((p) => p.id)).toEqual(['a']);
    expect(v.featuredProducts.map((p) => p.id)).toEqual(['c']); // unknown id dropped
    expect(v.hasCustomization).toBe(true);
  });

  it('no banners / deals / featured → hasCustomization false (plain layout)', () => {
    const v = storeView({ products: [{ id: 'b', name: 'B', price: 50 }] as never[] });
    expect(v.deals).toHaveLength(0);
    expect(v.featuredProducts).toHaveLength(0);
    expect(v.hasCustomization).toBe(false);
  });
});

describe('getOrderStatus', () => {
  it('passes the phone as a query param', async () => {
    mockFetch.mockResolvedValue(
      res(200, { success: true, data: { order_number: 'SF-9', status: 'placed' } }),
    );
    const out = await getOrderStatus('s', 'SF-9', '0300 111');
    expect(out.status).toBe('placed');
    expect(mockFetch.mock.calls[0][0]).toContain('phone=0300%20111');
  });

  it('throws when the phone does not match (404)', async () => {
    mockFetch.mockResolvedValue(res(404, { success: false, message: 'Order not found' }, false));
    await expect(getOrderStatus('s', 'SF-9', 'wrong')).rejects.toThrow(/not found/i);
  });
});
