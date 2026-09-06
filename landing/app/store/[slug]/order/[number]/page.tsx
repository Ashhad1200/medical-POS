'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getOrderStatus } from '@/lib/storefront';

const STEPS = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];

export default function OrderStatusPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number } = use(params);
  const [phone, setPhone] = useState('');
  const [data, setData] = useState<Awaited<ReturnType<typeof getOrderStatus>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await getOrderStatus(slug, number, phone));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not found');
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  const idx = data ? STEPS.indexOf(data.status) : -1;

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Link href={`/store/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to store
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Track order {number}</h1>

      {!data && (
        <div className="mt-6 space-y-3">
          <Input
            placeholder="Phone used on the order"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={lookup} disabled={busy || !phone}>
            {busy ? 'Checking…' : 'Check status'}
          </Button>
        </div>
      )}

      {data && (
        <div className="mt-6 space-y-4">
          {data.status === 'cancelled' ? (
            <p className="text-destructive">This order was cancelled.</p>
          ) : (
            <ol className="space-y-2">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  className={
                    i <= idx ? 'font-medium text-foreground' : 'text-muted-foreground'
                  }
                >
                  {i <= idx ? '●' : '○'} {s.replace(/_/g, ' ')}
                </li>
              ))}
            </ol>
          )}
          <div className="text-sm text-muted-foreground">
            Total Rs {data.total} · payment {data.payment_status}
            {data.rider_name ? ` · rider ${data.rider_name}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}
