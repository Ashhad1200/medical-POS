import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  Boxes,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  RotateCcw,
  ShoppingCart,
  Sun,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/auth-context';

// each item lists the roles allowed to see it (empty = everyone)
const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [] },
  { to: '/create-order', label: 'New order', icon: ShoppingCart, roles: ['admin', 'counter'] },
  { to: '/orders', label: 'Orders', icon: ClipboardList, roles: ['admin', 'manager', 'counter'] },
  { to: '/dued-customers', label: 'Dued customers', icon: Wallet, roles: ['admin', 'counter'] },
  { to: '/dealers', label: 'Dealers', icon: CreditCard, roles: ['admin', 'counter'] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/purchase-orders', label: 'Purchase orders', icon: Truck, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/suppliers', label: 'Suppliers', icon: Package, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/rtv-suggestions', label: 'RTV suggestions', icon: RotateCcw, roles: ['admin', 'manager', 'warehouse'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
];

export function AppLayout() {
  const { profile, role, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const items = NAV.filter((n) => !n.roles.length || n.roles.includes(role));

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
