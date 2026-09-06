'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
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
  storeView,
  type PaymentInit,
  type PlacedOrder,
  type Store,
  type StoreBanner,
  type StoreProduct,
} from '@/lib/storefront';

/* ---------- helpers ---------------------------------------------------- */

const money = (n: number) =>
  `Rs ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)}`;

const key = (slug: string) => `medpos_cart_${slug}`;

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

function bannerBg(b: StoreBanner): React.CSSProperties {
  if (b.bgStyle === 'image' && b.bgValue)
    return {
      backgroundImage: `linear-gradient(120deg, rgba(0,45,38,.72), rgba(0,45,38,.35)), url(${b.bgValue})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  if (b.bgStyle === 'gradient' && b.bgValue) {
    const [from, to] = b.bgValue.split(',').map((s) => s.trim());
    return { backgroundImage: `linear-gradient(130deg, ${from}, ${to || from})` };
  }
  return {
    backgroundImage:
      'linear-gradient(130deg, var(--sf-primary-strong), var(--sf-primary), var(--sf-secondary))',
  };
}

/* pill / capsule glyph used as a clean product placeholder */
function PillTile({ label }: { label: string }) {
  const hue =
    label.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="flex h-40 items-center justify-center rounded-lg"
      style={{ background: `hsl(${hue} 40% 96%)` }}
    >
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x="2.5"
          y="8"
          width="19"
          height="8"
          rx="4"
          stroke={`hsl(${hue} 45% 42%)`}
          strokeWidth="1.6"
        />
        <path d="M12 8v8" stroke={`hsl(${hue} 45% 42%)`} strokeWidth="1.6" />
      </svg>
    </div>
  );
}

/* ---------- product card -------------------------------------------------- */

function ProductCard({
  p,
  onAdd,
  inCart,
}: {
  p: StoreProduct;
  onAdd: () => void;
  inCart: number;
}) {
  const out = p.available <= 0;
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--sf-outline)] bg-[var(--sf-surface)] transition-shadow hover:shadow-[0_6px_24px_-8px_rgba(37,75,98,.18)]">
      <div className="flex items-center justify-between px-3 pt-3">
        <span className="rounded bg-[var(--sf-surface-mid)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--sf-primary-strong)]">
          {p.category || 'OTC'}
        </span>
        {p.discountPct ? (
          <span className="rounded bg-[var(--sf-error-container)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#8a1112]">
            {p.discountPct}% OFF
          </span>
        ) : (
          <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--sf-on-variant)]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: out ? 'var(--sf-error)' : 'var(--sf-primary)' }}
            />
            {out ? 'Out' : 'In stock'}
          </span>
        )}
      </div>

      <div className="px-3 pt-2">
        <PillTile label={p.name} />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-3">
        <div>
          <h3 className="font-head text-[15px] font-bold leading-tight text-[var(--sf-on)]">
            {p.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-[var(--sf-on-variant)]">
            {p.genericName || p.manufacturer}
            {p.packSize ? ` · ${p.packSize}` : ''}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold text-[var(--sf-primary-strong)]">
              {money(p.price)}
            </span>
            {p.originalPrice != null && (
              <span className="font-mono text-xs text-[var(--sf-on-variant)] line-through">
                {money(p.originalPrice)}
              </span>
            )}
          </div>
          <button
            disabled={out}
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--sf-primary)] py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--sf-primary-strong)] disabled:opacity-40"
          >
            {inCart > 0 ? (
              <>
                <Check size={15} /> In cart ({inCart})
              </>
            ) : (
              <>
                <Plus size={15} /> Add to cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- main -------------------------------------------------------- */

export default function StoreClient({
  slug,
  store,
  products,
  banners = [],
  featured = [],
}: {
  slug: string;
  store: Store;
  products: StoreProduct[];
  banners?: StoreBanner[];
  featured?: string[];
}) {
  const [cart, dispatch] = useReducer(cartReducer, emptyCart);
  const [drawer, setDrawer] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    paymentMethod: store.codEnabled
      ? 'cod'
      : store.payInStoreEnabled
        ? 'in_store'
        : 'online',
  });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PlacedOrder | null>(null);

  const view = storeView({ products, banners, featured });
  const hero = view.banners[0];
  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.category).filter(Boolean)),
      ) as string[],
    [products],
  );
  const qtyOf = (id: string) =>
    cart.lines.find((l) => l.productId === id)?.quantity ?? 0;

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

  const add = (p: StoreProduct) => {
    dispatch({ type: 'add', product: p });
    setDrawer(true);
  };

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
        redirectToGateway(res.payment);
        return;
      }
      setDone(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  const accentStyle = {
    '--sf-bg': '#f4faff',
    '--sf-surface': '#ffffff',
    '--sf-surface-low': '#e7f6ff',
    '--sf-surface-mid': '#def1fb',
    '--sf-surface-high': '#d9ebf5',
    '--sf-on': '#0c1e25',
    '--sf-on-variant': '#3e4946',
    '--sf-outline': '#d3e0e6',
    '--sf-primary': store.accentColor || '#0d7a68',
    '--sf-primary-strong': store.accentColor || '#005f50',
    '--sf-on-primary': '#ffffff',
    '--sf-secondary': '#254b62',
    '--sf-tertiary': '#0284c7',
    '--sf-error': '#ba1a1a',
    '--sf-error-container': '#ffdad6',
  } as React.CSSProperties;

  /* ---------- success screen ---------- */
  if (done) {
    return (
      <div
        style={accentStyle}
        className="flex min-h-screen flex-col items-center justify-center bg-[var(--sf-bg)] px-6 text-center"
      >
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=JetBrains+Mono:wght@500;600&display=swap"
        />
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--sf-primary)] text-white">
          <Check size={30} />
        </div>
        <h1 className="mt-4 font-head text-2xl font-bold text-[var(--sf-on)]">
          Order confirmed
        </h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--sf-on-variant)]">
          Order <span className="font-mono font-semibold">{done.orderNumber}</span>{' '}
          · total {money(done.total)}. We&apos;ll call {form.phone} to confirm
          dispatch.
        </p>
        <div className="mt-5 flex gap-3">
          <Link
            href={`/store/${slug}/order/${done.orderNumber}?phone=${encodeURIComponent(form.phone)}`}
            className="rounded-lg bg-[var(--sf-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sf-primary-strong)]"
          >
            Track this order
          </Link>
          <button
            onClick={() => {
              setDone(null);
              setCheckout(false);
            }}
            className="rounded-lg border border-[var(--sf-outline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--sf-secondary)]"
          >
            Back to store
          </button>
        </div>
      </div>
    );
  }

  /* ---------- storefront ---------- */
  return (
    <div
      style={accentStyle}
      className="min-h-screen bg-[var(--sf-bg)] font-sans text-[var(--sf-on)]"
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=JetBrains+Mono:wght@500;600&display=swap"
      />
      <style>{`
        .font-head{font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif;letter-spacing:-.01em}
        .font-mono{font-family:'JetBrains Mono',ui-monospace,monospace}
      `}</style>

      {/* utility bar */}
      <div className="bg-[var(--sf-secondary)] px-4 py-1.5 text-center text-xs text-[#e1f3fe]">
        <span className="inline-flex items-center gap-1.5">
          <Truck size={13} /> Orders before 6 PM dispatched same-day across the
          city
        </span>
      </div>

      {/* header */}
      <header className="sticky top-0 z-40 border-b border-[var(--sf-outline)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            {store.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt={store.displayName} className="h-9 w-auto" />
            )}
            <div className="leading-tight">
              <div className="font-head text-lg font-bold text-[var(--sf-primary-strong)]">
                {store.displayName}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--sf-secondary)]">
                Licensed E-Pharmacy
              </div>
            </div>
          </div>
          <button
            onClick={() => setDrawer(true)}
            className="relative flex items-center gap-2 rounded-lg bg-[var(--sf-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sf-primary-strong)]"
          >
            <ShoppingBag size={16} />
            <span className="hidden sm:inline">Cart</span>
            <span className="font-mono">{cartCount(cart)}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* regulatory strip */}
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-[var(--sf-surface-high)] px-4 py-2.5 font-mono text-[11px] tracking-wide">
          <span className="inline-flex items-center gap-1.5 font-bold uppercase text-[var(--sf-primary-strong)]">
            <ShieldCheck size={14} /> OTC dispensary · verified inventory
          </span>
          <span className="text-[var(--sf-on-variant)]">
            Delivery {money(store.deliveryFee)}
            {store.minOrder > 0 && ` · min order ${money(store.minOrder)}`}
          </span>
        </div>

        {/* hero */}
        {hero ? (
          <section
            className="relative mb-8 overflow-hidden rounded-2xl p-8 text-white sm:p-12"
            style={bannerBg(hero)}
          >
            <div className="pointer-events-none absolute -right-16 -bottom-16 opacity-10">
              <svg width="240" height="240" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 10.5V8H14V3H10V8H5V10.5H10V15.5H5V18H10V23H14V18H19V15.5H14V10.5H19Z" />
              </svg>
            </div>
            <div className="relative max-w-xl">
              {hero.headline && (
                <h1 className="font-head text-3xl font-bold sm:text-4xl">
                  {hero.headline}
                </h1>
              )}
              {hero.subheadline && (
                <p className="mt-3 text-white/85">{hero.subheadline}</p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {view.deals.length > 0 && (
                  <a
                    href="#deals"
                    className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[var(--sf-primary-strong)]"
                  >
                    See today&apos;s deals
                  </a>
                )}
                <button
                  onClick={() => setDrawer(true)}
                  className="rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur hover:bg-white/25"
                >
                  View cart ({cartCount(cart)})
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section
            className="mb-8 rounded-2xl p-8 text-white"
            style={{
              backgroundImage:
                'linear-gradient(130deg, var(--sf-primary-strong), var(--sf-primary), var(--sf-secondary))',
            }}
          >
            <h1 className="font-head text-3xl font-bold">{store.displayName}</h1>
            <p className="mt-2 text-white/85">
              OTC medicines &amp; wellness essentials, delivered.
            </p>
          </section>
        )}

        {/* categories */}
        {categories.length > 1 && (
          <section className="mb-10">
            <h2 className="mb-3 font-head text-lg font-bold">Browse by category</h2>
            <div className="flex flex-wrap gap-2">
              <a
                href="#catalogue"
                className="rounded-full border border-[var(--sf-outline)] bg-white px-4 py-1.5 text-sm font-medium hover:border-[var(--sf-primary)]"
              >
                All
              </a>
              {categories.map((c) => (
                <a
                  key={c}
                  href="#catalogue"
                  className="rounded-full border border-[var(--sf-outline)] bg-white px-4 py-1.5 text-sm font-medium capitalize hover:border-[var(--sf-primary)]"
                >
                  {c}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* deals */}
        {view.deals.length > 0 && (
          <section id="deals" className="mb-10">
            <div className="mb-4">
              <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--sf-error)]">
                Limited-time pricing
              </div>
              <h2 className="font-head text-xl font-bold">Today&apos;s deals</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {view.deals.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  inCart={qtyOf(p.id)}
                  onAdd={() => add(p)}
                />
              ))}
            </div>
          </section>
        )}

        {/* featured */}
        {view.featuredProducts.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 font-head text-xl font-bold">Featured</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {view.featuredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  inCart={qtyOf(p.id)}
                  onAdd={() => add(p)}
                />
              ))}
            </div>
          </section>
        )}

        {/* full catalogue */}
        <section id="catalogue">
          <h2 className="mb-4 font-head text-xl font-bold">All medications</h2>
          {products.length === 0 ? (
            <p className="text-sm text-[var(--sf-on-variant)]">
              Nothing in stock right now — check back soon.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  inCart={qtyOf(p.id)}
                  onAdd={() => add(p)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 border-t border-[var(--sf-outline)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-[var(--sf-on-variant)]">
          <div className="font-head text-base font-bold text-[var(--sf-primary-strong)]">
            {store.displayName}
          </div>
          <p className="mt-1 max-w-md">
            Licensed retail pharmacy. OTC items only — prescription medicines are
            dispensed in person against a valid prescription.
          </p>
          <p className="mt-4 font-mono">
            © {new Date().getFullYear()} {store.displayName} · Real-time stock
          </p>
        </div>
      </footer>

      {/* cart drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-[#0f172a]/45"
            onClick={() => setDrawer(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[var(--sf-surface-low)] px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[var(--sf-primary)] p-1.5 text-white">
                  <ShoppingBag size={16} />
                </span>
                <h3 className="font-head font-bold">Cart &amp; checkout</h3>
              </div>
              <button
                onClick={() => setDrawer(false)}
                className="rounded p-1 text-[var(--sf-on-variant)] hover:bg-[var(--sf-surface-high)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {cart.lines.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--sf-on-variant)]">
                  Your cart is empty.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--sf-secondary)]">
                      {cartCount(cart)} item(s)
                    </span>
                    <button
                      onClick={() => dispatch({ type: 'clear' })}
                      className="font-mono text-[11px] text-[var(--sf-error)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>

                  {cart.lines.map((l) => (
                    <div
                      key={l.productId}
                      className="flex items-center gap-3 rounded-lg bg-[var(--sf-surface-low)] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{l.name}</div>
                        <div className="font-mono text-xs text-[var(--sf-primary-strong)]">
                          {money(l.price)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          aria-label="decrease"
                          onClick={() =>
                            dispatch({
                              type: 'setQty',
                              productId: l.productId,
                              quantity: l.quantity - 1,
                            })
                          }
                          className="rounded border border-[var(--sf-outline)] p-1"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center font-mono text-sm">
                          {l.quantity}
                        </span>
                        <button
                          aria-label="increase"
                          onClick={() =>
                            dispatch({
                              type: 'setQty',
                              productId: l.productId,
                              quantity: l.quantity + 1,
                            })
                          }
                          className="rounded border border-[var(--sf-outline)] p-1"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        aria-label="remove"
                        onClick={() =>
                          dispatch({ type: 'remove', productId: l.productId })
                        }
                        className="text-[var(--sf-on-variant)] hover:text-[var(--sf-error)]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  <div className="space-y-1 border-t border-[var(--sf-outline)] pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--sf-on-variant)]">Subtotal</span>
                      <span className="font-mono">{money(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--sf-on-variant)]">Delivery</span>
                      <span className="font-mono">{money(store.deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between pt-1 font-head font-bold">
                      <span>Total</span>
                      <span className="font-mono">{money(total)}</span>
                    </div>
                    {tooLow && (
                      <p className="pt-1 text-xs text-[var(--sf-error)]">
                        Minimum order is {money(store.minOrder)}.
                      </p>
                    )}
                  </div>

                  {!checkout ? (
                    <button
                      disabled={tooLow}
                      onClick={() => setCheckout(true)}
                      className="w-full rounded-lg bg-[var(--sf-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--sf-primary-strong)] disabled:opacity-40"
                    >
                      Checkout
                    </button>
                  ) : (
                    <div className="space-y-2.5">
                      {(
                        [
                          ['name', 'Full name'],
                          ['phone', 'Phone'],
                          ['address', 'Delivery address'],
                          ['city', 'City'],
                        ] as const
                      ).map(([k, ph]) => (
                        <input
                          key={k}
                          placeholder={ph}
                          value={form[k]}
                          onChange={(e) =>
                            setForm({ ...form, [k]: e.target.value })
                          }
                          className="h-10 w-full rounded-lg border border-[var(--sf-outline)] bg-white px-3 text-sm outline-none focus:border-[var(--sf-primary)] focus:ring-2 focus:ring-[var(--sf-primary)]/15"
                        />
                      ))}
                      <select
                        value={form.paymentMethod}
                        onChange={(e) =>
                          setForm({ ...form, paymentMethod: e.target.value })
                        }
                        className="h-10 w-full rounded-lg border border-[var(--sf-outline)] bg-white px-3 text-sm"
                      >
                        {store.codEnabled && (
                          <option value="cod">Cash on delivery</option>
                        )}
                        {store.payInStoreEnabled && (
                          <option value="in_store">Pay in store</option>
                        )}
                        {store.onlineEnabled && (
                          <option value="online">Pay online</option>
                        )}
                      </select>
                      {error && (
                        <p className="text-xs text-[var(--sf-error)]">{error}</p>
                      )}
                      <button
                        disabled={
                          placing ||
                          tooLow ||
                          !form.name ||
                          !form.phone ||
                          !form.address
                        }
                        onClick={submit}
                        className="w-full rounded-lg bg-[var(--sf-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--sf-primary-strong)] disabled:opacity-40"
                      >
                        {placing ? 'Placing…' : `Place order · ${money(total)}`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
