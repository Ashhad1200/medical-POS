import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Brain,
  Target,
  Zap,
  Eye,
  Activity,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  Calendar,
  Clock,
  Lightbulb,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  RefreshCw,
  Download,
  Filter,
  Settings
} from 'lucide-react';
import { useDashboard, useDashboardCache } from '../../hooks/useDashboard';
import { useMedicines } from '../../hooks/useMedicines';
import { useOrders } from '../../hooks/useOrders';
import { useAIInsights, useAIPredictions, useSmartAlerts, usePerformanceAnalytics } from '../../hooks/useAIAnalytics';
import { Card } from '../UI/Card';
import {
  RealTimeSalesWidget,
  InventoryHealthWidget,
  OrderProcessingWidget,
  CustomerActivityWidget,
  PerformanceMetricsWidget,
  QuickActionsWidget
} from './AdvancedWidgets';

// Constants
const INSIGHT_TYPES = {
  PREDICTION: 'prediction',
  RECOMMENDATION: 'recommendation',
  ALERT: 'alert',
  TREND: 'trend',
  OPTIMIZATION: 'optimization'
};

const CHART_COLORS = {
  primary: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'],
  gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'],
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6'
};

// AI Stat Card Component
const AIStatCard = ({ title, value, change, trend, icon: Icon, subtitle }) => {
  const isPositive = change > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${
            trend === 'up' ? 'bg-green-100 text-green-600' :
            trend === 'down' ? 'bg-red-100 text-red-600' :
            'bg-blue-100 text-blue-600'
          }`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        <div className={`flex items-center space-x-1 text-sm ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          <TrendIcon className="w-4 h-4" />
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
    </Card>
  );
};

// AI Insight Card Component
const AIInsightCard = ({ insight }) => {
  const getInsightIcon = (type) => {
    switch (type) {
      case INSIGHT_TYPES.PREDICTION: return Target;
      case INSIGHT_TYPES.RECOMMENDATION: return Lightbulb;
      case INSIGHT_TYPES.ALERT: return AlertTriangle;
      case INSIGHT_TYPES.TREND: return TrendingUp;
      case INSIGHT_TYPES.OPTIMIZATION: return Zap;
      default: return Brain;
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case INSIGHT_TYPES.PREDICTION: return 'blue';
      case INSIGHT_TYPES.RECOMMENDATION: return 'yellow';
      case INSIGHT_TYPES.ALERT: return 'red';
      case INSIGHT_TYPES.TREND: return 'green';
      case INSIGHT_TYPES.OPTIMIZATION: return 'purple';
      default: return 'gray';
    }
  };

  const Icon = getInsightIcon(insight.type);
  const color = getInsightColor(insight.type);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{insight.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">
              Confidence: {insight.confidence}%
            </span>
            <button className={`text-xs px-2 py-1 rounded bg-${color}-50 text-${color}-600 hover:bg-${color}-100`}>
              {insight.action}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Main Component
const AIAnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  
  const { stats: dashboardData, isLoading, error } = useDashboard();
  const { refreshStats } = useDashboardCache();
  const { data: medicinesData } = useMedicines();
  const { data: ordersData } = useOrders();
  
  // AI Analytics hooks for real data
  const { data: aiInsightsData } = useAIInsights(timeRange);
  const { data: aiPredictionsData } = useAIPredictions('revenue', timeRange);
  const { data: smartAlertsData } = useSmartAlerts();
  const { data: performanceAnalyticsData } = usePerformanceAnalytics(timeRange);
  
  // Use real AI insights and predictions from API
  const aiInsights = aiInsightsData?.data?.insights || [];
  const predictions = aiPredictionsData?.data || {};
  const smartAlerts = smartAlertsData?.data?.alerts || [];
  
  // Enhanced data processing
  const processedData = useMemo(() => {
    if (!dashboardData) return null;
    
    return {
      revenue: dashboardData.totalRevenue || 0,
      profit: (dashboardData.totalRevenue || 0) * 0.2, // Assuming 20% profit margin
      orders: dashboardData.totalOrders || 0,
      medicines: dashboardData.totalMedicines || 0,
      customers: dashboardData.totalCustomers || 0,
      growth: {
        revenue: dashboardData.revenueGrowth || 0,
        orders: dashboardData.ordersGrowth || 0,
        customers: dashboardData.customersGrowth || 0
      }
    };
  }, [dashboardData]);
  
  // Real performance data from AI analytics
  const performanceMetrics = useMemo(() => {
    if (performanceAnalyticsData?.data?.performanceMetrics) {
      const metrics = performanceAnalyticsData.data.performanceMetrics;
      return [
        { metric: 'Sales', current: metrics.sales?.current || 0, target: metrics.sales?.target || 100, benchmark: metrics.sales?.benchmark || 75 },
        { metric: 'Profit', current: metrics.profit?.current || 0, target: metrics.profit?.target || 90, benchmark: metrics.profit?.benchmark || 70 },
        { metric: 'Customer Satisfaction', current: metrics.customerSatisfaction?.current || 0, target: metrics.customerSatisfaction?.target || 95, benchmark: metrics.customerSatisfaction?.benchmark || 85 },
        { metric: 'Inventory Turnover', current: metrics.inventoryTurnover?.current || 0, target: metrics.inventoryTurnover?.target || 80, benchmark: metrics.inventoryTurnover?.benchmark || 60 },
        { metric: 'Order Fulfillment', current: metrics.orderFulfillment?.current || 0, target: metrics.orderFulfillment?.target || 98, benchmark: metrics.orderFulfillment?.benchmark || 90 }
      ];
    }
    // Fallback to calculated values from dashboard data
    return [
      { metric: 'Sales', current: processedData?.revenue ? Math.min((processedData.revenue / 1000), 100) : 0, target: 100, benchmark: 75 },
      { metric: 'Profit', current: processedData?.profit ? Math.min((processedData.profit / 500), 100) : 0, target: 90, benchmark: 70 },
      { metric: 'Customer Satisfaction', current: 92, target: 95, benchmark: 85 },
      { metric: 'Inventory Turnover', current: processedData?.medicines ? Math.min((processedData.medicines / 10), 100) : 0, target: 80, benchmark: 60 },
      { metric: 'Order Fulfillment', current: processedData?.orders ? Math.min((processedData.orders * 2), 100) : 0, target: 98, benchmark: 90 }
    ];
  }, [performanceAnalyticsData, processedData]);
  
  // Real trend data from orders history
  const trendData = useMemo(() => {
    if (!ordersData?.data || !Array.isArray(ordersData.data)) return [];
    
    const last7Days = ordersData.data
      .filter(order => {
        const orderDate = new Date(order.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
      })
      .reduce((acc, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, profit: 0, orders: 0 };
        }
        acc[date].revenue += parseFloat(order.total_amount || 0);
        acc[date].profit += parseFloat(order.total_amount || 0) * 0.2; // Assuming 20% profit margin
        acc[date].orders += 1;
        return acc;
      }, {});
    
    return Object.values(last7Days).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [ordersData]);
  
  // Real category data from medicines
  const categoryData = useMemo(() => {
    if (!medicinesData?.data || !Array.isArray(medicinesData.data)) return [];
    
    const categories = medicinesData.data.reduce((acc, medicine) => {
      const category = medicine.category || 'Other';
      if (!acc[category]) {
        acc[category] = { name: category, value: 0, count: 0 };
      }
      acc[category].value += parseFloat(medicine.price || 0) * parseInt(medicine.quantity || 0);
      acc[category].count += 1;
      return acc;
    }, {});
    
    return Object.values(categories).sort((a, b) => b.value - a.value);
  }, [medicinesData]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshStats();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'new-order':
        console.log('Navigate to new order');
        break;
      case 'add-medicine':
        console.log('Navigate to add medicine');
        break;
      case 'view-reports':
        console.log('Navigate to reports');
        break;
      case 'manage-users':
        console.log('Navigate to user management');
        break;
      default:
        console.log('Unknown action:', actionId);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading AI Analytics...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Brain className="w-8 h-8 text-blue-600 mr-3" />
            AI Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Intelligent insights powered by advanced analytics and machine learning
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* AI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AIStatCard
          title="Revenue"
          value={`Rs.${processedData?.revenue?.toLocaleString() || '0'}`}
          change={processedData?.growth?.revenue || 0}
          trend={processedData?.growth?.revenue > 0 ? 'up' : 'down'}
          icon={DollarSign}
          subtitle="Total Revenue"
        />
        <AIStatCard
          title="Orders"
          value={processedData?.orders?.toLocaleString() || '0'}
          change={processedData?.growth?.orders || 0}
          trend={processedData?.growth?.orders > 0 ? 'up' : 'down'}
          icon={ShoppingCart}
          subtitle="Total Orders"
        />
        <AIStatCard
          title="Medicines"
          value={processedData?.medicines?.toLocaleString() || '0'}
          change={5.2}
          trend="up"
          icon={Package}
          subtitle="In Stock"
        />
        <AIStatCard
          title="Customers"
          value={processedData?.customers?.toLocaleString() || '0'}
          change={processedData?.growth?.customers || 0}
          trend={processedData?.growth?.customers > 0 ? 'up' : 'down'}
          icon={Users}
          subtitle="Active Customers"
        />
      </div>

      {/* AI Insights and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Brain className="w-5 h-5 text-blue-600 mr-2" />
                AI Insights
              </h2>
              <span className="text-sm text-gray-500">{aiInsights.length} insights</span>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {aiInsights.length > 0 ? (
                aiInsights.map((insight, index) => (
                  <AIInsightCard key={index} insight={insight} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No AI insights available</p>
              )}
            </div>
          </Card>
        </div>

        {/* Smart Alerts */}
        <div>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                Smart Alerts
              </h2>
              <span className="text-sm text-gray-500">{smartAlerts.length} alerts</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {smartAlerts.length > 0 ? (
                smartAlerts.map((alert, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    alert.priority === 'high' ? 'border-red-500 bg-red-50' :
                    alert.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No alerts</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Performance Metrics */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="w-5 h-5 text-green-600 mr-2" />
          Performance Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {performanceMetrics.map((metric, index) => (
            <div key={index} className="text-center">
              <h3 className="text-sm font-medium text-gray-500 mb-2">{metric.metric}</h3>
              <div className="relative w-20 h-20 mx-auto">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={metric.current >= metric.target ? CHART_COLORS.success : CHART_COLORS.warning}
                    strokeWidth="2"
                    strokeDasharray={`${metric.current}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{metric.current}%</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Target: {metric.target}% | Benchmark: {metric.benchmark}%
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <LineChartIcon className="w-5 h-5 text-blue-600 mr-2" />
            Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary[0]} fill={CHART_COLORS.primary[0]} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Distribution */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <PieChartIcon className="w-5 h-5 text-purple-600 mr-2" />
            Medicine Categories
          </h2>
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
                  <Cell key={`cell-${index}`} fill={CHART_COLORS.primary[index % CHART_COLORS.primary.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* AI Predictions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Eye className="w-5 h-5 text-indigo-600 mr-2" />
          AI Predictions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">Next Week Sales</h3>
            <p className="text-2xl font-bold text-blue-600">Rs.{predictions.nextWeekSales?.toLocaleString()}</p>
            <p className="text-sm text-blue-700">Predicted Revenue</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">Inventory Needs</h3>
            <p className="text-2xl font-bold text-green-600">{predictions.inventoryNeeds?.length || 0}</p>
            <p className="text-sm text-green-700">Items to Restock</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900">Customer Demand</h3>
            <p className="text-2xl font-bold text-purple-600 capitalize">{predictions.customerDemand}</p>
            <p className="text-sm text-purple-700">Trend Direction</p>
          </div>
        </div>
      </Card>

      {/* Advanced Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <RealTimeSalesWidget />
        <InventoryHealthWidget />
        <OrderProcessingWidget />
        <CustomerActivityWidget />
        <PerformanceMetricsWidget />
        <QuickActionsWidget onAction={handleQuickAction} />
      </div>
    </div>
  );
};

export default AIAnalyticsDashboard;