import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Link2,
  LogOut,
  Moon,
  Package,
  PackageSearch,
  Palette,
  RotateCcw,
  ShoppingCart,
  ShoppingBag,
  Sparkles,
  Store,
  Sun,
  Truck,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/auth-context';

// each item lists the roles allowed to see it (empty = everyone);
// `feature` (optional) additionally requires that plan feature flag.
const PHARMACY_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [] },
  { to: '/ai-analytics', label: 'AI analytics', icon: Sparkles, roles: ['admin', 'manager'] },
  { to: '/create-order', label: 'New order', icon: ShoppingCart, roles: ['admin', 'counter'] },
  { to: '/orders', label: 'Orders', icon: ClipboardList, roles: ['admin', 'manager', 'counter'] },
  { to: '/store-orders', label: 'Store orders', icon: ShoppingBag, roles: ['admin', 'manager', 'counter'], feature: 'storefront' },
  { to: '/dued-customers', label: 'Dued customers', icon: Wallet, roles: ['admin', 'counter'] },
  { to: '/dealers', label: 'Dealers', icon: CreditCard, roles: ['admin', 'counter'] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/purchase-orders', label: 'Purchase orders', icon: Truck, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/reorder', label: 'Reorder', icon: PackageSearch, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/returns', label: 'Returns', icon: Undo2, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/suppliers', label: 'Suppliers', icon: Package, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/connections', label: 'Connections', icon: Link2, roles: ['admin', 'manager'] },
  { to: '/rtv-suggestions', label: 'RTV suggestions', icon: RotateCcw, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/store-settings', label: 'Online store', icon: Store, roles: ['admin', 'manager'], feature: 'storefront' },
  { to: '/store-customize', label: 'Storefront design', icon: Palette, roles: ['admin', 'manager'], feature: 'storefront' },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
];

const SUPPLIER_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [] },
  { to: '/supplier/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'manager'] },
  { to: '/supplier/catalogue', label: 'Catalogue', icon: Boxes, roles: ['admin', 'manager'] },
  { to: '/supplier/orders', label: 'Incoming orders', icon: Inbox, roles: ['admin', 'manager'] },
  { to: '/returns', label: 'Returns', icon: Undo2, roles: ['admin', 'manager'] },
  { to: '/connections', label: 'Connections', icon: Link2, roles: ['admin', 'manager'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
];

export function AppLayout() {
  const { profile, role, orgType, logout, hasFeature } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const nav = orgType === 'supplier' ? SUPPLIER_NAV : PHARMACY_NAV;
  const items = nav.filter(
    (n) =>
      (!n.roles.length || n.roles.includes(role)) &&
      (!n.feature || hasFeature(n.feature)),
  );

  return (
    <div className="flex h-full w-full">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-border bg-background lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">Medical POS</div>
            <div className="text-xs text-muted-foreground truncate">
              {profile?.organization?.name || '—'}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-secondary-foreground hover:bg-muted',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 px-2 text-xs text-muted-foreground">
            <div className="truncate font-medium text-foreground">
              {profile?.fullName || profile?.username}
            </div>
            <div className="capitalize">{role}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={logout}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-5">
          <div className="text-sm font-medium text-foreground lg:hidden">Medical POS</div>
          <div className="ms-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-muted/30 p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
