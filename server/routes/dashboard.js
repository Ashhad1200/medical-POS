const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");
const { query } = require("../config/database");

// Protected routes
router.use(auth);

// Get basic dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    // Get basic counts using PostgreSQL
    const [
      totalUsersResult,
      totalOrdersResult,
      totalMedicinesResult,
      totalSuppliersResult,
    ] = await Promise.all([
      query(
        "SELECT COUNT(*) as count FROM users WHERE organization_id = $1 AND is_active = true",
        [organizationId]
      ),
      query("SELECT COUNT(*) as count FROM orders WHERE organization_id = $1", [
        organizationId,
      ]),
      query(
        "SELECT COUNT(*) as count FROM medicines WHERE organization_id = $1 AND is_active = true",
        [organizationId]
      ),
      query(
        "SELECT COUNT(*) as count FROM suppliers WHERE organization_id = $1 AND is_active = true",
        [organizationId]
      ),
    ]);

    const totalUsers = parseInt(totalUsersResult.rows[0].count);
    const totalOrders = parseInt(totalOrdersResult.rows[0].count);
    const totalMedicines = parseInt(totalMedicinesResult.rows[0].count);
    const totalSuppliers = parseInt(totalSuppliersResult.rows[0].count);

    // Get today's completed orders with revenue
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    const todayOrdersResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_amount, COUNT(*) as count
       FROM orders
       WHERE organization_id = $1 AND status = $2 AND created_at >= $3 AND created_at <= $4`,
      [organizationId, "completed", startOfDay, endOfDay]
    );

    const todayRevenue =
      parseFloat(todayOrdersResult.rows[0].total_amount) || 0;
    const todayOrders = parseInt(todayOrdersResult.rows[0].count) || 0;

    // Get this month's data
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyOrdersResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_amount, COUNT(*) as count
       FROM orders
       WHERE organization_id = $1 AND status = $2 AND created_at >= $3`,
      [organizationId, "completed", startOfMonth]
    );

    const monthlySales =
      parseFloat(monthlyOrdersResult.rows[0].total_amount) || 0;
    const monthlyOrders = parseInt(monthlyOrdersResult.rows[0].count) || 0;
    const averageOrderValue =
      monthlyOrders > 0 ? monthlySales / monthlyOrders : 0;

    // Get pending orders count
    const pendingResult = await query(
      "SELECT COUNT(*) as count FROM orders WHERE organization_id = $1 AND status = $2",
      [organizationId, "pending"]
    );
    const pendingOrdersCount = parseInt(pendingResult.rows[0].count);

    // Get low stock medicines
    const lowStockResult = await query(
      "SELECT COUNT(*) as count FROM medicines WHERE organization_id = $1 AND is_active = true AND quantity < 10",
      [organizationId]
    );
    const lowStockMedicines = parseInt(lowStockResult.rows[0].count);

    // Get users by role
    const usersRoleResult = await query(
      `SELECT role_in_pos, COUNT(*) as count FROM users 
       WHERE organization_id = $1 AND is_active = true 
       GROUP BY role_in_pos`,
      [organizationId]
    );

    const usersByRole = { admin: 0, manager: 0, user: 0 };
    usersRoleResult.rows.forEach((row) => {
      const role = row.role_in_pos || "user";
      usersByRole[role] = parseInt(row.count);
    });

    // Calculate growth rate
    const lastMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const lastMonthResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_amount
       FROM orders
       WHERE organization_id = $1 AND status = $2 AND created_at >= $3 AND created_at <= $4`,
      [organizationId, "completed", lastMonthStart, lastMonthEnd]
    );

    const lastMonthSales =
      parseFloat(lastMonthResult.rows[0].total_amount) || 0;
    const growthRate =
      lastMonthSales > 0
        ? ((monthlySales - lastMonthSales) / lastMonthSales) * 100
        : monthlySales > 0
        ? 100
        : 0;

    const estimatedProfit = todayRevenue * 0.2;

    const stats = {
      totalUsers,
      totalOrders,
      totalMedicines,
      totalSuppliers,
      todayOrders,
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      todayProfit: parseFloat(estimatedProfit.toFixed(2)),
      lowStockItems: lowStockMedicines,
      pendingOrders: pendingOrdersCount,
      monthlyStats: {
        totalSales: parseFloat(monthlySales.toFixed(2)),
        totalOrders: monthlyOrders,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        growthRate: parseFloat(growthRate.toFixed(2)),
      },
      usersByRole,
      systemStatus: {
        status: "healthy",
        uptime: Math.floor(process.uptime()),
        database: "PostgreSQL",
        lastUpdate: new Date().toISOString(),
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
});

// Get recent activities
router.get("/activities", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const organizationId = req.user.organization_id;

    const activitiesResult = await query(
      `SELECT id, order_number, status, total_amount, created_at, customer_name
       FROM orders
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [organizationId, limit]
    );

    const activities = [];

    // Add order activities
    activitiesResult.rows.forEach((order) => {
      const amount = parseFloat(order.total_amount) || 0;
      activities.push({
        id: `order_${order.id}`,
        type: "order",
        description: `Order #${order.order_number || order.id} ${
          order.status
        } - Rs.${amount.toFixed(2)}`,
        timestamp: order.created_at,
        user: "System",
        details: {
          orderId: order.id,
          amount: amount,
          status: order.status,
          customer: order.customer_name || "Walk-in Customer",
        },
      });
    });

    // Add system activity
    activities.push({
      id: `system_${Date.now()}`,
      type: "system",
      description: "Dashboard statistics updated successfully",
      timestamp: new Date().toISOString(),
      user: "System",
      details: {
        action: "stats_update",
      },
    });

    const sortedActivities = activities.slice(0, limit);

    res.json({
      success: true,
      data: { activities: sortedActivities },
    });
  } catch (error) {
    console.error("Dashboard activities error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard activities",
      error: error.message,
    });
  }
});

// Get basic analytics (admin only)
router.get("/analytics", checkRole(["admin"]), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const salesDataResult = await query(
      `SELECT total_amount, created_at, status FROM orders
       WHERE organization_id = $1 AND status = $2
       ORDER BY created_at DESC
       LIMIT 30`,
      [organizationId, "completed"]
    );

    const salesData = salesDataResult.rows;
    const totalSales = salesData.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0
    );
    const totalOrders = salesData.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const analytics = {
      salesData: salesData || [],
      summary: {
        totalSales,
        totalOrders,
        averageOrderValue,
        period: "Last 30 days",
      },
      topMedicines: [],
      orderStatusDistribution: {
        completed: totalOrders,
        pending: 0,
        cancelled: 0,
      },
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard analytics",
      error: error.message,
    });
  }
});

// AI-powered insights endpoint
router.get("/ai-insights", checkRole(["admin"]), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    // Get recent orders (last 30 days)
    const recentOrdersResult = await query(
      `SELECT total_amount, created_at, status FROM orders
       WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC`,
      [organizationId]
    );

    const allOrdersResult = await query(
      `SELECT * FROM orders WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [organizationId]
    );

    const medicinesResult = await query(
      `SELECT name, quantity, reorder_level FROM medicines
       WHERE organization_id = $1 AND is_active = true`,
      [organizationId]
    );

    const orders = allOrdersResult.rows;
    const medicines = medicinesResult.rows;
    const insights = [];

    // Revenue trend analysis
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(
      today.getTime() - 14 * 24 * 60 * 60 * 1000
    );

    const recentOrders = recentOrdersResult.rows.filter(
      (o) => new Date(o.created_at) > sevenDaysAgo
    );
    const previousWeekOrders = recentOrdersResult.rows.filter(
      (o) =>
        new Date(o.created_at) <= sevenDaysAgo &&
        new Date(o.created_at) > fourteenDaysAgo
    );

    const weeklyRevenue = recentOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );
    const previousWeekRevenue = previousWeekOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );

    const growthRate =
      previousWeekRevenue > 0
        ? ((weeklyRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
        : 0;

    if (growthRate > 10) {
      insights.push({
        type: "trend",
        title: "Exceptional Growth Detected",
        description: `Revenue has increased by ${growthRate.toFixed(
          1
        )}% this week. Consider expanding inventory for high-demand items.`,
        confidence: 92,
        action: "View Growth Analysis",
        priority: "high",
        timestamp: new Date().toISOString(),
      });
    }

    // Inventory insights
    const lowStockItems = medicines.filter(
      (med) => med.quantity <= (med.reorder_level || 10)
    );
    if (lowStockItems.length > 0) {
      insights.push({
        type: "alert",
        title: "Inventory Replenishment Needed",
        description: `${lowStockItems.length} items are running low. Automated reorder suggestions available.`,
        confidence: 95,
        action: "View Reorder List",
        priority: "high",
        timestamp: new Date().toISOString(),
      });
    }

    // Order pattern insights
    const todayOrders = orders.filter(
      (o) => new Date(o.created_at).toDateString() === new Date().toDateString()
    ).length;

    if (todayOrders > 50) {
      insights.push({
        type: "optimization",
        title: "Peak Order Volume",
        description:
          "High order volume detected. Consider optimizing staff allocation for better efficiency.",
        confidence: 88,
        action: "Optimize Workflow",
        priority: "medium",
        timestamp: new Date().toISOString(),
      });
    }

    // Predictive insights
    insights.push({
      type: "prediction",
      title: "Sales Forecast",
      description: `Based on current trends, expect ${(growthRate > 0
        ? growthRate
        : 5
      ).toFixed(0)}% change in sales next week.`,
      confidence: 78,
      action: "View Forecast",
      priority: "medium",
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: { insights },
    });
  } catch (error) {
    console.error("AI insights error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating AI insights",
      error: error.message,
    });
  }
});

// AI predictions endpoint
router.get("/ai-predictions", checkRole(["admin"]), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    // Get historical orders (last 90 days)
    const historicalResult = await query(
      `SELECT total_amount, created_at FROM orders
       WHERE organization_id = $1 AND status = $2 AND created_at >= NOW() - INTERVAL '90 days'
       ORDER BY created_at ASC`,
      [organizationId, "completed"]
    );

    const historicalOrders = historicalResult.rows;

    // Calculate weekly revenues
    const weeklyData = {};
    historicalOrders.forEach((order) => {
      const week = new Date(order.created_at).toISOString().slice(0, 10);
      if (!weeklyData[week]) weeklyData[week] = 0;
      weeklyData[week] += order.total_amount || 0;
    });

    const weeks = Object.keys(weeklyData).sort();
    const revenues = weeks.map((week) => weeklyData[week]);

    // Calculate trend
    const recentRevenues = revenues.slice(-4);
    const avgGrowth =
      recentRevenues.length > 1
        ? recentRevenues.reduce((sum, rev, i) => {
            if (i === 0) return 0;
            return sum + (rev - recentRevenues[i - 1]) / recentRevenues[i - 1];
          }, 0) /
          (recentRevenues.length - 1)
        : 0;

    const lastWeekRevenue = recentRevenues[recentRevenues.length - 1] || 0;
    const nextWeekSales = lastWeekRevenue * (1 + avgGrowth);

    // Get top medicines from order_items
    const topMedicinesResult = await query(
      `SELECT m.name, SUM(oi.quantity) as total_quantity
       FROM order_items oi
       JOIN medicines m ON oi.medicine_id = m.id
       WHERE m.organization_id = $1 AND oi.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY m.name
       ORDER BY total_quantity DESC
       LIMIT 3`,
      [organizationId]
    );

    const inventoryNeeds = topMedicinesResult.rows.map((row) => row.name) || [
      "Paracetamol",
      "Vitamin D",
      "Cough Syrup",
    ];

    const predictions = {
      nextWeekSales: Math.round(nextWeekSales),
      inventoryNeeds,
      customerDemand:
        avgGrowth > 0.05
          ? "increasing"
          : avgGrowth < -0.05
          ? "decreasing"
          : "stable",
      optimalStockLevels: {
        prescription: 150,
        otc: 200,
        supplements: 100,
      },
      confidence: Math.min(90, Math.max(60, 80 - Math.abs(avgGrowth * 100))),
    };

    res.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    console.error("AI predictions error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating predictions",
      error: error.message,
    });
  }
});

// Smart alerts endpoint
router.get("/smart-alerts", checkRole(["admin"]), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const alerts = [];

    // Check for low stock alerts
    const lowStockResult = await query(
      `SELECT name, quantity, reorder_level FROM medicines
       WHERE organization_id = $1 AND is_active = true AND quantity < 15
       ORDER BY quantity ASC`,
      [organizationId]
    );

    lowStockResult.rows.forEach((medicine) => {
      alerts.push({
        type: "warning",
        title: "Stock Alert",
        message: `${medicine.name} inventory below optimal level (${medicine.quantity} remaining)`,
        timestamp: new Date().toISOString(),
        priority: medicine.quantity < 5 ? "high" : "medium",
      });
    });

    // Check for sales opportunities
    const recentResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders
       WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [organizationId]
    );

    const todayRevenue = parseFloat(recentResult.rows[0].total) || 0;

    if (todayRevenue > 5000) {
      alerts.push({
        type: "info",
        title: "Sales Opportunity",
        message: `Strong sales day detected (Rs.${todayRevenue.toFixed(
          2
        )}). Consider promoting complementary products.`,
        timestamp: new Date().toISOString(),
        priority: "low",
      });
    }

    // Check for pending orders
    const pendingResult = await query(
      `SELECT COUNT(*) as count FROM orders
       WHERE organization_id = $1 AND status = $2`,
      [organizationId, "pending"]
    );

    const pendingCount = parseInt(pendingResult.rows[0].count);

    if (pendingCount > 10) {
      alerts.push({
        type: "warning",
        title: "Order Processing Alert",
        message: `${pendingCount} orders pending processing. Review queue for efficiency.`,
        timestamp: new Date().toISOString(),
        priority: "medium",
      });
    }

    res.json({
      success: true,
      data: { alerts },
    });
  } catch (error) {
    console.error("Smart alerts error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating smart alerts",
      error: error.message,
    });
  }
});

// Performance analytics endpoint
router.get("/performance-analytics", checkRole(["admin"]), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const [ordersResult, medicinesResult, usersResult] = await Promise.all([
      query(
        `SELECT * FROM orders
         WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [organizationId]
      ),
      query(
        `SELECT * FROM medicines WHERE organization_id = $1 AND is_active = true`,
        [organizationId]
      ),
      query(
        `SELECT * FROM users WHERE organization_id = $1 AND is_active = true`,
        [organizationId]
      ),
    ]);

    const orders = ordersResult.rows;
    const medicines = medicinesResult.rows;
    const users = usersResult.rows;

    // Calculate performance metrics
    const completedOrders = orders.filter(
      (order) => order.status === "completed"
    );
    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0
    );
    const avgOrderValue =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Sales performance (target: 100k monthly)
    const salesPerformance = Math.min(100, (totalRevenue / 100000) * 100);

    // Inventory turnover
    const inventoryValue = medicines.reduce(
      (sum, med) => sum + (med.quantity || 0) * (med.selling_price || 0),
      0
    );
    const inventoryTurnover =
      inventoryValue > 0 ? (totalRevenue / inventoryValue) * 100 : 0;

    // Order fulfillment rate
    const fulfillmentRate =
      orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0;

    // Customer satisfaction (mock data)
    const customerSatisfaction = 85 + Math.random() * 10;

    const performanceMetrics = {
      sales: {
        current: Math.round(salesPerformance),
        target: 100,
        benchmark: 75,
      },
      profit: {
        current: Math.round(salesPerformance * 0.8),
        target: 90,
        benchmark: 70,
      },
      customerSatisfaction: {
        current: Math.round(customerSatisfaction),
        target: 95,
        benchmark: 85,
      },
      inventoryTurnover: {
        current: Math.min(100, Math.round(inventoryTurnover)),
        target: 80,
        benchmark: 60,
      },
      orderFulfillment: {
        current: Math.round(fulfillmentRate),
        target: 98,
        benchmark: 90,
      },
    };

    res.json({
      success: true,
      data: { performanceMetrics },
    });
  } catch (error) {
    console.error("Performance analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating performance analytics",
      error: error.message,
    });
  }
});

module.exports = router;
