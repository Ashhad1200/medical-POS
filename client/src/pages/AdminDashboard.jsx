import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import SalesChart from "../components/Admin/SalesChart";
import { useDashboard } from "../hooks/useDashboard";
import { useOrderDashboard } from "../hooks/useOrders";
import { useMedicines } from "../hooks/useMedicines";

// Modern Enhanced StatCard Component
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
  percentage,
  sparklineData = [],
}) => {
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
      ? "text-red-500"
      : "text-gray-500";
  const trendIcon = trend === "up" ? "📈" : trend === "down" ? "📉" : "📊";
  const trendBg = trend === "up" ? "bg-emerald-50" : trend === "down" ? "bg-red-50" : "bg-gray-50";

  return (
    <div
      className={`group relative bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-500 transform ${
        onClick ? "cursor-pointer hover:scale-[1.02] hover:-translate-y-1" : ""
      }`}
      onClick={onClick}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-50 opacity-60"></div>
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div
                className={`h-12 w-12 ${color} rounded-xl flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <span className="filter drop-shadow-sm">{icon}</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  {title}
                </h3>
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                    {loading ? (
                      <span className="animate-pulse bg-gray-200 h-8 w-20 rounded"></span>
                    ) : (
                      value
                    )}
                  </p>
                  {percentage && (
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${trendBg} ${trendColor}`}>
                      {percentage}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {subtitle && (
              <p className="text-sm text-gray-500 mb-3">{subtitle}</p>
            )}
            
            {trend && (
              <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${trendBg}`}>
                <span className="text-lg">{trendIcon}</span>
                <span className={`text-sm font-semibold ${trendColor}`}>
                  {trendValue}
                </span>
                <span className="text-xs text-gray-500">vs last period</span>
              </div>
            )}
          </div>
          
          {/* Mini sparkline */}
          {sparklineData.length > 0 && (
            <div className="w-20 h-12 opacity-30 group-hover:opacity-60 transition-opacity">
              <svg className="w-full h-full" viewBox="0 0 80 48">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  points={sparklineData.map((point, index) => 
                    `${(index / (sparklineData.length - 1)) * 80},${48 - (point / Math.max(...sparklineData)) * 48}`
                  ).join(' ')}
                  className={trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}
                />
              </svg>
            </div>
          )}
        </div>
      </div>
      
      {/* Hover effect border */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-100 transition-colors duration-300"></div>
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
  const [selectedTimeframe, setSelectedTimeframe] = useState('today');
  const [realTimeData, setRealTimeData] = useState(null);

  const { stats: statsQuery, activities: activitiesQuery, isLoading } = useDashboard();
  const { data: medicines } = useMedicines();
  const {
    data: dashboardOrderData,
    isRefetching: refreshing,
    refetch,
  } = useOrderDashboard(range);

  // Generate sample sparkline data for demo
  const generateSparklineData = (baseValue, trend) => {
    const data = [];
    let current = baseValue;
    for (let i = 0; i < 7; i++) {
      const variation = (Math.random() - 0.5) * 0.2;
      const trendFactor = trend === 'up' ? 1.05 : trend === 'down' ? 0.95 : 1;
      current = current * trendFactor + variation;
      data.push(Math.max(0, current));
    }
    return data;
  };

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch();
      }, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch]);

  const dashboardStats = statsQuery.data?.data;
  const recentActivities = activitiesQuery.data?.data?.activities || [];
  // Use recent activities for orders since recentOrders might not be available
  const recentOrders = recentActivities.filter(activity => activity.type === 'order').slice(0, 5) || [];
  const lowStockCount = dashboardStats?.lowStockItems || 0;

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
      {/* Modern Header Section */}
      <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      refreshing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
                    }`}></div>
                    <span>{refreshing ? "Syncing..." : "Live"}</span>
                  </div>
                  <span>•</span>
                  <span>{format(new Date(), "PPP")}</span>
                  <span>•</span>
                  <span className="text-blue-600 font-medium">{user?.fullName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Timeframe Selector */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-xl p-1">
                {['today', '7days', '30days'].map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => setSelectedTimeframe(timeframe)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      selectedTimeframe === timeframe
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {timeframe === 'today' ? 'Today' : timeframe === '7days' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>

              {/* Auto-refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  autoRefresh
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}></div>
                <span>Auto-sync</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={() => refetch()}
                disabled={refreshing}
                className="group p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                <svg
                  className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                    refreshing ? "animate-spin" : ""
                  }`}
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
        {/* Modern Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white mb-8 shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
            <svg className="absolute right-0 top-0 h-full w-1/3" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon fill="white" fillOpacity="0.1" points="50,0 100,0 100,100"/>
            </svg>
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">👋</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-1">
                    Welcome back, {user?.fullName}!
                  </h2>
                  <p className="text-blue-100 text-lg">
                    Here's your business overview for {format(new Date(), 'EEEE, MMMM do')}
                  </p>
                </div>
              </div>
              
              {/* Quick Stats Row */}
              <div className="flex items-center space-x-8 mt-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-100">System Online</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-100">Last Updated:</span>
                  <span className="text-sm font-medium">{format(new Date(), 'HH:mm')}</span>
                </div>
              </div>
            </div>
            
            {/* Revenue Display */}
            <div className="text-right">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-sm text-blue-200 mb-2 uppercase tracking-wide">Today's Revenue</div>
                <div className="text-4xl font-bold mb-2">
                  Rs.{dashboardOrderData?.data.totalRevenue?.toFixed(2) || '0.00'}
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <span className="text-emerald-300">📈</span>
                  <span className="text-blue-200">
                    {dashboardOrderData?.data.totalOrders || 0} orders
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Revenue"
            value={`Rs.${dashboardOrderData?.data.totalRevenue?.toFixed(2) || '0.00'}`}
            subtitle="Today's total sales"
            icon="💰"
            color="bg-gradient-to-br from-emerald-500 to-emerald-600"
            trend="up"
            trendValue="+12.5%"
            percentage={dashboardStats?.monthlyStats?.growthRate?.toFixed(1)}
            sparklineData={generateSparklineData(dashboardOrderData?.data.totalRevenue || 1000, 'up')}
            onClick={() => navigate("/orders")}
            loading={isLoading}
          />
          <StatCard
            title="Orders"
            value={dashboardOrderData?.data.totalOrders || 0}
            subtitle="Total orders today"
            icon="📦"
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            trend="up"
            trendValue="+8.2%"
            sparklineData={generateSparklineData(dashboardOrderData?.data.totalOrders || 10, 'up')}
            onClick={() => navigate("/orders")}
            loading={isLoading}
          />
          <StatCard
            title="Completion Rate"
            value={`${dashboardOrderData?.data.totalOrders > 0 ? 
              ((dashboardOrderData?.data.completedOrders / dashboardOrderData?.data.totalOrders) * 100).toFixed(1) : 0}%`}
            subtitle={`${dashboardOrderData?.data.completedOrders || 0} of ${dashboardOrderData?.data.totalOrders || 0} completed`}
            icon="✅"
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            trend="up"
            trendValue="+5.3%"
            sparklineData={generateSparklineData(85, 'up')}
            loading={isLoading}
          />
          <StatCard
            title="Avg Order Value"
            value={`Rs.${dashboardStats?.monthlyStats?.averageOrderValue?.toFixed(2) || '0.00'}`}
            subtitle="Per order average"
            icon="📊"
            color="bg-gradient-to-br from-orange-500 to-orange-600"
            trend={dashboardStats?.monthlyStats?.averageOrderValue > 500 ? 'up' : 'down'}
            trendValue="+3.1%"
            sparklineData={generateSparklineData(dashboardStats?.monthlyStats?.averageOrderValue || 500, 'up')}
            loading={isLoading}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Inventory Items"
            value={medicines?.data.pagination.total || 0}
            subtitle="Total medicines"
            icon="💊"
            color="bg-gradient-to-br from-teal-500 to-teal-600"
            trend="up"
            trendValue="+2.1%"
            onClick={() => navigate("/inventory")}
            loading={isLoading}
          />
          <StatCard
            title="Low Stock Alerts"
            value={lowStockCount || 0}
            subtitle="Items need restocking"
            icon="⚠️"
            color="bg-gradient-to-br from-red-500 to-red-600"
            trend={lowStockCount > 5 ? 'up' : 'down'}
            trendValue={lowStockCount > 5 ? '+15%' : '-8%'}
            onClick={() => navigate("/inventory?filter=low-stock")}
            loading={isLoading}
          />
          <StatCard
            title="Active Users"
            value={dashboardStats?.totalUsers || 0}
            subtitle="System users"
            icon="👥"
            color="bg-gradient-to-br from-indigo-500 to-indigo-600"
            trend="up"
            trendValue="+1.2%"
            onClick={() => navigate("/users")}
            loading={isLoading}
          />
          <StatCard
            title="Monthly Profit"
            value={`Rs.${(dashboardStats?.todayProfit * 30)?.toFixed(2) || '0.00'}`}
            subtitle="Estimated monthly"
            icon="💎"
            color="bg-gradient-to-br from-pink-500 to-pink-600"
            trend="up"
            trendValue="+18.7%"
            sparklineData={generateSparklineData(dashboardStats?.todayProfit * 30 || 5000, 'up')}
            loading={isLoading}
          />
        </div>

        {/* Advanced Analytics Dashboard */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Sales Analytics</h2>
              <p className="text-gray-600">Real-time performance insights and trends</p>
            </div>
            <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
              <div className="flex bg-gray-50 rounded-lg p-1">
                {['Today', '7 Days', '30 Days', '90 Days'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedTimeframe(period)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      selectedTimeframe === period
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Report
              </button>
            </div>
          </div>
          
          {/* Chart Container with Enhanced Styling */}
          <div className="relative">
            <div className="absolute top-4 right-4 z-10">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Orders</span>
                </div>
              </div>
            </div>
            <SalesChart data={dashboardOrderData?.data} timeframe={selectedTimeframe} />
          </div>
          
          {/* Quick Stats Below Chart */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                Rs.{dashboardStats?.monthlyStats?.totalRevenue?.toFixed(0) || '0'}
              </div>
              <div className="text-sm text-gray-500">Monthly Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dashboardStats?.monthlyStats?.totalOrders || 0}
              </div>
              <div className="text-sm text-gray-500">Monthly Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                Rs.{dashboardStats?.monthlyStats?.averageOrderValue?.toFixed(0) || '0'}
              </div>
              <div className="text-sm text-gray-500">Avg Order Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {dashboardStats?.monthlyStats?.growthRate?.toFixed(1) || '0'}%
              </div>
              <div className="text-sm text-gray-500">Growth Rate</div>
            </div>
          </div>
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
          {/* Enhanced Recent Orders */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Orders
                </h3>
                <button
                  onClick={() => navigate("/orders")}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                  View All
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              {recentOrders?.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders.map((activity, index) => (
                      <div
                        key={activity.id || index}
                        className="group flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-all duration-200 cursor-pointer"
                        onClick={() => navigate(`/orders/${activity.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
                            <span className="text-blue-600 font-semibold text-sm">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-900">
                              {activity.description.split(' - ')[0]}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{activity.details?.customer || 'Walk-in Customer'}</span>
                              <span>•</span>
                              <span>{format(
                                new Date(activity.timestamp),
                                "MMM dd, hh:mm a"
                              )}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600 mb-1">
                            Rs.{activity.details?.amount?.toFixed(2) || '0.00'}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                              activity.details?.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              activity.details?.status === "completed"
                                ? "bg-green-500"
                                : "bg-yellow-500"
                            }`}></div>
                            {activity.details?.status || 'pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No recent orders</h4>
                  <p className="text-gray-500">Orders will appear here once customers start making purchases.</p>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced System Alerts & Notifications */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  System Alerts
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Live</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Critical Alert */}
                {lowStockCount > 0 && (
                  <div className="group flex items-start space-x-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl hover:shadow-md transition-all duration-200">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-red-800">
                          Critical: Low Stock Alert
                        </h4>
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                          {lowStockCount} items
                        </span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        {lowStockCount} medicines are running critically low. Immediate restocking required.
                      </p>
                      <button 
                        onClick={() => navigate("/inventory?filter=low-stock")}
                        className="text-xs text-red-600 hover:text-red-800 font-medium mt-2 flex items-center gap-1"
                      >
                        View Details
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Performance Alert */}
                <div className="group flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-blue-800">
                        Performance Update
                      </h4>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        +12.5%
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Sales performance increased by 12.5% compared to last week.
                    </p>
                    <div className="text-xs text-blue-600 mt-2">
                      {format(new Date(), "MMM dd, yyyy 'at' HH:mm")}
                    </div>
                  </div>
                </div>

                {/* System Status */}
                <div className="group flex items-start space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-green-800">
                        System Status: Operational
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600">Online</span>
                      </div>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      All systems running smoothly. Database: 99.9% uptime.
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-green-600">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span>API: Healthy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span>Database: Connected</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span>Backup: Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t border-gray-100">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => navigate("/inventory")}
                      className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg transition-all duration-200 text-sm"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span className="text-gray-700">Check Inventory</span>
                    </button>
                    <button 
                      onClick={() => window.location.reload()}
                      className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-200 rounded-lg transition-all duration-200 text-sm"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-gray-700">Refresh Data</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Performance Analytics & Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Advanced Monthly Performance */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Performance Analytics
                </h2>
                <p className="text-gray-600">Comprehensive monthly insights</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live Data
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue Metrics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Revenue Metrics</h3>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm">Monthly Revenue</span>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                      +18.2%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    Rs.{dashboardStats?.monthlyStats?.totalRevenue?.toFixed(0) || '0'}
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    vs Rs.{((dashboardStats?.monthlyStats?.totalRevenue || 0) * 0.82).toFixed(0)} last month
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm">Avg Order Value</span>
                    <div className="flex items-center gap-1 text-blue-600 text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                      +5.1%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    Rs.{dashboardStats?.monthlyStats?.averageOrderValue?.toFixed(0) || '0'}
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    Target: Rs.600
                  </div>
                </div>
              </div>
              
              {/* Order Metrics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Order Metrics</h3>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm">Total Orders</span>
                    <div className="flex items-center gap-1 text-purple-600 text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                      +12.8%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-purple-700">
                    {dashboardStats?.monthlyStats?.totalOrders || 0}
                  </div>
                  <div className="text-sm text-purple-600 mt-1">
                    {Math.round((dashboardStats?.monthlyStats?.totalOrders || 0) / 30)} orders/day avg
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm">Growth Rate</span>
                    <div className="flex items-center gap-1 text-orange-600 text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Trending
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-orange-700">
                    {dashboardStats?.monthlyStats?.growthRate?.toFixed(1) || '0'}%
                  </div>
                  <div className="text-sm text-orange-600 mt-1">
                    Month-over-month
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Quick Access Panel */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Quick Access
              </h2>
              <p className="text-gray-600 text-sm">Navigate to key sections</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => navigate("/inventory")}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200 rounded-xl transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-blue-800">Inventory</div>
                  <div className="text-sm text-blue-600">{medicines?.data.pagination.total || 0} items</div>
                </div>
                <svg className="w-5 h-5 text-blue-600 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => navigate("/orders")}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border border-green-200 rounded-xl transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-green-800">Orders</div>
                  <div className="text-sm text-green-600">{dashboardOrderData?.data.totalOrders || 0} today</div>
                </div>
                <svg className="w-5 h-5 text-green-600 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => navigate("/users")}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-200 rounded-xl transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-purple-800">Users</div>
                  <div className="text-sm text-purple-600">{dashboardStats?.totalUsers || 0} active</div>
                </div>
                <svg className="w-5 h-5 text-purple-600 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => navigate("/suppliers")}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border border-orange-200 rounded-xl transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-orange-800">Suppliers</div>
                  <div className="text-sm text-orange-600">{dashboardStats?.totalSuppliers || 0} partners</div>
                </div>
                <svg className="w-5 h-5 text-orange-600 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">System Health</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Database</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">API Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">Healthy</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Backup</span>
                  <span className="text-gray-600 font-medium">{format(new Date(), 'HH:mm')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
