import { describe, it, expect } from 'vitest';
import {
  cartReducer,
  emptyCart,
  cartCount,
  cartSubtotal,
  belowMinimum,
  type CartState,
} from './cart';
import type { StoreProduct } from './storefront';

const P = (over: Partial<StoreProduct> = {}): StoreProduct => ({
  id: 'p1',
  name: 'Paracetamol',
  genericName: null,
  manufacturer: 'GSK',
  category: 'tablet',
  packSize: null,
  price: 30,
  available: 5,
  ...over,
});

const withLine = (over: Partial<CartState['lines'][0]> = {}): CartState => ({
  slug: 's',
  lines: [{ productId: 'p1', name: 'Paracetamol', price: 30, available: 5, quantity: 1, ...over }],
});

describe('cartReducer', () => {
  it('init discards a cart persisted for a different store', () => {
    const other: CartState = { slug: 'other', lines: [{ productId: 'x', name: 'x', price: 1, available: 1, quantity: 1 }] };
    expect(cartReducer(emptyCart, { type: 'init', slug: 's', state: other })).toEqual({ slug: 's', lines: [] });
  });

  it('init keeps a cart for the same store', () => {
    const same = withLine();
    expect(cartReducer(emptyCart, { type: 'init', slug: 's', state: same })).toEqual(same);
  });

  it('add appends a new line, then merges quantity, capped at available', () => {
    let s = cartReducer({ slug: 's', lines: [] }, { type: 'add', product: P() });
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0].quantity).toBe(1);
    for (let i = 0; i < 10; i++) s = cartReducer(s, { type: 'add', product: P() });
    expect(s.lines[0].quantity).toBe(5); // capped
  });

  it('setQty caps at available and removes the line at 0', () => {
    const s = withLine({ quantity: 2 });
    expect(cartReducer(s, { type: 'setQty', productId: 'p1', quantity: 99 }).lines[0].quantity).toBe(5);
    expect(cartReducer(s, { type: 'setQty', productId: 'p1', quantity: 0 }).lines).toHaveLength(0);
  });

  it('remove and clear', () => {
    const s = withLine({ quantity: 3 });
    expect(cartReducer(s, { type: 'remove', productId: 'p1' }).lines).toHaveLength(0);
    expect(cartReducer(s, { type: 'clear' }).lines).toHaveLength(0);
  });
});

describe('cart selectors', () => {
  it('count and subtotal', () => {
    const s = withLine({ quantity: 3 });
    expect(cartCount(s)).toBe(3);
    expect(cartSubtotal(s)).toBe(90);
  });

  it('belowMinimum boundary is exclusive', () => {
    const s = withLine({ quantity: 3 }); // subtotal 90
    expect(belowMinimum(s, 90)).toBe(false);
    expect(belowMinimum(s, 91)).toBe(true);
  });
});
