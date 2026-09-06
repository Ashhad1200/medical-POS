import { useQuery } from '@tanstack/react-query';
import { Building2, CircleDollarSign, Gauge, ShoppingBag } from 'lucide-react';
import { supplierPortalServices } from '@/lib/services';
import { int, money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
          {hint != null && (
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SupplierAnalyticsPage() {
  const q = useQuery({
    queryKey: ['supplier', 'analytics'],
    queryFn: async () => (await supplierPortalServices.analytics()).data.data,
  });
  const d = q.data;

  return (
    <>
      <PageHeader title="Analytics" description="Your B2B order performance." />

      {q.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={ShoppingBag} label="Orders" value={int(d?.totals?.orders)} />
            <Stat
              icon={CircleDollarSign}
              label="Revenue"
              value={money(d?.totals?.revenue)}
            />
            <Stat
              icon={Building2}
              label="Pharmacies"
              value={int(d?.totals?.pharmacies)}
            />
            <Stat
              icon={Gauge}
              label="Fill rate"
              value={d?.fillRate == null ? '—' : `${d.fillRate}%`}
              hint="received vs ordered qty"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <div className="mb-3 text-sm font-semibold text-foreground">
                  Top pharmacies by revenue
                </div>
                {d?.topPharmacies?.length ? (
                  <div className="space-y-2">
                    {d.topPharmacies.map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">
                          {int(p.orders)} orders · {money(p.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No orders yet.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-3 text-sm font-semibold text-foreground">
                  Orders by status
                </div>
                <div className="space-y-2">
                  {Object.entries(d?.statusBreakdown || {}).map(([s, n]) => (
                    <div key={s} className="flex justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{s}</span>
                      <span>{int(n)}</span>
                    </div>
                  ))}
                  {Object.keys(d?.statusBreakdown || {}).length === 0 && (
                    <div className="text-sm text-muted-foreground">Nothing yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
