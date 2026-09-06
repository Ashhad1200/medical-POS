import type { StoreProduct } from './storefront';

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  available: number;
  quantity: number;
};

export type CartState = { slug: string | null; lines: CartLine[] };

export type CartAction =
  | { type: 'init'; slug: string; state?: CartState }
  | { type: 'add'; product: StoreProduct }
  | { type: 'setQty'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

export const emptyCart: CartState = { slug: null, lines: [] };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'init':
      // A cart persisted for a different store is discarded.
      if (action.state && action.state.slug === action.slug) return action.state;
      return { slug: action.slug, lines: [] };

    case 'add': {
      const p = action.product;
      const existing = state.lines.find((l) => l.productId === p.id);
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((l) =>
            l.productId === p.id
              ? { ...l, quantity: Math.min(l.quantity + 1, l.available) }
              : l,
          ),
        };
      }
      return {
        ...state,
        lines: [
          ...state.lines,
          {
            productId: p.id,
            name: p.name,
            price: p.price,
            available: p.available,
            quantity: 1,
          },
        ],
      };
    }

    case 'setQty': {
      const q = Math.max(0, Math.floor(action.quantity));
      return {
        ...state,
        lines: state.lines
          .map((l) =>
            l.productId === action.productId
              ? { ...l, quantity: Math.min(q, l.available) }
              : l,
          )
          .filter((l) => l.quantity > 0),
      };
    }

    case 'remove':
      return {
        ...state,
        lines: state.lines.filter((l) => l.productId !== action.productId),
      };

    case 'clear':
      return { ...state, lines: [] };

    default:
      return state;
  }
}

export const cartCount = (s: CartState) =>
  s.lines.reduce((n, l) => n + l.quantity, 0);

export const cartSubtotal = (s: CartState) =>
  s.lines.reduce((n, l) => n + l.price * l.quantity, 0);

export const belowMinimum = (s: CartState, minOrder: number) =>
  cartSubtotal(s) < minOrder;
