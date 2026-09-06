import { apiUrl } from '@/config/site';

export type StoreProduct = {
  id: string;
  name: string;
  genericName: string | null;
  manufacturer: string;
  category: string | null;
  packSize: string | null;
  price: number;
  available: number;
};

export type Store = {
  slug: string;
  displayName: string;
  logoUrl: string | null;
  theme: Record<string, unknown>;
  deliveryFee: number;
  minOrder: number;
  codEnabled: boolean;
  payInStoreEnabled: boolean;
  onlineEnabled: boolean;
};

export type StorePayload = { store: Store; products: StoreProduct[] };

export async function getStore(slug: string): Promise<StorePayload | null> {
  const res = await fetch(`${apiUrl}/public/storefront/${slug}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load store');
  return (await res.json()).data as StorePayload;
}

export type PlaceOrderInput = {
  customer: { name: string; phone: string; address: string; city?: string };
  paymentMethod: 'cod' | 'in_store' | 'online';
  items: { productId: string; quantity: number }[];
  notes?: string;
};

export type PaymentInit = {
  provider: string;
  ref: string;
  redirectUrl: string;
  fields: Record<string, string>;
};

export type PlacedOrder = {
  orderNumber: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  paymentStatus?: string;
  payment?: PaymentInit;
};

export async function placeOrder(
  slug: string,
  input: PlaceOrderInput,
): Promise<PlacedOrder> {
  const res = await fetch(`${apiUrl}/public/storefront/${slug}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || 'Order failed');
  return json.data as PlacedOrder;
}

export async function getOrderStatus(
  slug: string,
  orderNumber: string,
  phone: string,
) {
  const res = await fetch(
    `${apiUrl}/public/storefront/${slug}/order/${orderNumber}?phone=${encodeURIComponent(phone)}`,
    { cache: 'no-store' },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || 'Order not found');
  return json.data as {
    order_number: string;
    status: string;
    payment_status: string;
    total: string | number;
    placed_at: string;
    rider_name: string | null;
  };
}
