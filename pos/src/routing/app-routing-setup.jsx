import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { AccessExpired } from '@/components/access-expired';
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import { CreateOrderPage } from '@/pages/create-order';
import { OrdersPage } from '@/pages/orders';
import { DuedCustomersPage } from '@/pages/dued-customers';
import { InventoryPage } from '@/pages/inventory';
import { PurchaseOrdersPage } from '@/pages/purchase-orders';
import { SuppliersPage } from '@/pages/suppliers';
import { UsersPage } from '@/pages/users';
import { OrderDetailPage } from '@/pages/order-detail';
import { RtvSuggestionsPage } from '@/pages/rtv-suggestions';
import { DealersPage } from '@/pages/dealers';
import { AiAnalyticsPage } from '@/pages/ai-analytics';
import { StorefrontSettingsPage } from '@/pages/storefront-settings';
import { StorefrontCustomizePage } from '@/pages/storefront-customize';
import { StorefrontOrdersPage } from '@/pages/storefront-orders';
import { SupplierCataloguePage } from '@/pages/supplier/catalogue';
import { SupplierOrdersPage } from '@/pages/supplier/incoming-orders';
import { SupplierAnalyticsPage } from '@/pages/supplier/analytics';
import { ConnectionsPage } from '@/pages/connections';
import { ReorderPage } from '@/pages/reorder';
import { ReturnsPage } from '@/pages/returns';

function Protected({ roles, orgTypes, children }) {
  const { ready, isAuthenticated, isAccessValid, role, orgType } = useAuth();
  if (!ready)
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAccessValid) return <AccessExpired />;
  if (orgTypes && !orgTypes.includes(orgType))
    return <Navigate to="/dashboard" replace />;
  if (roles && roles.length && !roles.includes(role))
    return <Navigate to="/dashboard" replace />;
  return children;
}

// role_in_pos: admin | manager | counter | warehouse
const COUNTER = ['admin', 'counter'];
const SELL = ['admin', 'manager', 'counter'];
const STOCK = ['admin', 'manager', 'warehouse'];

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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/ai-analytics"
          element={
            <Protected roles={['admin', 'manager']}>
              <AiAnalyticsPage />
            </Protected>
          }
        />

        <Route
          path="/create-order"
          element={
            <Protected roles={COUNTER}>
              <CreateOrderPage />
            </Protected>
          }
        />
        <Route
          path="/dued-customers"
          element={
            <Protected roles={COUNTER}>
              <DuedCustomersPage />
            </Protected>
          }
        />
        <Route
          path="/dealers"
          element={
            <Protected roles={COUNTER}>
              <DealersPage />
            </Protected>
          }
        />
        <Route
          path="/orders"
          element={
            <Protected roles={SELL}>
              <OrdersPage />
            </Protected>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <Protected roles={SELL}>
              <OrderDetailPage />
            </Protected>
          }
        />
        <Route
          path="/purchase-orders"
          element={
            <Protected roles={STOCK}>
              <PurchaseOrdersPage />
            </Protected>
          }
        />
        <Route
          path="/suppliers"
          element={
            <Protected roles={STOCK}>
              <SuppliersPage />
            </Protected>
          }
        />
        <Route
          path="/inventory"
          element={
            <Protected roles={STOCK}>
              <InventoryPage />
            </Protected>
          }
        />
        <Route
          path="/rtv-suggestions"
          element={
            <Protected roles={STOCK}>
              <RtvSuggestionsPage />
            </Protected>
          }
        />
        <Route
          path="/store-settings"
          element={
            <Protected roles={['admin', 'manager']}>
              <StorefrontSettingsPage />
            </Protected>
          }
        />
        <Route
          path="/store-customize"
          element={
            <Protected roles={['admin', 'manager']}>
              <StorefrontCustomizePage />
            </Protected>
          }
        />
        <Route
          path="/store-orders"
          element={
            <Protected roles={['admin', 'manager', 'counter']}>
              <StorefrontOrdersPage />
            </Protected>
          }
        />
        <Route
          path="/connections"
          element={
            <Protected roles={['admin', 'manager']}>
              <ConnectionsPage />
            </Protected>
          }
        />
        <Route
          path="/reorder"
          element={
            <Protected orgTypes={['pharmacy']} roles={STOCK}>
              <ReorderPage />
            </Protected>
          }
        />
        <Route
          path="/supplier/catalogue"
          element={
            <Protected orgTypes={['supplier']} roles={['admin', 'manager']}>
              <SupplierCataloguePage />
            </Protected>
          }
        />
        <Route
          path="/supplier/orders"
          element={
            <Protected orgTypes={['supplier']} roles={['admin', 'manager']}>
              <SupplierOrdersPage />
            </Protected>
          }
        />
        <Route
          path="/supplier/analytics"
          element={
            <Protected orgTypes={['supplier']} roles={['admin', 'manager']}>
              <SupplierAnalyticsPage />
            </Protected>
          }
        />
        <Route
          path="/returns"
          element={
            <Protected roles={['admin', 'manager', 'warehouse']}>
              <ReturnsPage />
            </Protected>
          }
        />
        <Route
          path="/users"
          element={
            <Protected roles={['admin']}>
              <UsersPage />
            </Protected>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
