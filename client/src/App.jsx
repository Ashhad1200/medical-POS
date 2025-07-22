import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "./store/store";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import LoadingSpinner from "./components/UI/LoadingSpinner";
import LoginPage from "./pages/Login";
import DashboardLayout from "./components/Layout/DashboardLayout";
import AccessExpiredModal from "./components/Auth/AccessExpiredModal";

import Dashboard from "./pages/Dashboard";
import CounterDashboard from "./pages/CounterDashboard";
import InventoryPage from "./pages/InventoryPage";
import MedicinesPage from "./pages/MedicinesPage";
import OrdersPage from "./pages/OrdersPage";
import SuppliersPage from "./pages/SuppliersPage";
import UsersPage from "./pages/UsersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import Dealers from "./pages/Dealers";

// Startup Screen Component
const StartupScreen = ({ onContinue }) => {
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    // Test API connection
    const apiUrl = import.meta.env.VITE_API_URL || "/api";
    fetch(`${apiUrl}/auth/status`)
      .then((response) => {
        if (response.status === 401) {
          setApiStatus("connected");
        } else if (response.ok) {
          setApiStatus("connected");
        } else {
          setApiStatus("error: " + response.status);
        }
      })
      .catch((error) => {
        setApiStatus("disconnected");
        console.error("API connection failed:", error);
      });
  }, []);

  const clearAndRestart = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Medical Store POS
          </h1>
          <p className="text-gray-600 mb-8">
            System initialization and connection check
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              API Status:
            </span>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                apiStatus === "connected"
                  ? "bg-green-100 text-green-800"
                  : apiStatus === "checking"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {apiStatus}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Local Storage:
            </span>
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              {localStorage.length} items
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Environment:
            </span>
            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
              {import.meta.env.MODE}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onContinue}
            disabled={apiStatus === "checking"}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Application
          </button>

          <button
            onClick={clearAndRestart}
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Clear Data & Restart
          </button>
        </div>

        {apiStatus !== "connected" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              API connection issues detected. You can still continue, but some
              features may not work properly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { profile, isLoading, initialized, isAuthenticated } = useAuthContext();

  console.log("ProtectedRoute render:", {
    profile: !!profile,
    isAuthenticated,
    isLoading,
    initialized,
    requiredRoles,
    userRole: profile?.role_in_pos,
  });

  // Show loading while authentication is being initialized
  if (!initialized) {
    console.log("ProtectedRoute: Not initialized yet");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner text="Authenticating..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("ProtectedRoute: Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (
    requiredRoles.length > 0 &&
    !requiredRoles.includes(profile?.role_in_pos)
  ) {
    console.log("ProtectedRoute: Role mismatch, redirecting to unauthorized");
    return <Navigate to="/unauthorized" replace />;
  }

  console.log("ProtectedRoute: Access granted");
  return children;
};

// Role-based Dashboard Component
const RoleDashboard = () => {
  const { profile } = useAuthContext();
  
  // Render CounterDashboard for counter staff, regular Dashboard for others
  if (profile?.role_in_pos === "counter") {
    return <CounterDashboard />;
  }
  
  return <Dashboard />;
};

// App Routes Component
const AppRoutes = () => {
  const { 
    profile, 
    isLoading, 
    initialized, 
    isAuthenticated, 
    isAccessValid, 
    accessExpiredMessage 
  } = useAuthContext();

  console.log("AppRoutes render:", {
    profile: !!profile,
    isAuthenticated,
    isLoading,
    initialized,
    isAccessValid,
  });

  // Handle contact admin action
  const handleContactAdmin = () => {
    // You can customize this based on your organization's contact method
    const adminEmail = profile?.organization?.admin_email || 'admin@yourcompany.com';
    const subject = encodeURIComponent('Access Extension Request');
    const body = encodeURIComponent(
      `Hello,\n\nMy access to the Medical Store POS system has expired. Please extend my access.\n\nUser Details:\n- Name: ${profile?.full_name || 'N/A'}\n- Email: ${profile?.email || 'N/A'}\n- Username: ${profile?.username || 'N/A'}\n- Organization: ${profile?.organization?.name || 'N/A'}\n\nThank you.`
    );
    window.open(`mailto:${adminEmail}?subject=${subject}&body=${body}`);
  };

  // Show loading screen only if not initialized AND still loading AND not authenticated
  // This prevents showing loading when we already have authentication state
  if (!initialized && isLoading && !isAuthenticated) {
    console.log("Showing initialization loading screen");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner text="Initializing application..." />
      </div>
    );
  }

  // If initialized but no user, show login
  if (initialized && !isAuthenticated) {
    console.log("User not authenticated, showing login");
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // If we have authentication but still loading, show a brief loading
  if (isAuthenticated && isLoading) {
    console.log("User authenticated but still loading, showing brief loading");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  // If authenticated and not loading, show the app
  if (isAuthenticated && !isLoading) {
    console.log("User authenticated and ready, showing app");
    return (
      <>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <LoginPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />



          {/* Protected Routes with nested structure */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<RoleDashboard />} />
            <Route
              path="inventory"
              element={
                <ProtectedRoute requiredRoles={["admin", "manager", "warehouse"]}>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="medicines"
              element={
                <ProtectedRoute requiredRoles={["admin", "manager", "warehouse"]}>
                  <MedicinesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="dealers"
              element={
                <ProtectedRoute requiredRoles={["admin", "counter"]}>
                  <Dealers />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders"
              element={
                <ProtectedRoute requiredRoles={["admin", "manager", "counter"]}>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="order/:id"
              element={
                <ProtectedRoute requiredRoles={["admin", "manager", "counter"]}>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="suppliers"
              element={
                <ProtectedRoute requiredRoles={["admin", "manager", "warehouse"]}>
                  <SuppliersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Remove the individual routes since they're now nested */}
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        
        {/* Access Expired Modal - Show when user is authenticated but access is invalid */}
        <AccessExpiredModal
          isOpen={isAuthenticated && isAccessValid === false}
          message={accessExpiredMessage}
          onContactAdmin={handleContactAdmin}
        />
      </>
    );
  }

  // Fallback loading state
  console.log("Fallback loading state");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner text="Loading..." />
    </div>
  );
};

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Main App Component
function App() {
  const [showStartup, setShowStartup] = useState(false);

  useEffect(() => {
    // Check if we should show startup screen
    const shouldShowStartup = localStorage.getItem("showStartup") === "true";
    if (shouldShowStartup) {
      setShowStartup(true);
    }
  }, []);

  const handleContinue = () => {
    localStorage.removeItem("showStartup");
    setShowStartup(false);
  };

  if (showStartup) {
    return <StartupScreen onContinue={handleContinue} />;
  }

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <div className="App">
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "#363636",
                    color: "#fff",
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: "#4ade80",
                      secondary: "#fff",
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: "#ef4444",
                      secondary: "#fff",
                    },
                  },
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
