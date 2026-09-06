'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  cartReducer,
  emptyCart,
  cartCount,
  cartSubtotal,
  belowMinimum,
  type CartState,
} from '@/lib/cart';
import {
  placeOrder,
  type PaymentInit,
  type PlacedOrder,
  type Store,
  type StoreProduct,
} from '@/lib/storefront';

const money = (n: number) =>
  `Rs ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)}`;

const key = (slug: string) => `medpos_cart_${slug}`;

// JazzCash Page-Redirection: POST the signed fields to the gateway.
function redirectToGateway(payment: PaymentInit) {
  const f = document.createElement('form');
  f.method = 'POST';
  f.action = payment.redirectUrl;
  for (const [k, v] of Object.entries(payment.fields || {})) {
    const i = document.createElement('input');
    i.type = 'hidden';
    i.name = k;
    i.value = String(v);
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}

export default function StoreClient({
  slug,
  store,
  products,
}: {
  slug: string;
  store: Store;
  products: StoreProduct[];
}) {
  const [cart, dispatch] = useReducer(cartReducer, emptyCart);
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    paymentMethod: store.codEnabled ? 'cod' : 'in_store',
  });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PlacedOrder | null>(null);

  // hydrate + persist cart
  useEffect(() => {
    let persisted: CartState | undefined;
    try {
      const raw = localStorage.getItem(key(slug));
      if (raw) persisted = JSON.parse(raw);
    } catch {}
    dispatch({ type: 'init', slug, state: persisted });
  }, [slug]);

  useEffect(() => {
    if (cart.slug === slug) {
      try {
        localStorage.setItem(key(slug), JSON.stringify(cart));
      } catch {}
    }
  }, [cart, slug]);

  const subtotal = useMemo(() => cartSubtotal(cart), [cart]);
  const total = subtotal + (cart.lines.length ? store.deliveryFee : 0);
  const tooLow = belowMinimum(cart, store.minOrder) && cart.lines.length > 0;

  const submit = async () => {
    setPlacing(true);
    setError(null);
    try {
      const res = await placeOrder(slug, {
        customer: {
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city || undefined,
        },
        paymentMethod: form.paymentMethod as 'cod' | 'in_store' | 'online',
        items: cart.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
      });
      dispatch({ type: 'clear' });
      try {
        localStorage.removeItem(key(slug));
      } catch {}
      if (res.payment?.redirectUrl) {
        redirectToGateway(res.payment); // leaves the page for JazzCash
        return;
      }
      setDone(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">Order placed</h1>
        <p className="mt-2 text-muted-foreground">
          Order <span className="font-medium">{done.orderNumber}</span> · total{' '}
          {money(done.total)}. We&apos;ll call {form.phone} to confirm.
        </p>
        <Link
          href={`/store/${slug}/order/${done.orderNumber}`}
          className="mt-4 inline-block text-indigo-600 hover:underline"
        >
          Track this order
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{store.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            OTC medicines · delivery {money(store.deliveryFee)}
            {store.minOrder > 0 ? ` · min order ${money(store.minOrder)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingCart className="size-4" /> {cartCount(cart)}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* products */}
        <div className="lg:col-span-2">
          {products.length === 0 ? (
            <p className="text-muted-foreground">
              Nothing in stock right now — check back soon.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.manufacturer}
                        {p.packSize ? ` · ${p.packSize}` : ''}
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {money(p.price)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dispatch({ type: 'add', product: p })}
                    >
                      Add
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* cart / checkout */}
        <Card className="h-fit lg:sticky lg:top-6">
          <CardContent className="space-y-4 p-5">
            {cart.lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Your cart is empty.
              </p>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.lines.map((l) => (
                    <div key={l.productId} className="flex items-center gap-2 text-sm">
                      <div className="min-w-0 flex-1 truncate">{l.name}</div>
                      <div className="flex items-center gap-1">
                        <button
                          aria-label="decrease"
                          className="rounded border border-border p-1"
                          onClick={() =>
                            dispatch({
                              type: 'setQty',
                              productId: l.productId,
                              quantity: l.quantity - 1,
                            })
                          }
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center">{l.quantity}</span>
                        <button
                          aria-label="increase"
                          className="rounded border border-border p-1"
                          onClick={() =>
                            dispatch({
                              type: 'setQty',
                              productId: l.productId,
                              quantity: l.quantity + 1,
                            })
                          }
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <div className="w-16 text-end">
                        {money(l.price * l.quantity)}
                      </div>
                      <button
                        aria-label="remove"
                        onClick={() =>
                          dispatch({ type: 'remove', productId: l.productId })
                        }
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{money(store.deliveryFee)}</span>
                  </div>
                  <div className="mt-1 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                  {tooLow && (
                    <p className="mt-2 text-xs text-destructive">
                      Minimum order is {money(store.minOrder)}.
                    </p>
                  )}
                </div>

                {!checkout ? (
                  <Button
                    className="w-full"
                    disabled={tooLow}
                    onClick={() => setCheckout(true)}
                  >
                    Checkout
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Input
                      placeholder="Full name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <Input
                      placeholder="Phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                    <Input
                      placeholder="Delivery address"
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    />
                    <Input
                      placeholder="City"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.paymentMethod}
                      onChange={(e) =>
                        setForm({ ...form, paymentMethod: e.target.value })
                      }
                    >
                      {store.codEnabled && (
                        <option value="cod">Cash on delivery</option>
                      )}
                      {store.payInStoreEnabled && (
                        <option value="in_store">Pay in store</option>
                      )}
                      {store.onlineEnabled && (
                        <option value="online">Pay online (JazzCash)</option>
                      )}
                    </select>
                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}
                    <Button
                      className="w-full"
                      disabled={
                        placing ||
                        tooLow ||
                        !form.name ||
                        !form.phone ||
                        !form.address
                      }
                      onClick={submit}
                    >
                      {placing ? 'Placing…' : `Place order · ${money(total)}`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
