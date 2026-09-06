'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CircleCheck,
  Clock,
  PackageCheck,
  Truck,
  X,
} from 'lucide-react';
import { getOrderStatus } from '@/lib/storefront';

const STEPS = [
  { key: 'placed', label: 'Order placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed by pharmacy', icon: CircleCheck },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: PackageCheck },
] as const;

const money = (n: number | string) =>
  `Rs ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(n) || 0)}`;

const SF: React.CSSProperties = {
  ['--sf-bg' as string]: '#f4faff',
  ['--sf-surface' as string]: '#ffffff',
  ['--sf-surface-low' as string]: '#e7f6ff',
  ['--sf-on' as string]: '#0c1e25',
  ['--sf-on-variant' as string]: '#3e4946',
  ['--sf-outline' as string]: '#d3e0e6',
  ['--sf-primary' as string]: '#0d7a68',
  ['--sf-primary-strong' as string]: '#005f50',
  ['--sf-secondary' as string]: '#254b62',
  ['--sf-error' as string]: '#ba1a1a',
};

export default function OrderStatusPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number } = use(params);
  const [phone, setPhone] = useState('');
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getOrderStatus>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (p = phone) => {
    setBusy(true);
    setError(null);
    try {
      setData(await getOrderStatus(slug, number, p));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not found');
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('phone');
    if (p) {
      setPhone(p);
      lookup(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelled = data?.status === 'cancelled';
  const idx = data ? STEPS.findIndex((s) => s.key === data.status) : -1;

  return (
    <div style={SF} className="min-h-screen bg-[var(--sf-bg)] text-[var(--sf-on)]">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=JetBrains+Mono:wght@500;600&display=swap"
      />
      <style>{`
        .font-head{font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif;letter-spacing:-.01em}
        .font-mono{font-family:'JetBrains Mono',ui-monospace,monospace}
      `}</style>

      <div className="bg-[var(--sf-secondary)] px-4 py-1.5 text-center font-mono text-[11px] uppercase tracking-widest text-[#e1f3fe]">
        Order tracking
      </div>

      <div className="mx-auto max-w-lg px-4 py-10">
        <Link
          href={`/store/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--sf-secondary)] hover:text-[var(--sf-on)]"
        >
          <ArrowLeft size={15} /> Back to store
        </Link>

        <h1 className="mt-3 font-head text-2xl font-bold">Track order</h1>
        <p className="font-mono text-sm text-[var(--sf-on-variant)]">{number}</p>

        {!data && (
          <div className="mt-6 space-y-3 rounded-xl border border-[var(--sf-outline)] bg-[var(--sf-surface)] p-5">
            <label className="text-sm font-medium">
              Phone used on the order
            </label>
            <input
              placeholder="03xx xxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--sf-outline)] bg-white px-3 text-sm outline-none focus:border-[var(--sf-primary)] focus:ring-2 focus:ring-[var(--sf-primary)]/15"
            />
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-[var(--sf-error)]">
                <X size={14} /> {error}
              </p>
            )}
            <button
              onClick={() => lookup()}
              disabled={busy || !phone}
              className="w-full rounded-lg bg-[var(--sf-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--sf-primary-strong)] disabled:opacity-40"
            >
              {busy ? 'Checking…' : 'Check status'}
            </button>
          </div>
        )}

        {data && (
          <div className="mt-6 space-y-5">
            {data.payment_status === 'paid' && (
              <div className="flex items-center gap-2 rounded-lg bg-[#e7f6ff] px-4 py-2.5 text-sm font-medium text-[var(--sf-primary-strong)]">
                <Check size={16} /> Payment received — thank you.
              </div>
            )}

            <div className="rounded-xl border border-[var(--sf-outline)] bg-[var(--sf-surface)] p-5">
              {cancelled ? (
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--sf-error)]">
                  <X size={16} /> This order was cancelled.
                </div>
              ) : (
                <ol className="relative space-y-5">
                  {STEPS.map((s, i) => {
                    const on = i <= idx;
                    const Icon = s.icon;
                    return (
                      <li key={s.key} className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: on
                              ? 'var(--sf-primary)'
                              : 'var(--sf-surface-low)',
                            color: on ? '#fff' : 'var(--sf-on-variant)',
                          }}
                        >
                          <Icon size={16} />
                        </span>
                        <span
                          className={
                            on
                              ? 'text-sm font-semibold'
                              : 'text-sm text-[var(--sf-on-variant)]'
                          }
                        >
                          {s.label}
                        </span>
                        {i === idx && (
                          <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--sf-primary-strong)]">
                            current
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-sm">
              <div className="rounded-lg border border-[var(--sf-outline)] bg-[var(--sf-surface)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--sf-on-variant)]">
                  Total
                </div>
                <div className="mt-0.5 font-bold text-[var(--sf-primary-strong)]">
                  {money(data.total)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--sf-outline)] bg-[var(--sf-surface)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--sf-on-variant)]">
                  Payment
                </div>
                <div className="mt-0.5 font-bold capitalize">
                  {data.payment_status}
                </div>
              </div>
              {data.rider_name && (
                <div className="col-span-2 rounded-lg border border-[var(--sf-outline)] bg-[var(--sf-surface)] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--sf-on-variant)]">
                    Rider
                  </div>
                  <div className="mt-0.5 font-bold">{data.rider_name}</div>
                </div>
              )}
            </div>

            <button
              onClick={() => lookup()}
              className="w-full rounded-lg border border-[var(--sf-outline)] bg-white py-2 text-sm font-semibold text-[var(--sf-secondary)] hover:bg-[var(--sf-surface-low)]"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
