import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/pages/login';
import { OverviewPage } from '@/pages/overview';
import { OrganizationsPage } from '@/pages/organizations';
import { OrganizationDetailPage } from '@/pages/organization-detail';
import { PlansPage } from '@/pages/plans';
import { UsersPage } from '@/pages/users';
import { AuditPage } from '@/pages/audit';

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready)
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}
