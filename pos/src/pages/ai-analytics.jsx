import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  Boxes,
  DollarSign,
  Lightbulb,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { aiAnalyticsServices } from '@/lib/services';
import { int, money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function Stat({ icon: Icon, label, value, hint, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
  };
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
        <div className={`flex size-9 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}

const PRIORITY = { high: 'destructive', medium: 'warning', low: 'secondary' };

export function AiAnalyticsPage() {
  const kpis = useQuery({
    queryKey: ['ai', 'kpis'],
    queryFn: async () => (await aiAnalyticsServices.getKpis()).data.data,
  });
  const insights = useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: async () => (await aiAnalyticsServices.getInsights()).data.data,
  });
  const predictions = useQuery({
    queryKey: ['ai', 'predictions'],
    queryFn: async () => (await aiAnalyticsServices.getPredictions()).data.data,
  });
  const alerts = useQuery({
    queryKey: ['ai', 'alerts'],
    queryFn: async () => (await aiAnalyticsServices.getAlerts()).data.data,
  });

  const k = kpis.data;
  const maxRev = Math.max(
    1,
    ...((predictions.data?.forecast || []).map((f) => Number(f.predictedRevenue)))
  );

  return (
    <>
      <PageHeader
        title="AI analytics"
        description="Revenue, forecasts and automatic insights."
      />

      {kpis.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            icon={DollarSign}
            tone="green"
            label="Revenue this month"
            value={money(k?.revenue?.month)}
            hint={`today ${money(k?.revenue?.today)} · avg ${money(k?.revenue?.avgOrder)}`}
          />
          <Stat
            icon={ShoppingCart}
            label="Orders this week"
            value={int(k?.orders?.week)}
            hint={`${k?.orders?.completionRate ?? 0}% completion`}
          />
          <Stat
            icon={Boxes}
            tone="amber"
            label="Inventory"
            value={int(k?.inventory?.units)}
            hint={`${int(k?.inventory?.products)} products · ${int(k?.inventory?.lowStock)} low`}
          />
          <Stat
            icon={Users}
            label="Active customers"
            value={int(k?.customers?.active)}
            hint={`${int(k?.customers?.total)} total`}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* forecast */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="size-4" /> 7-day forecast
            </div>
            {predictions.data ? (
              <>
                <div className="mb-4 flex gap-6 text-sm">
                  <div>
                    <div className="text-muted-foreground">Projected sales</div>
                    <div className="text-lg font-semibold text-foreground">
                      {money(predictions.data.nextWeekSales)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Projected orders</div>
                    <div className="text-lg font-semibold text-foreground">
                      {int(predictions.data.nextWeekOrders)}
                    </div>
                  </div>
                </div>
                <div className="flex items-end gap-2" style={{ height: 140 }}>
                  {predictions.data.forecast.map((f) => (
                    <div
                      key={f.date}
                      className="flex flex-1 flex-col items-center gap-1"
                      title={`${money(f.predictedRevenue)} · ${f.confidence}% confidence`}
                    >
                      <div
                        className="w-full rounded-t bg-primary/70"
                        style={{
                          height: `${(Number(f.predictedRevenue) / maxRev) * 110 + 6}px`,
                        }}
                      />
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(f.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">…</div>
            )}
          </CardContent>
        </Card>

        {/* alerts */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="size-4" /> Alerts
              {alerts.data?.count > 0 && (
                <Badge variant="destructive" appearance="light">
                  {alerts.data.count}
                </Badge>
              )}
            </div>
            {alerts.data?.alerts?.length ? (
              <div className="space-y-2">
                {alerts.data.alerts.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border p-2.5 text-sm"
                  >
                    <div className="font-medium">{a.title || a.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.message || a.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                All clear.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* insights */}
      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="size-4" /> Insights
          </div>
          {insights.isLoading ? (
            <div className="text-sm text-muted-foreground">…</div>
          ) : insights.data?.insights?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {insights.data.insights.map((ins, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium">{ins.title}</span>
                    <Badge
                      variant={PRIORITY[ins.priority] || 'secondary'}
                      appearance="light"
                    >
                      {ins.confidence}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ins.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Bot className="size-4" /> Not enough data yet — make a few sales
              and check back.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
