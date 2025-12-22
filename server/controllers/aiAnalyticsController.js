const { query } = require('../config/database');

/**
 * AI Analytics Controller
 * Generates intelligent insights from database patterns
 */

/**
 * Get AI-powered insights based on database analysis
 * Analyzes sales velocity, stock levels, expiry patterns
 */
const getAIInsights = async (req, res) => {
    try {
        const organizationId = req.user.organization_id;
        const insights = [];

        // 1. Low Stock Velocity Analysis
        const lowStockResult = await query(`
      SELECT p.id, p.name, p.low_stock_threshold,
             COALESCE(SUM(ib.quantity), 0) as total_stock,
             COALESCE(
               (SELECT SUM(oi.quantity) FROM order_items oi 
                JOIN orders o ON oi.order_id = o.id 
                WHERE oi.medicine_id = p.id 
                AND o.created_at >= NOW() - INTERVAL '7 days'), 0
             ) as week_sales
      FROM products p
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      WHERE p.organization_id = $1 AND p.is_active = true
      GROUP BY p.id, p.name, p.low_stock_threshold
      HAVING COALESCE(SUM(ib.quantity), 0) < COALESCE(p.low_stock_threshold, 10)
      ORDER BY total_stock ASC
      LIMIT 5
    `, [organizationId]);

        if (lowStockResult.rows.length > 0) {
            const items = lowStockResult.rows.map(r => r.name).join(', ');
            insights.push({
                type: 'alert',
                title: 'Low Stock Alert',
                description: `${lowStockResult.rows.length} products are below reorder level: ${items}`,
                confidence: 95,
                action: 'Reorder Now',
                priority: 'high',
                data: lowStockResult.rows
            });
        }

        // 2. Fast-Moving Products (High Velocity)
        const fastMovingResult = await query(`
      SELECT p.name, 
             COUNT(oi.id) as order_count,
             SUM(oi.quantity) as total_sold,
             SUM(oi.quantity * oi.unit_price) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.medicine_id = p.id
      WHERE o.organization_id = $1 
        AND o.status = 'completed'
        AND o.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 5
    `, [organizationId]);

        if (fastMovingResult.rows.length > 0) {
            const topProduct = fastMovingResult.rows[0];
            insights.push({
                type: 'trend',
                title: 'Top Performer This Week',
                description: `${topProduct.name} sold ${topProduct.total_sold} units generating Rs.${parseFloat(topProduct.revenue).toFixed(0)} revenue`,
                confidence: 100,
                action: 'View Details',
                priority: 'medium',
                data: fastMovingResult.rows
            });
        }

        // 3. Expiry Risk Analysis
        const expiryRiskResult = await query(`
      SELECT COUNT(*) as count, 
             SUM(ib.quantity * ib.cost_price) as potential_loss
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE p.organization_id = $1 
        AND ib.expiry_date <= NOW() + INTERVAL '30 days'
        AND ib.quantity > 0
    `, [organizationId]);

        if (expiryRiskResult.rows[0]?.count > 0) {
            const loss = parseFloat(expiryRiskResult.rows[0].potential_loss || 0);
            insights.push({
                type: 'recommendation',
                title: 'Expiry Risk Detected',
                description: `${expiryRiskResult.rows[0].count} batches expire within 30 days. Potential loss: Rs.${loss.toFixed(0)}`,
                confidence: 90,
                action: 'View RTV',
                priority: 'high'
            });
        }

        // 4. Revenue Trend Analysis
        const revenueTrendResult = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN total_amount END), 0) as this_week,
        COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' THEN total_amount END), 0) as last_week
      FROM orders
      WHERE organization_id = $1 AND status = 'completed'
    `, [organizationId]);

        const thisWeek = parseFloat(revenueTrendResult.rows[0]?.this_week || 0);
        const lastWeek = parseFloat(revenueTrendResult.rows[0]?.last_week || 0);
        const growthPct = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100).toFixed(1) : thisWeek > 0 ? 100 : 0;

        insights.push({
            type: growthPct >= 0 ? 'trend' : 'alert',
            title: growthPct >= 0 ? 'Revenue Growing' : 'Revenue Declining',
            description: `This week: Rs.${thisWeek.toFixed(0)} vs last week: Rs.${lastWeek.toFixed(0)} (${growthPct >= 0 ? '+' : ''}${growthPct}%)`,
            confidence: 100,
            action: 'View Analytics',
            priority: growthPct < -10 ? 'high' : 'low'
        });

        // 5. Customer Pattern Analysis
        const customerPatternResult = await query(`
      SELECT 
        COUNT(DISTINCT customer_name) as unique_customers,
        COUNT(*) as total_orders,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE organization_id = $1 
        AND status = 'completed'
        AND created_at >= NOW() - INTERVAL '7 days'
    `, [organizationId]);

        const avgOrder = parseFloat(customerPatternResult.rows[0]?.avg_order_value || 0);
        insights.push({
            type: 'optimization',
            title: 'Customer Insights',
            description: `${customerPatternResult.rows[0]?.unique_customers || 0} customers, ${customerPatternResult.rows[0]?.total_orders || 0} orders, avg Rs.${avgOrder.toFixed(0)} per order`,
            confidence: 100,
            action: 'View Customers',
            priority: 'low'
        });

        res.json({
            success: true,
            data: {
                insights,
                generatedAt: new Date().toISOString(),
                period: '7 days'
            }
        });
    } catch (error) {
        console.error('AI Insights error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating AI insights'
        });
    }
};

/**
 * Get AI predictions for sales and inventory
 */
const getAIPredictions = async (req, res) => {
    try {
        const organizationId = req.user.organization_id;
        const { metric = 'revenue', range = '7d' } = req.query;

        // Get historical data for predictions
        const historicalResult = await query(`
      SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE organization_id = $1 
        AND status = 'completed'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [organizationId]);

        const historyData = historicalResult.rows;

        // Simple moving average prediction
        const avgDailyRevenue = historyData.length > 0
            ? historyData.reduce((sum, d) => sum + parseFloat(d.revenue || 0), 0) / historyData.length
            : 0;

        const avgDailyOrders = historyData.length > 0
            ? historyData.reduce((sum, d) => sum + parseInt(d.orders || 0), 0) / historyData.length
            : 0;

        // Generate 7-day forecast
        const forecast = [];
        for (let i = 1; i <= 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            // Add some variance for realistic forecast
            const variance = 0.9 + Math.random() * 0.2;
            forecast.push({
                date: date.toISOString().split('T')[0],
                predictedRevenue: Math.round(avgDailyRevenue * variance),
                predictedOrders: Math.round(avgDailyOrders * variance),
                confidence: 75 - (i * 3) // Confidence decreases with time
            });
        }

        // Get items needing restock
        const restockResult = await query(`
      SELECT p.name, p.low_stock_threshold,
             COALESCE(SUM(ib.quantity), 0) as current_stock,
             COALESCE(
               (SELECT AVG(daily.qty) FROM (
                 SELECT DATE(o.created_at), SUM(oi.quantity) as qty
                 FROM order_items oi
                 JOIN orders o ON o.id = oi.order_id
                 WHERE oi.medicine_id = p.id AND o.created_at >= NOW() - INTERVAL '14 days'
                 GROUP BY DATE(o.created_at)
               ) daily), 0
             ) as avg_daily_sales
      FROM products p
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      WHERE p.organization_id = $1 AND p.is_active = true
      GROUP BY p.id, p.name, p.low_stock_threshold
      HAVING COALESCE(SUM(ib.quantity), 0) > 0
      ORDER BY COALESCE(SUM(ib.quantity), 0) / NULLIF(
        (SELECT AVG(daily.qty) FROM (
          SELECT DATE(o.created_at), SUM(oi.quantity) as qty
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.medicine_id = p.id AND o.created_at >= NOW() - INTERVAL '14 days'
          GROUP BY DATE(o.created_at)
        ) daily), 0
      ) ASC NULLS LAST
      LIMIT 5
    `, [organizationId]);

        res.json({
            success: true,
            data: {
                nextWeekSales: Math.round(avgDailyRevenue * 7),
                nextWeekOrders: Math.round(avgDailyOrders * 7),
                forecast,
                inventoryNeeds: restockResult.rows,
                customerDemand: avgDailyOrders > 10 ? 'high' : avgDailyOrders > 5 ? 'medium' : 'low',
                methodology: 'Moving Average (30-day)',
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('AI Predictions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating predictions'
        });
    }
};

/**
 * Get real-time KPIs
 */
const getKPIs = async (req, res) => {
    try {
        const organizationId = req.user.organization_id;

        const [revenueResult, ordersResult, inventoryResult, customersResult] = await Promise.all([
            // Revenue KPIs
            query(`
        SELECT 
          COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN total_amount END), 0) as today,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN total_amount END), 0) as week,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN total_amount END), 0) as month,
          COALESCE(AVG(total_amount), 0) as avg_order
        FROM orders 
        WHERE organization_id = $1 AND status = 'completed'
      `, [organizationId]),

            // Order KPIs  
            query(`
        SELECT 
          COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as week,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM orders 
        WHERE organization_id = $1
      `, [organizationId]),

            // Inventory KPIs
            query(`
        SELECT 
          COUNT(DISTINCT p.id) as total_products,
          COALESCE(SUM(ib.quantity), 0) as total_units,
          COUNT(DISTINCT CASE WHEN ib.expiry_date <= NOW() + INTERVAL '30 days' THEN ib.id END) as expiring_batches,
          COUNT(DISTINCT CASE WHEN COALESCE((
            SELECT SUM(quantity) FROM inventory_batches WHERE product_id = p.id
          ), 0) < COALESCE(p.low_stock_threshold, 10) THEN p.id END) as low_stock
        FROM products p
        LEFT JOIN inventory_batches ib ON p.id = ib.product_id
        WHERE p.organization_id = $1 AND p.is_active = true
      `, [organizationId]),

            // Customer KPIs
            query(`
        SELECT 
          COUNT(DISTINCT customer_name) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as active,
          COUNT(DISTINCT customer_name) as total
        FROM orders 
        WHERE organization_id = $1 AND customer_name IS NOT NULL
      `, [organizationId])
        ]);

        const revenue = revenueResult.rows[0];
        const orders = ordersResult.rows[0];
        const inventory = inventoryResult.rows[0];
        const customers = customersResult.rows[0];

        res.json({
            success: true,
            data: {
                revenue: {
                    today: parseFloat(revenue.today || 0),
                    week: parseFloat(revenue.week || 0),
                    month: parseFloat(revenue.month || 0),
                    avgOrder: parseFloat(revenue.avg_order || 0)
                },
                orders: {
                    today: parseInt(orders.today || 0),
                    week: parseInt(orders.week || 0),
                    completed: parseInt(orders.completed || 0),
                    pending: parseInt(orders.pending || 0),
                    completionRate: orders.completed > 0
                        ? ((orders.completed / (orders.completed + orders.pending)) * 100).toFixed(1)
                        : 0
                },
                inventory: {
                    products: parseInt(inventory.total_products || 0),
                    units: parseInt(inventory.total_units || 0),
                    expiringBatches: parseInt(inventory.expiring_batches || 0),
                    lowStock: parseInt(inventory.low_stock || 0)
                },
                customers: {
                    active: parseInt(customers.active || 0),
                    total: parseInt(customers.total || 0)
                },
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('KPIs error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching KPIs'
        });
    }
};

/**
 * Get smart alerts based on thresholds
 */
const getSmartAlerts = async (req, res) => {
    try {
        const organizationId = req.user.organization_id;
        const alerts = [];

        // Check for expired stock
        const expiredResult = await query(`
      SELECT COUNT(*) as count, SUM(ib.quantity * ib.cost_price) as value
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE p.organization_id = $1 AND ib.expiry_date < NOW() AND ib.quantity > 0
    `, [organizationId]);

        if (expiredResult.rows[0]?.count > 0) {
            alerts.push({
                id: 'expired-stock',
                title: 'Expired Stock Detected',
                message: `${expiredResult.rows[0].count} batches have expired. Value: Rs.${parseFloat(expiredResult.rows[0].value || 0).toFixed(0)}`,
                priority: 'high',
                type: 'danger',
                timestamp: new Date().toISOString()
            });
        }

        // Check for pending orders
        const pendingResult = await query(`
      SELECT COUNT(*) as count FROM orders 
      WHERE organization_id = $1 AND status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'
    `, [organizationId]);

        if (pendingResult.rows[0]?.count > 0) {
            alerts.push({
                id: 'pending-orders',
                title: 'Pending Orders',
                message: `${pendingResult.rows[0].count} orders pending for over 1 hour`,
                priority: 'medium',
                type: 'warning',
                timestamp: new Date().toISOString()
            });
        }

        // Low stock alert
        const lowStockResult = await query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM products p
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      WHERE p.organization_id = $1 AND p.is_active = true
      GROUP BY p.id
      HAVING COALESCE(SUM(ib.quantity), 0) < 10
    `, [organizationId]);

        if (lowStockResult.rows.length > 0) {
            alerts.push({
                id: 'low-stock',
                title: 'Low Stock Warning',
                message: `${lowStockResult.rows.length} products are running low on stock`,
                priority: 'medium',
                type: 'warning',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            data: {
                alerts,
                count: alerts.length
            }
        });
    } catch (error) {
        console.error('Smart Alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching alerts'
        });
    }
};

module.exports = {
    getAIInsights,
    getAIPredictions,
    getKPIs,
    getSmartAlerts
};
