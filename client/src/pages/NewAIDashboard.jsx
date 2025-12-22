import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Brain, TrendingUp, TrendingDown, AlertTriangle, Target,
    DollarSign, Package, ShoppingCart, Users, Zap, Clock,
    RefreshCw, ChevronRight, Eye, Activity
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';
import '../styles/dashboard-glass.css';

/**
 * AI-Powered Dashboard - Phase 5
 * Glassmorphism design with real-time DB data and AI insights
 */
const NewAIDashboard = () => {
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState('7d');

    // Fetch KPIs
    const { data: kpisData, isLoading: kpisLoading, refetch: refetchKpis } = useQuery({
        queryKey: ['ai-kpis'],
        queryFn: async () => {
            const res = await api.get('/ai-analytics/kpis');
            return res.data.data;
        },
        refetchInterval: 60000, // Auto-refresh every minute
    });

    // Fetch AI Insights
    const { data: insightsData, isLoading: insightsLoading } = useQuery({
        queryKey: ['ai-insights'],
        queryFn: async () => {
            const res = await api.get('/ai-analytics/insights');
            return res.data.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch Predictions
    const { data: predictionsData } = useQuery({
        queryKey: ['ai-predictions', timeRange],
        queryFn: async () => {
            const res = await api.get('/ai-analytics/predictions', { params: { range: timeRange } });
            return res.data.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch Smart Alerts
    const { data: alertsData } = useQuery({
        queryKey: ['ai-alerts'],
        queryFn: async () => {
            const res = await api.get('/ai-analytics/alerts');
            return res.data.data;
        },
        refetchInterval: 30000,
    });

    const kpis = kpisData || { revenue: {}, orders: {}, inventory: {}, customers: {} };
    const insights = insightsData?.insights || [];
    const predictions = predictionsData || { forecast: [], nextWeekSales: 0 };
    const alerts = alertsData?.alerts || [];

    const handleRefresh = () => {
        refetchKpis();
    };

    const getInsightIcon = (type) => {
        switch (type) {
            case 'alert': return <AlertTriangle className="w-5 h-5 text-red-400" />;
            case 'trend': return <TrendingUp className="w-5 h-5 text-green-400" />;
            case 'recommendation': return <Zap className="w-5 h-5 text-yellow-400" />;
            case 'optimization': return <Target className="w-5 h-5 text-purple-400" />;
            default: return <Brain className="w-5 h-5 text-blue-400" />;
        }
    };

    return (
        <div className="dashboard-glass">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-glass-primary flex items-center gap-3">
                        <Brain className="w-8 h-8 text-purple-400" />
                        AI Command Center
                    </h1>
                    <p className="text-glass-secondary mt-1">
                        Real-time analytics powered by intelligent insights
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="live-indicator">
                        <div className="live-dot"></div>
                        <span className="text-glass-secondary text-sm">Live</span>
                    </div>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-glass-primary text-sm focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="24h">24 Hours</option>
                        <option value="7d">7 Days</option>
                        <option value="30d">30 Days</option>
                    </select>
                    <button
                        onClick={handleRefresh}
                        className="glass-card p-2 hover:bg-white/10"
                    >
                        <RefreshCw className={`w-5 h-5 text-glass-secondary ${kpisLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="dashboard-grid dashboard-grid-4 mb-8">
                {/* Revenue Card */}
                <div className="glass-card kpi-card success animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-green-500/20">
                            <DollarSign className="w-6 h-6 text-green-400" />
                        </div>
                        <span className="glass-badge success">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Live
                        </span>
                    </div>
                    <div className="kpi-value" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {formatCurrency(kpis.revenue?.today || 0)}
                    </div>
                    <p className="kpi-label">Today's Revenue</p>
                    <div className="mt-3 text-glass-muted text-sm">
                        Week: {formatCurrency(kpis.revenue?.week || 0)}
                    </div>
                </div>

                {/* Orders Card */}
                <div className="glass-card kpi-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-blue-500/20">
                            <ShoppingCart className="w-6 h-6 text-blue-400" />
                        </div>
                        <span className="glass-badge">
                            {kpis.orders?.completionRate || 0}% complete
                        </span>
                    </div>
                    <div className="kpi-value">
                        {kpis.orders?.today || 0}
                    </div>
                    <p className="kpi-label">Orders Today</p>
                    <div className="mt-3 text-glass-muted text-sm">
                        Pending: {kpis.orders?.pending || 0}
                    </div>
                </div>

                {/* Inventory Card */}
                <div className="glass-card kpi-card warning animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-yellow-500/20">
                            <Package className="w-6 h-6 text-yellow-400" />
                        </div>
                        {kpis.inventory?.lowStock > 0 && (
                            <span className="glass-badge warning">
                                {kpis.inventory.lowStock} low
                            </span>
                        )}
                    </div>
                    <div className="kpi-value" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {kpis.inventory?.products || 0}
                    </div>
                    <p className="kpi-label">Products</p>
                    <div className="mt-3 text-glass-muted text-sm">
                        {kpis.inventory?.units?.toLocaleString() || 0} units in stock
                    </div>
                </div>

                {/* Customers Card */}
                <div className="glass-card kpi-card animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-purple-500/20">
                            <Users className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                    <div className="kpi-value" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {kpis.customers?.active || 0}
                    </div>
                    <p className="kpi-label">Active Customers</p>
                    <div className="mt-3 text-glass-muted text-sm">
                        Total: {kpis.customers?.total || 0}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid dashboard-grid-3 mb-8">
                {/* AI Insights Panel */}
                <div className="glass-card p-6 col-span-2 animate-slide-up" style={{ animationDelay: '0.5s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-glass-primary flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-400" />
                            AI Insights
                        </h2>
                        <span className="text-glass-muted text-sm">{insights.length} insights</span>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto glass-scrollbar">
                        {insightsLoading ? (
                            <div className="text-center py-8">
                                <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
                                <p className="text-glass-muted mt-2">Analyzing data...</p>
                            </div>
                        ) : insights.length === 0 ? (
                            <div className="text-center py-8 text-glass-muted">
                                No insights available
                            </div>
                        ) : (
                            insights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className={`insight-item ${insight.type}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {getInsightIcon(insight.type)}
                                        <div className="flex-1">
                                            <h4 className="font-medium text-glass-primary">{insight.title}</h4>
                                            <p className="text-sm text-glass-secondary mt-1">{insight.description}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-glass-muted">
                                                    {insight.confidence}% confidence
                                                </span>
                                                <button className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                                    {insight.action}
                                                    <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Smart Alerts Panel */}
                <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-glass-primary flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            Alerts
                        </h2>
                        <span className={`glass-badge ${alerts.length > 0 ? 'danger' : 'success'}`}>
                            {alerts.length}
                        </span>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto glass-scrollbar">
                        {alerts.length === 0 ? (
                            <div className="text-center py-8">
                                <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                <p className="text-glass-secondary">All systems normal</p>
                            </div>
                        ) : (
                            alerts.map((alert, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-lg border-l-3 ${alert.priority === 'high'
                                            ? 'bg-red-500/10 border-l-red-500'
                                            : 'bg-yellow-500/10 border-l-yellow-500'
                                        }`}
                                    style={{ borderLeftWidth: '3px' }}
                                >
                                    <h4 className="font-medium text-glass-primary text-sm">{alert.title}</h4>
                                    <p className="text-xs text-glass-secondary mt-1">{alert.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Forecast Chart */}
            <div className="dashboard-grid dashboard-grid-2">
                <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.7s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-glass-primary flex items-center gap-2">
                            <Eye className="w-5 h-5 text-indigo-400" />
                            7-Day Forecast
                        </h2>
                        <span className="text-glass-muted text-sm">
                            Predicted: {formatCurrency(predictions.nextWeekSales || 0)}
                        </span>
                    </div>
                    <div className="chart-container h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={predictions.forecast || []}>
                                <defs>
                                    <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="rgba(255,255,255,0.4)"
                                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('en', { weekday: 'short' })}
                                />
                                <YAxis
                                    stroke="rgba(255,255,255,0.4)"
                                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                                    tickFormatter={(val) => `Rs.${(val / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(0,0,0,0.8)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="predictedRevenue"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="url(#forecastGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.8s' }}>
                    <h2 className="text-xl font-semibold text-glass-primary mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => navigate('/inventory')}
                            className="glass-card p-4 hover:bg-white/10 text-left group"
                        >
                            <Package className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-glass-primary font-medium block">Inventory</span>
                            <span className="text-glass-muted text-sm">{kpis.inventory?.products} items</span>
                        </button>
                        <button
                            onClick={() => navigate('/orders')}
                            className="glass-card p-4 hover:bg-white/10 text-left group"
                        >
                            <ShoppingCart className="w-6 h-6 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-glass-primary font-medium block">Orders</span>
                            <span className="text-glass-muted text-sm">{kpis.orders?.pending} pending</span>
                        </button>
                        <button
                            onClick={() => navigate('/rtv-suggestions')}
                            className="glass-card p-4 hover:bg-white/10 text-left group"
                        >
                            <Clock className="w-6 h-6 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-glass-primary font-medium block">RTV</span>
                            <span className="text-glass-muted text-sm">{kpis.inventory?.expiringBatches} expiring</span>
                        </button>
                        <button
                            onClick={() => navigate('/suppliers')}
                            className="glass-card p-4 hover:bg-white/10 text-left group"
                        >
                            <Users className="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-glass-primary font-medium block">Suppliers</span>
                            <span className="text-glass-muted text-sm">Manage</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewAIDashboard;
