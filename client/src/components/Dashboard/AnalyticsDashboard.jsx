import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ShoppingCartIcon,
  UsersIcon,
  BarChart3Icon,
  PackageIcon,
  ActivityIcon,
  AlertTriangleIcon,
  PieChartIcon,
  RefreshCwIcon,
  BrainIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon
} from './Icons';
import { useDashboard, useDashboardCache } from '../../hooks/useDashboard';
import { useMedicines } from '../../hooks/useMedicines';
import { useOrders } from '../../hooks/useOrders';
import { toast } from 'react-hot-toast';

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);
  const { stats, activities, orderData, isLoading, isError } = useDashboard();
  const { data: medicines } = useMedicines();
  const { data: orders } = useOrders();
  const { invalidateAll } = useDashboardCache();

  // Extract data from API responses
  const totalRevenue = stats?.todayRevenue || 0;
  const totalProfit = stats?.todayProfit || 0;
  const totalOrders = stats?.todayOrders || 0;
  const totalCustomers = stats?.totalUsers || 0;
  const totalMedicines = stats?.totalMedicines || 0;
  const lowStockItems = stats?.lowStockItems || 0;
  const pendingOrders = stats?.pendingOrders || 0;
  const monthlyRevenue = stats?.monthlyStats?.totalSales || 0;
  const monthlyOrders = stats?.monthlyStats?.totalOrders || 0;
  const averageOrderValue = stats?.monthlyStats?.averageOrderValue || 0;
  const growthRate = stats?.monthlyStats?.growthRate || 0;
  const totalSuppliers = stats?.totalSuppliers || 0;
  const systemUptime = stats?.systemStatus?.uptime || 0;

  // Sales trend data - use real data from orderData API or fallback to default
  const salesTrendData = orderData?.data?.weeklySales?.length > 0
    ? orderData.data.weeklySales.map(item => ({
        date: item.date,
        sales: item.sales || 0,
        profit: (item.sales || 0) * 0.2, // Assuming 20% profit margin
        orders: item.orders || 0
      }))
    : [
        { date: '2024-01-01', sales: 0, profit: 0, orders: 0 },
        { date: '2024-01-02', sales: 0, profit: 0, orders: 0 },
        { date: '2024-01-03', sales: 0, profit: 0, orders: 0 },
        { date: '2024-01-04', sales: 0, profit: 0, orders: 0 },
        { date: '2024-01-05', sales: 0, profit: 0, orders: 0 },
        { date: '2024-01-06', sales: 0, profit: 0, orders: 0 },
        { date: '2024-01-07', sales: 0, profit: 0, orders: 0 }
      ];

  // Product category data - use real data from stats API or fallback to default
  const categoryData = stats?.categoryDistribution?.length > 0 
    ? stats.categoryDistribution.map((item, index) => ({
        name: item.category || item.name,
        value: item.percentage || item.value,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]
      }))
    : [
        { name: 'Prescription Drugs', value: 45, color: '#3B82F6' },
        { name: 'OTC Medicines', value: 30, color: '#10B981' },
        { name: 'Medical Supplies', value: 15, color: '#F59E0B' },
        { name: 'Health Products', value: 10, color: '#EF4444' }
      ];

  // Top products data - use real data from medicines and orders or fallback to default
  const topProductsData = stats?.topProducts?.length > 0
    ? stats.topProducts.map(item => ({
        name: item.name || item.medicine_name,
        sales: item.sales || item.total_sales || 0,
        profit: (item.sales || item.total_sales || 0) * 0.3 // Assuming 30% profit margin
      }))
    : [
        { name: 'Paracetamol 500mg', sales: 1200, profit: 360 },
        { name: 'Amoxicillin 250mg', sales: 980, profit: 294 },
        { name: 'Ibuprofen 400mg', sales: 850, profit: 255 },
        { name: 'Vitamin D3', sales: 720, profit: 216 },
        { name: 'Blood Pressure Monitor', sales: 650, profit: 195 }
      ];

  // AI Insights - based on real data
  const aiInsights = [
    {
      type: growthRate > 0 ? 'opportunity' : 'warning',
      title: 'Sales Performance Analysis',
      description: growthRate > 0 
        ? `Sales have increased by ${Math.abs(growthRate).toFixed(1)}% compared to last period. ${growthRate > 10 ? 'Excellent growth trajectory!' : 'Steady growth maintained.'}`
        : `Sales have declined by ${Math.abs(growthRate).toFixed(1)}%. Consider reviewing marketing strategy and customer engagement.`,
      impact: Math.abs(growthRate) > 10 ? 'high' : 'medium',
      icon: growthRate > 0 ? TrendingUpIcon : TrendingDownIcon
    },
    {
      type: lowStockItems > 0 ? 'warning' : 'insight',
      title: 'Inventory Management Alert',
      description: lowStockItems > 0 
        ? `${lowStockItems} products are running low on stock. Immediate reorder recommended to prevent stockouts.`
        : 'All products are well-stocked. Excellent inventory management maintained.',
      impact: lowStockItems > 10 ? 'high' : lowStockItems > 0 ? 'medium' : 'low',
      icon: AlertTriangleIcon
    },
    {
      type: 'insight',
      title: 'Order Value Analysis',
      description: `Average order value is $${averageOrderValue.toFixed(2)} with ${totalOrders} orders today. ${pendingOrders > 0 ? `${pendingOrders} orders are pending processing.` : 'All orders processed efficiently.'}`,
      impact: averageOrderValue > 50 ? 'high' : 'medium',
      icon: ShoppingCartIcon
    },
    {
      type: totalProfit > totalRevenue * 0.15 ? 'opportunity' : 'warning',
      title: 'Profit Margin Optimization',
      description: totalRevenue > 0 
        ? `Current profit margin is ${((totalProfit/totalRevenue) * 100).toFixed(1)}%. ${totalProfit > totalRevenue * 0.2 ? 'Excellent profitability!' : totalProfit > totalRevenue * 0.15 ? 'Good profit margins maintained.' : 'Consider optimizing costs or pricing strategy.'}`
        : 'Insufficient data for profit analysis. Ensure proper revenue tracking.',
      impact: totalProfit > totalRevenue * 0.2 ? 'high' : 'medium',
      icon: DollarSignIcon
    }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await invalidateAll();
      toast.success('Dashboard refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  const StatCard = ({ title, value, change, icon: Icon, color, prefix = '', suffix = '' }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change > 0 ? (
                <TrendingUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDownIcon className="w-4 h-4 mr-1" />
              )}
              {Math.abs(change)}% from last period
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const InsightCard = ({ insight }) => {
    const getInsightColor = (type) => {
      switch (type) {
        case 'opportunity': return 'border-green-200 bg-green-50';
        case 'warning': return 'border-yellow-200 bg-yellow-50';
        case 'insight': return 'border-blue-200 bg-blue-50';
        default: return 'border-gray-200 bg-gray-50';
      }
    };

    const getIconColor = (type) => {
      switch (type) {
        case 'opportunity': return 'text-green-600';
        case 'warning': return 'text-yellow-600';
        case 'insight': return 'text-blue-600';
        default: return 'text-gray-600';
      }
    };

    return (
      <div className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}>
        <div className="flex items-start space-x-3">
          <insight.icon className={`w-5 h-5 mt-0.5 ${getIconColor(insight.type)}`} />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{insight.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
              insight.impact === 'high' ? 'bg-red-100 text-red-800' :
              insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {insight.impact} impact
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Failed to load dashboard data</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">AI-powered insights for your medical store</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCwIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={totalRevenue}
          change={12.5}
          icon={DollarSignIcon}
          color="bg-green-500"
          prefix="$"
        />
        <StatCard
          title="Total Profit"
          value={totalProfit}
          change={8.3}
          icon={TrendingUpIcon}
          color="bg-blue-500"
          prefix="$"
        />
        <StatCard
          title="Total Orders"
          value={totalOrders}
          change={15.2}
          icon={ShoppingCartIcon}
          color="bg-purple-500"
        />
        <StatCard
          title="Active Customers"
          value={totalCustomers}
          change={5.7}
          icon={UsersIcon}
          color="bg-orange-500"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Avg Order Value"
          value={averageOrderValue}
          change={3.2}
          icon={BarChart3Icon}
          color="bg-indigo-500"
          prefix="$"
        />
        <StatCard
          title="Total Medicines"
          value={totalMedicines}
          change={2.1}
          icon={PackageIcon}
          color="bg-pink-500"
        />
        <StatCard
          title="Growth Rate"
          value={growthRate}
          change={1.8}
          icon={ActivityIcon}
          color="bg-teal-500"
          suffix="%"
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockItems}
          change={-4.5}
          icon={AlertTriangleIcon}
          color="bg-red-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Sales Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales & Profit Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend />
              <Area type="monotone" dataKey="sales" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="profit" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products and AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProductsData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
              <Legend />
              <Bar dataKey="sales" fill="#3B82F6" name="Sales" />
              <Bar dataKey="profit" fill="#10B981" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {aiInsights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
        <div className="space-y-3">
          {activities?.data && activities.data.length > 0 ? (
            activities.data.slice(0, 5).map((activity, index) => {
              const getActivityType = (type) => {
                switch (type?.toLowerCase()) {
                  case 'order':
                  case 'sale':
                  case 'completed':
                    return 'success';
                  case 'warning':
                  case 'alert':
                  case 'low_stock':
                    return 'warning';
                  default:
                    return 'info';
                }
              };
              
              const activityType = getActivityType(activity.type);
              
              return (
                <div key={activity.id || index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activityType === 'success' ? 'bg-green-500' :
                      activityType === 'warning' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}></div>
                    <span className="text-gray-900">{activity.description || activity.message || activity.action}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {activity.time || activity.created_at ? 
                      new Date(activity.time || activity.created_at).toLocaleString() : 
                      'Recently'
                    }
                  </span>
                </div>
              );
            })
          ) : (
            // Fallback to sample data if no real activities
            [
              { action: 'No recent activities', time: 'Check back later', type: 'info' },
              { action: 'System initialized', time: 'Today', type: 'success' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'success' ? 'bg-green-500' :
                    activity.type === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}></div>
                  <span className="text-gray-900">{activity.action}</span>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;