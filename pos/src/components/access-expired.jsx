import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/auth-context';

export function AccessExpired() {
  const { accessMessage, logout } = useAuth();
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-background p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto size-10 text-amber-500" />
        <h1 className="text-lg font-semibold text-foreground">Access unavailable</h1>
        <p className="text-sm text-muted-foreground">
          {accessMessage || 'Your access to this workspace is currently disabled.'}
        </p>
        <Button variant="outline" className="w-full" onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
