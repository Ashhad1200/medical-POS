const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");
const { supabase } = require("../config/supabase");

// Protected routes
router.use(auth);

// Get basic dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    // Get basic counts from Supabase
    const [
      { count: totalUsers },
      { count: totalOrders },
      { count: totalMedicines },
      { count: totalSuppliers },
    ] = await Promise.all([
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("medicines")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true),
      supabase
        .from("suppliers")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true),
    ]);

    // Get today's orders with revenue calculation
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).toISOString();
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    ).toISOString();

    // Get today's completed orders with amounts
    const { data: todayOrdersData, count: todayOrders } = await supabase
      .from("orders")
      .select("total_amount, discount_amount, tax_amount")
      .eq("organization_id", organizationId)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .eq("status", "completed");

    // Calculate today's revenue
    const todayRevenue = todayOrdersData?.reduce((sum, order) => {
      return sum + (parseFloat(order.total_amount) || 0);
    }, 0) || 0;

    // Get this month's data for comparison
    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    ).toISOString();
    
    const { data: monthlyOrdersData, count: monthlyOrders } = await supabase
      .from("orders")
      .select("total_amount, discount_amount, tax_amount")
      .eq("organization_id", organizationId)
      .gte("created_at", startOfMonth)
      .eq("status", "completed");

    const monthlySales = monthlyOrdersData?.reduce((sum, order) => {
      return sum + (parseFloat(order.total_amount) || 0);
    }, 0) || 0;

    const averageOrderValue = monthlyOrders > 0 ? monthlySales / monthlyOrders : 0;

    // Get pending orders count
    const { count: pendingOrdersCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending");

    // Get low stock medicines
    const { count: lowStockMedicines } = await supabase
      .from("medicines")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .lt("quantity", 10);

    // Get users by role
    const { data: usersData } = await supabase
      .from("users")
      .select("role_in_pos")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    const usersByRole = usersData?.reduce((acc, user) => {
      const role = user.role_in_pos || 'user';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, { admin: 0, manager: 0, user: 0 }) || { admin: 0, manager: 0, user: 0 };

    // Calculate growth rate (comparing this month to last month)
    const lastMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    ).toISOString();
    const lastMonthEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      0,
      23,
      59,
      59,
      999
    ).toISOString();

    const { data: lastMonthOrdersData } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("organization_id", organizationId)
      .gte("created_at", lastMonthStart)
      .lte("created_at", lastMonthEnd)
      .eq("status", "completed");

    const lastMonthSales = lastMonthOrdersData?.reduce((sum, order) => {
      return sum + (parseFloat(order.total_amount) || 0);
    }, 0) || 0;

    const growthRate = lastMonthSales > 0 
      ? ((monthlySales - lastMonthSales) / lastMonthSales * 100)
      : monthlySales > 0 ? 100 : 0;

    // Estimate profit (assuming 20% margin - this should be calculated from actual cost data)
    const estimatedProfit = todayRevenue * 0.2;

    const stats = {
      totalUsers: totalUsers || 0,
      totalOrders: totalOrders || 0,
      totalMedicines: totalMedicines || 0,
      totalSuppliers: totalSuppliers || 0,
      todayOrders: todayOrders || 0,
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      todayProfit: parseFloat(estimatedProfit.toFixed(2)),
      lowStockItems: lowStockMedicines || 0,
      pendingOrders: pendingOrdersCount || 0,
      monthlyStats: {
        totalSales: parseFloat(monthlySales.toFixed(2)),
        totalOrders: monthlyOrders || 0,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        growthRate: parseFloat(growthRate.toFixed(2)),
      },
      usersByRole,
      systemStatus: {
        status: "healthy",
        uptime: Math.floor(process.uptime()),
        database: "Supabase PostgreSQL",
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
    const limit = parseInt(req.query.limit) || 10;
    const organizationId = req.user.organization_id;

    // Get recent orders
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Get recent users
    const { data: recentUsers } = await supabase
      .from("users")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);

    // Format activities
    const activities = [];

    // Add order activities
    if (recentOrders) {
      recentOrders.forEach((order) => {
        activities.push({
          id: `order_${order.id}`,
          type: "order",
          description: `Order #${order.order_number || order.id} ${
            order.status
          } - Rs.${order.total_amount?.toFixed(2) || "0.00"}`,
          timestamp: order.created_at,
          user: "System",
          details: {
            orderId: order.id,
            amount: order.total_amount,
            status: order.status,
            customer: order.customer_name || "Walk-in Customer",
          },
        });
      });
    }

    // Add user registration activities
    if (recentUsers) {
      recentUsers.forEach((user) => {
        activities.push({
          id: `user_${user.id}`,
          type: "user",
          description: `New ${user.role} user registered: ${user.full_name}`,
          timestamp: user.created_at,
          user: "System",
          details: {
            userId: user.id,
            username: user.username,
            role: user.role,
          },
        });
      });
    }

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

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

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

    // Get basic sales data
    const { data: salesData } = await supabase
      .from("orders")
      .select("total_amount, created_at, status")
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(30);

    // Calculate basic analytics
    const totalSales =
      salesData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) ||
      0;
    const totalOrders = salesData?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const analytics = {
      salesData: salesData || [],
      summary: {
        totalSales,
        totalOrders,
        averageOrderValue,
        period: "Last 30 days",
      },
      topMedicines: [], // TODO: Implement
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

module.exports = router;
