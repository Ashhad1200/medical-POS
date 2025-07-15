import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import SalesChart from "../components/Admin/SalesChart";
import { useDashboard } from "../hooks/useDashboard";
import { useOrderDashboard } from "../hooks/useOrders";
import { useMedicines } from "../hooks/useMedicines";

// Enhanced StatCard Component
const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  trendValue,
  onClick,
  loading = false,
}) => {
  const trendColor =
    trend === "up"
      ? "text-green-600"
      : trend === "down"
      ? "text-red-600"
      : "text-gray-600";
  const trendIcon = trend === "up" ? "↗" : trend === "down" ? "↘" : "→";

  return (
    <div
      className={`bg-white overflow-hidden shadow-lg rounded-xl border hover:shadow-xl transition-all duration-300 ${
        onClick ? "cursor-pointer hover:scale-105" : ""
      }`}
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div
              className={`h-12 w-12 ${color} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                icon
              )}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-2xl font-bold text-gray-900">
                {loading ? "Loading..." : value}
              </dd>
              {subtitle && (
                <dd className="text-sm text-gray-600 mt-1">{subtitle}</dd>
              )}
              {trend && (
                <dd className={`text-sm ${trendColor} mt-1 flex items-center`}>
                  <span className="mr-1">{trendIcon}</span>
                  {trendValue} vs last period
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quick Action Card Component
const QuickActionCard = ({
  title,
  description,
  icon,
  link,
  color,
  stats,
  onClick,
}) => {
  return (
    <Link
      to={link}
      onClick={onClick}
      className="group bg-white rounded-xl shadow-lg border hover:shadow-xl transition-all duration-300 transform hover:scale-105"
    >
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className={`${color} rounded-xl p-4 mr-4 shadow-lg`}>
            <span className="text-white text-2xl">{icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
        </div>
        <div className="text-sm text-gray-500 border-t pt-4 bg-gray-50 -mx-6 px-6 -mb-6 pb-6 rounded-b-xl">
          {stats}
        </div>
      </div>
    </Link>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [range, setRange] = useState("daily");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { stats: statsQuery, activities: activitiesQuery, isLoading } = useDashboard();
  const { data: medicines } = useMedicines();
  const {
    data: dashboardOrderData,
    isRefetching: refreshing,
    refetch,
  } = useOrderDashboard(range);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch();
      }, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch]);

  const dashboardStats = statsQuery.data?.data;
  const recentActivities = activitiesQuery.data?.data.activities;
  const recentOrders = dashboardOrderData?.data.recentOrders;
  const lowStockCount = dashboardStats?.lowStockMedicines?.length || 0;

  const systemAlerts = [];
  if (lowStockCount > 0) {
    systemAlerts.push({
      type: "warning",
      title: "Low Stock Alert",
      message: `${lowStockCount} medicines are running low on stock`,
      action: () => navigate("/inventory"),
    });
  }
  if (dashboardOrderData?.data.totalOrders === 0) {
    systemAlerts.push({
      type: "info",
      title: "No Orders Today",
      message: "No orders have been placed today yet",
      action: () => navigate("/dashboard"),
    });
  }

  const dashboardCards = [
    {
      title: "Sales & Orders",
      description: "Manage counter operations and order processing",
      icon: "💰",
      link: "/orders",
      color: "bg-gradient-to-r from-green-500 to-green-600",
      stats: `${
        dashboardOrderData?.data.totalOrders
      } Orders Today | Rs.${dashboardOrderData?.data.totalRevenue?.toFixed(2)} Revenue`,
    },
    {
      title: "Inventory Management",
      description: "Track medicines, stock levels and expiry dates",
      icon: "📦",
      link: "/inventory",
      color: "bg-gradient-to-r from-blue-500 to-blue-600",
      stats: `${medicines?.data.pagination.total} Medicines | ${lowStockCount} Low Stock`,
    },
    {
      title: "Supplier Management",
      description: "Manage suppliers and purchase orders",
      icon: "🏢",
      link: "/suppliers",
      color: "bg-gradient-to-r from-purple-500 to-purple-600",
      stats: `Active Suppliers | Purchase Orders`,
    },
    {
      title: "User Management",
      description: "Create and manage user accounts and roles",
      icon: "👥",
      link: "/users",
      color: "bg-gradient-to-r from-orange-500 to-orange-600",
      stats: `${dashboardStats?.totalUsers} Users`,
    },
    {
      title: "Medicines Database",
      description: "View and search medicine information",
      icon: "💊",
      link: "/medicines",
      color: "bg-gradient-to-r from-red-500 to-red-600",
      stats: `${medicines?.data.pagination.total} Items`,
    },
    {
      title: "Counter Operations",
      description: "Direct access to sales interface",
      icon: "🛒",
      link: "/dashboard",
      color: "bg-gradient-to-r from-indigo-500 to-indigo-600",
      stats: "POS System",
      onClick: () => navigate("/dashboard"),
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>•</span>
                <span>{format(new Date(), "PPP")}</span>
                <span>•</span>
                <span className="text-green-600">
                  {refreshing ? "Refreshing..." : "Live"}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  autoRefresh
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Auto-refresh {autoRefresh ? "ON" : "OFF"}
              </button>

              <button
                onClick={() => refetch()}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {user?.fullName}! 👋
              </h2>
              <p className="text-blue-100">
                Here's what's happening with Moiz Medical Store today.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                Rs.{dashboardOrderData?.data.totalRevenue?.toFixed(2)}
              </div>
              <div className="text-blue-200">Today's Revenue</div>
            </div>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Today's Sales"
            value={`Rs.${dashboardOrderData?.data.totalRevenue?.toFixed(2)}`}
            subtitle="Revenue today"
            icon="💰"
            color="bg-gradient-to-r from-green-500 to-green-600"
            trend="up"
            trendValue="12%"
            onClick={() => navigate("/orders")}
          />
          <StatCard
            title="Total Orders"
            value={dashboardOrderData?.data.totalOrders}
            subtitle="Orders today"
            icon="📋"
            color="bg-gradient-to-r from-blue-500 to-blue-600"
            trend="up"
            trendValue="8%"
            onClick={() => navigate("/orders")}
          />
          <StatCard
            title="Completed Orders"
            value={dashboardOrderData?.data.completedOrders}
            subtitle={`${dashboardOrderData?.data.pendingOrders} pending`}
            icon="📈"
            color="bg-gradient-to-r from-purple-500 to-purple-600"
            trend="up"
            trendValue="5%"
          />
          <StatCard
            title="Pending Orders"
            value={dashboardOrderData?.data.pendingOrders}
            subtitle="Orders to be fulfilled"
            icon=""
            color="bg-gradient-to-r from-yellow-500 to-yellow-600"
            onClick={() => navigate("/orders?status=pending")}
          />
        </div>

        {/* Charts and Analytics */}
        <div className="mb-8">
          <SalesChart />
        </div>

        {/* Management Cards */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardCards.map((card, index) => (
              <QuickActionCard key={index} {...card} />
            ))}
          </div>
        </div>

        {/* Recent Activities & System Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Orders */}
          <div className="bg-white shadow-lg rounded-xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Orders
              </h3>
            </div>
            <div className="p-6">
              {recentOrders?.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders
                    .slice(0, 5)
                    .map((order, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Order #{order.orderNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.customerName} •{" "}
                            {format(
                              new Date(order.createdAt),
                              "MMM dd, hh:mm a"
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">
                            Rs.{order.total?.toFixed(2)}
                          </p>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              order.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No recent orders
                </p>
              )}
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white shadow-lg rounded-xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                System Alerts
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {systemAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
                      alert.type === "warning"
                        ? "bg-yellow-50 border-yellow-400"
                        : alert.type === "error"
                        ? "bg-red-50 border-red-400"
                        : "bg-blue-50 border-blue-400"
                    }`}
                    onClick={alert.action}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span
                          className={`text-2xl ${
                            alert.type === "warning"
                              ? "text-yellow-400"
                              : alert.type === "error"
                              ? "text-red-400"
                              : "text-blue-400"
                          }`}
                        >
                          {alert.type === "warning"
                            ? "⚠️"
                            : alert.type === "error"
                            ? "❌"
                            : "ℹ️"}
                        </span>
                      </div>
                      <div className="ml-3">
                        <h4
                          className={`text-sm font-medium ${
                            alert.type === "warning"
                              ? "text-yellow-800"
                              : alert.type === "error"
                              ? "text-red-800"
                              : "text-blue-800"
                          }`}
                        >
                          {alert.title}
                        </h4>
                        <p
                          className={`text-sm ${
                            alert.type === "warning"
                              ? "text-yellow-700"
                              : alert.type === "error"
                              ? "text-red-700"
                              : "text-blue-700"
                          }`}
                        >
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* System Status */}
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-green-400 text-2xl">✅</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800">
                        System Status
                      </h4>
                      <p className="text-sm text-green-700">
                        All systems are running normally
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Performance
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Revenue</span>
                <span className="font-semibold">
                  Rs.{dashboardStats?.monthSales?.totalRevenue?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Orders</span>
                <span className="font-semibold">
                  {dashboardStats?.monthSales?.totalOrders}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Order Value</span>
                <span className="font-semibold">
                  Rs.{dashboardStats?.avgOrderValue?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Inventory Status
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Medicines</span>
                <span className="font-semibold">
                  {medicines?.data.pagination.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Low Stock</span>
                <span className="font-semibold text-red-600">
                  {lowStockCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="font-semibold">
                  {dashboardStats?.totalUsers}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Links
            </h4>
            <div className="space-y-2">
              <Link
                to="/inventory"
                className="block w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                📦 Manage Inventory
              </Link>
              <Link
                to="/orders"
                className="block w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                📋 View All Orders
              </Link>
              <Link
                to="/users"
                className="block w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                👥 Manage Users
              </Link>
              <Link
                to="/suppliers"
                className="block w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                🏢 Supplier Management
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
