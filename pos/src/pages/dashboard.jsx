import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { dashboardServices, medicineServices } from '@/lib/services';
import { useAuth } from '@/auth/auth-context';
import { Card, CardContent } from '@/components/ui/card';

const money = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const int = (n) => new Intl.NumberFormat('en-US').format(Number(n || 0));

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
        <div
          className={`flex size-9 items-center justify-center rounded-md ${tones[tone]}`}
        >
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { profile, role } = useAuth();

  const stats = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => (await dashboardServices.getStats()).data.data,
  });
  const inv = useQuery({
    queryKey: ['medicines', 'stats'],
    queryFn: async () => (await medicineServices.getStats()).data.data,
  });

  const s = stats.data;
  const i = inv.data;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">
          Welcome back{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">
          {role} · {profile?.organization?.name}
        </p>
      </div>

      {stats.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            icon={DollarSign}
            tone="green"
            label="Today's revenue"
            value={money(s?.todayRevenue)}
            hint={`${int(s?.todayOrders)} orders today`}
          />
          <Stat
            icon={TrendingUp}
            label="This month"
            value={money(s?.monthlyStats?.totalSales)}
            hint={`avg ${money(s?.monthlyStats?.averageOrderValue)} / order`}
          />
          <Stat
            icon={ShoppingCart}
            tone="amber"
            label="Pending orders"
            value={int(s?.pendingOrders)}
            hint={`${int(s?.totalOrders)} total`}
          />
          <Stat
            icon={Package}
            label="Products"
            value={int(i?.total)}
            hint={money(i?.totalValue) + ' stock value'}
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={AlertTriangle}
          tone="red"
          label="Low stock"
          value={int(s?.lowStockItems ?? i?.outOfStock)}
        />
        <Stat
          icon={Boxes}
          label="Out of stock"
          value={int(i?.outOfStock)}
        />
        <Stat
          icon={CalendarClock}
          tone="amber"
          label="Expiring soon"
          value={int(i?.expiringSoon)}
        />
        <Stat
          icon={AlertTriangle}
          tone="red"
          label="Expired"
          value={int(i?.expired)}
        />
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="mb-2 text-sm font-semibold text-foreground">
            System
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="flex justify-between sm:block">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">
                {s?.systemStatus?.status || '—'}
              </dd>
            </div>
            <div className="flex justify-between sm:block">
              <dt className="text-muted-foreground">Database</dt>
              <dd className="font-medium">{s?.systemStatus?.database || '—'}</dd>
            </div>
            <div className="flex justify-between sm:block">
              <dt className="text-muted-foreground">Team</dt>
              <dd className="font-medium">{int(s?.totalUsers)} users</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
