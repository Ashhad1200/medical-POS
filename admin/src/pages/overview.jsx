import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Building2,
  CircleDollarSign,
  Clock3,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { dateTime, int, money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewPage() {
  const overview = useQuery({
    queryKey: ['platform', 'overview'],
    queryFn: async () => (await api.get('/platform/overview')).data.data,
  });
  const health = useQuery({
    queryKey: ['platform', 'health'],
    queryFn: async () => (await api.get('/platform/health')).data.data,
    refetchInterval: 30000,
  });

  const o = overview.data;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Tenants, revenue and system health across the platform."
      />

      {overview.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            icon={Building2}
            label="Organizations"
            value={int(o?.organizations?.total)}
            hint={`${int(o?.organizations?.active)} active · ${int(o?.organizations?.trialing)} trialing`}
          />
          <Stat
            icon={Users}
            label="Tenant users"
            value={int(o?.users?.total)}
            hint={`${int(o?.users?.active)} active`}
          />
          <Stat
            icon={CircleDollarSign}
            label="MRR"
            value={money(o?.mrr)}
            hint="active + trialing subscriptions"
          />
          <Stat
            icon={Clock3}
            label="Expired access"
            value={int(o?.organizations?.expired)}
            hint={`${int(o?.organizations?.suspended)} suspended`}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-3 text-sm font-semibold text-foreground">
              Plan distribution
            </div>
            <div className="space-y-2">
              {(o?.planDistribution || []).map((p) => (
                <div
                  key={p.code}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">
                    {int(p.organizations)} orgs
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="size-4" /> System health
            </div>
            {health.data ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Database</dt>
                  <dd>
                    <Badge variant={health.data.db?.connected ? 'success' : 'destructive'} appearance="light">
                      {health.data.db?.connected ? `ok · ${health.data.db.latencyMs}ms` : 'down'}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Uptime</dt>
                  <dd>{Math.round((health.data.server?.uptimeSeconds || 0) / 60)} min</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Node</dt>
                  <dd>{health.data.server?.nodeVersion}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Memory</dt>
                  <dd>{health.data.server?.memoryMb} MB</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Env</dt>
                  <dd>{health.data.server?.env}</dd>
                </div>
              </dl>
            ) : (
              <div className="text-sm text-muted-foreground">…</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="mb-3 text-sm font-semibold text-foreground">
            Recent subscription events
          </div>
          {o?.recentEvents?.length ? (
            <div className="divide-y divide-border">
              {o.recentEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{e.organization_name}</span>{' '}
                    <span className="text-muted-foreground">— {e.event_type}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {dateTime(e.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No events yet.</div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
