import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  Sun,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/auth-context';

const NAV = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/organizations', label: 'Organizations', icon: Building2 },
  { to: '/plans', label: 'Plans', icon: Package },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/audit', label: 'Audit log', icon: ClipboardList },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="flex h-full w-full">
      {/* sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-border bg-background lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">PharmaFlow</div>
            <div className="text-xs text-muted-foreground">Platform console</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
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
          <div className="mb-2 px-2 text-xs text-muted-foreground truncate">
            {user?.email}
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

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-5">
          <div className="text-sm font-medium text-foreground lg:hidden">PharmaFlow</div>
          <div className="ms-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
              }
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
