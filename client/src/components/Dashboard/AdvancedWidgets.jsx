import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  Activity,
  Zap,
  Target,
  Eye,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw
} from 'lucide-react';
import { Card } from '../UI/Card';

// Real-time Sales Widget
export const RealTimeSalesWidget = ({ data, isLoading }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const currentSales = data?.todayRevenue || 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedValue(prev => {
        const diff = currentSales - prev;
        return prev + (diff * 0.1);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentSales]);

  const salesGrowth = data?.growthRate || 0;

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-500 rounded-lg">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Real-time Sales</h3>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-600">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-3xl font-bold text-gray-900">
            ${animatedValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-sm text-gray-600">Today's Revenue</div>
        </div>

        <div className="flex items-center space-x-2">
          {salesGrowth >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
            {Math.abs(salesGrowth).toFixed(1)}% vs yesterday
          </span>
        </div>

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Updating...</span>
          </div>
        )}
      </div>
    </Card>
  );
};

// Inventory Health Widget
export const InventoryHealthWidget = ({ data }) => {
  const totalMedicines = data?.totalMedicines || 0;
  const lowStockItems = data?.lowStockItems || 0;
  const healthPercentage = totalMedicines > 0 ? ((totalMedicines - lowStockItems) / totalMedicines) * 100 : 100;

  const getHealthColor = () => {
    if (healthPercentage >= 80) return 'text-green-600';
    if (healthPercentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthStatus = () => {
    if (healthPercentage >= 80) return 'Excellent';
    if (healthPercentage >= 60) return 'Good';
    return 'Needs Attention';
  };

  const healthData = [
    { name: 'Healthy Stock', value: healthPercentage, fill: '#10B981' },
    { name: 'Low Stock', value: 100 - healthPercentage, fill: '#EF4444' }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-500 rounded-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Inventory Health</h3>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex-1">
          <div className={`text-2xl font-bold ${getHealthColor()}`}>
            {healthPercentage.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 mb-2">{getHealthStatus()}</div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Items:</span>
              <span className="font-medium">{totalMedicines}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Low Stock:</span>
              <span className="font-medium text-red-600">{lowStockItems}</span>
            </div>
          </div>
        </div>

        <div className="w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={healthData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {healthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

// Order Processing Widget
export const OrderProcessingWidget = ({ data }) => {
  const totalOrders = data?.todayOrders || 0;
  const pendingOrders = data?.pendingOrders || 0;
  const completedOrders = totalOrders - pendingOrders;
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  const orderData = [
    { name: 'Completed', value: completedOrders, fill: '#10B981' },
    { name: 'Pending', value: pendingOrders, fill: '#F59E0B' }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-purple-500 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Order Processing</h3>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Completion Rate</div>
          <div className="text-lg font-bold text-purple-600">
            {completionRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{completedOrders}</div>
            <div className="text-xs text-green-700">Completed</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
            <div className="text-xs text-yellow-700">Pending</div>
          </div>
        </div>

        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
      </div>
    </Card>
  );
};

// Customer Activity Widget
export const CustomerActivityWidget = ({ data }) => {
  const totalCustomers = data?.totalUsers || 0;
  const activeCustomers = Math.floor(totalCustomers * 0.7); // Mock active customers
  const newCustomers = Math.floor(totalCustomers * 0.1); // Mock new customers

  const activityData = [
    { time: '9 AM', customers: 12 },
    { time: '10 AM', customers: 18 },
    { time: '11 AM', customers: 25 },
    { time: '12 PM', customers: 32 },
    { time: '1 PM', customers: 28 },
    { time: '2 PM', customers: 35 },
    { time: '3 PM', customers: 42 },
    { time: '4 PM', customers: 38 }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-indigo-500 rounded-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Customer Activity</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-indigo-600">{totalCustomers}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{activeCustomers}</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{newCustomers}</div>
            <div className="text-xs text-gray-600">New</div>
          </div>
        </div>

        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData}>
              <Area
                type="monotone"
                dataKey="customers"
                stroke="#6366F1"
                fill="#6366F1"
                fillOpacity={0.3}
              />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis hide />
              <Tooltip />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

// Performance Metrics Widget
export const PerformanceMetricsWidget = ({ data }) => {
  const metrics = [
    {
      name: 'Sales Target',
      current: 85,
      target: 100,
      color: '#3B82F6',
      icon: Target
    },
    {
      name: 'Customer Satisfaction',
      current: 92,
      target: 95,
      color: '#10B981',
      icon: CheckCircle
    },
    {
      name: 'Order Fulfillment',
      current: 88,
      target: 90,
      color: '#F59E0B',
      icon: Clock
    },
    {
      name: 'Inventory Turnover',
      current: 76,
      target: 80,
      color: '#EF4444',
      icon: Activity
    }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gray-700 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const percentage = (metric.current / metric.target) * 100;
          const IconComponent = metric.icon;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <IconComponent className="w-4 h-4" style={{ color: metric.color }} />
                  <span className="text-sm font-medium">{metric.name}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {metric.current}/{metric.target}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(percentage, 100)}%`,
                    backgroundColor: metric.color
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// Quick Actions Widget
export const QuickActionsWidget = ({ onAction }) => {
  const actions = [
    {
      id: 'new-order',
      label: 'New Order',
      icon: ShoppingCart,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Create a new customer order'
    },
    {
      id: 'add-medicine',
      label: 'Add Medicine',
      icon: Package,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Add new medicine to inventory'
    },
    {
      id: 'view-reports',
      label: 'View Reports',
      icon: BarChart3,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Access detailed analytics'
    },
    {
      id: 'manage-users',
      label: 'Manage Users',
      icon: Users,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      description: 'User management panel'
    }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-orange-500 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const IconComponent = action.icon;

          return (
            <button
              key={action.id}
              onClick={() => onAction?.(action.id)}
              className={`p-3 rounded-lg text-white text-left transition-colors ${action.color}`}
              title={action.description}
            >
              <div className="flex items-center space-x-2">
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{action.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

// Expiry Alerts Widget (Phase 4 - Pharma Compliance)
export const ExpiryAlertsWidget = ({ data, isLoading, onViewAll }) => {
  const expired = data?.expired || [];
  const critical = data?.critical || [];
  const expiringSoon = data?.expiringSoon || [];

  const totalAlerts = expired.length + critical.length + expiringSoon.length;

  const getUrgencyColor = (status) => {
    switch (status) {
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'critical': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyIcon = (status) => {
    if (status === 'expired') return '🚨';
    if (status === 'critical') return '⚠️';
    return '⏰';
  };

  // Combine and sort by expiry date
  const allAlerts = [
    ...expired.map(b => ({ ...b, status: 'expired' })),
    ...critical.map(b => ({ ...b, status: 'critical' })),
    ...expiringSoon.slice(0, 3).map(b => ({ ...b, status: 'expiring_soon' }))
  ].slice(0, 5);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-l-4 border-red-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-red-500 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Expiry Alerts</h3>
            <p className="text-xs text-gray-500">{totalAlerts} batches need attention</p>
          </div>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All →
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-red-50 rounded-lg">
          <div className="text-xl font-bold text-red-600">{expired.length}</div>
          <div className="text-xs text-red-700">Expired</div>
        </div>
        <div className="text-center p-2 bg-orange-50 rounded-lg">
          <div className="text-xl font-bold text-orange-600">{critical.length}</div>
          <div className="text-xs text-orange-700">Critical (7d)</div>
        </div>
        <div className="text-center p-2 bg-yellow-50 rounded-lg">
          <div className="text-xl font-bold text-yellow-600">{expiringSoon.length}</div>
          <div className="text-xs text-yellow-700">Soon (30d)</div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {allAlerts.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">No expiry alerts! 🎉</p>
          </div>
        ) : (
          allAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border ${getUrgencyColor(alert.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>{getUrgencyIcon(alert.status)}</span>
                  <div>
                    <div className="text-sm font-medium truncate max-w-[150px]">
                      {alert.name}
                    </div>
                    <div className="text-xs opacity-75">
                      Batch: {alert.batch_number || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium">
                    {alert.quantity} units
                  </div>
                  <div className="text-xs opacity-75">
                    {alert.expiry_date ? new Date(alert.expiry_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default {
  RealTimeSalesWidget,
  InventoryHealthWidget,
  OrderProcessingWidget,
  CustomerActivityWidget,
  PerformanceMetricsWidget,
  QuickActionsWidget,
  ExpiryAlertsWidget
};