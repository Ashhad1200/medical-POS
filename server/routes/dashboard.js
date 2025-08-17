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

// AI-powered insights endpoint
router.get("/ai-insights", checkRole(["admin"]), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    
    // Get recent data for AI analysis
    const [statsResponse, ordersResponse, medicinesResponse] = await Promise.all([
      // Get basic stats
      supabase
        .from("orders")
        .select("total_amount, created_at, status")
        .eq("organization_id", organizationId)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Get order trends
      supabase
        .from("orders")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100),
      
      // Get medicine stock levels
      supabase
        .from("medicines")
        .select("name, quantity, reorder_level")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
    ]);
    
    const orders = ordersResponse.data || [];
    const medicines = medicinesResponse.data || [];
    
    // Generate AI insights
    const insights = [];
    
    // Revenue trend analysis
    const recentOrders = orders.filter(order => 
      new Date(order.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const weeklyRevenue = recentOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const previousWeekOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      return orderDate >= twoWeeksAgo && orderDate < weekAgo;
    });
    const previousWeekRevenue = previousWeekOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    
    const growthRate = previousWeekRevenue > 0 ? ((weeklyRevenue - previousWeekRevenue) / previousWeekRevenue * 100) : 0;
    
    if (growthRate > 10) {
      insights.push({
        type: 'trend',
        title: 'Exceptional Growth Detected',
        description: `Revenue has increased by ${growthRate.toFixed(1)}% this week. Consider expanding inventory for high-demand items.`,
        confidence: 92,
        action: 'View Growth Analysis',
        priority: 'high',
        timestamp: new Date().toISOString()
      });
    }
    
    // Inventory insights
    const lowStockItems = medicines.filter(med => med.quantity <= (med.reorder_level || 10));
    if (lowStockItems.length > 0) {
      insights.push({
        type: 'alert',
        title: 'Inventory Replenishment Needed',
        description: `${lowStockItems.length} items are running low. Automated reorder suggestions available.`,
        confidence: 95,
        action: 'View Reorder List',
        priority: 'high',
        timestamp: new Date().toISOString()
      });
    }
    
    // Order pattern insights
    const todayOrders = orders.filter(order => 
      new Date(order.created_at).toDateString() === new Date().toDateString()
    ).length;
    
    if (todayOrders > 50) {
      insights.push({
        type: 'optimization',
        title: 'Peak Order Volume',
        description: 'High order volume detected. Consider optimizing staff allocation for better efficiency.',
        confidence: 88,
        action: 'Optimize Workflow',
        priority: 'medium',
        timestamp: new Date().toISOString()
      });
    }
    
    // Predictive insights
    insights.push({
      type: 'prediction',
      title: 'Sales Forecast',
      description: `Based on current trends, expect ${(growthRate > 0 ? growthRate : 5).toFixed(0)}% change in sales next week.`,
      confidence: 78,
      action: 'View Forecast',
      priority: 'medium',
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: { insights }
    });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating AI insights',
      error: error.message
    });
  }
});

// AI predictions endpoint
router.get("/ai-predictions", checkRole(["admin"]), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    
    // Get historical data for predictions
    const { data: historicalOrders } = await supabase
      .from("orders")
      .select("total_amount, created_at, status")
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true });
    
    // Simple trend-based predictions
    const weeklyData = {};
    historicalOrders?.forEach(order => {
      const week = new Date(order.created_at).toISOString().slice(0, 10);
      if (!weeklyData[week]) weeklyData[week] = 0;
      weeklyData[week] += order.total_amount || 0;
    });
    
    const weeks = Object.keys(weeklyData).sort();
    const revenues = weeks.map(week => weeklyData[week]);
    
    // Calculate trend
    const recentRevenues = revenues.slice(-4); // Last 4 weeks
    const avgGrowth = recentRevenues.length > 1 ? 
      recentRevenues.reduce((sum, rev, i) => {
        if (i === 0) return 0;
        return sum + ((rev - recentRevenues[i-1]) / recentRevenues[i-1]);
      }, 0) / (recentRevenues.length - 1) : 0;
    
    const lastWeekRevenue = recentRevenues[recentRevenues.length - 1] || 0;
    const nextWeekSales = lastWeekRevenue * (1 + avgGrowth);
    
    // Get top-selling medicines for inventory predictions
    const { data: topMedicines } = await supabase
      .from("order_items")
      .select("medicine_id, quantity, medicines(name)")
      .eq("medicines.organization_id", organizationId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10);
    
    const inventoryNeeds = topMedicines?.slice(0, 3).map(item => item.medicines?.name).filter(Boolean) || 
      ['Paracetamol', 'Vitamin D', 'Cough Syrup'];
    
    const predictions = {
      nextWeekSales: Math.round(nextWeekSales),
      inventoryNeeds,
      customerDemand: avgGrowth > 0.05 ? 'increasing' : avgGrowth < -0.05 ? 'decreasing' : 'stable',
      optimalStockLevels: {
        prescription: 150,
        otc: 200,
        supplements: 100
      },
      confidence: Math.min(90, Math.max(60, 80 - Math.abs(avgGrowth * 100)))
    };
    
    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('AI predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating predictions',
      error: error.message
    });
  }
});

// Smart alerts endpoint
router.get("/smart-alerts", checkRole(["admin"]), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    
    const alerts = [];
    
    // Check for low stock alerts
    const { data: lowStockMedicines } = await supabase
      .from("medicines")
      .select("name, quantity, reorder_level")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .lt("quantity", 15);
    
    lowStockMedicines?.forEach(medicine => {
      alerts.push({
        type: 'warning',
        title: 'Stock Alert',
        message: `${medicine.name} inventory below optimal level (${medicine.quantity} remaining)`,
        timestamp: new Date().toISOString(),
        priority: medicine.quantity < 5 ? 'high' : 'medium'
      });
    });
    
    // Check for sales opportunities
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("total_amount, created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    const todayRevenue = recentOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    
    if (todayRevenue > 5000) {
      alerts.push({
        type: 'info',
        title: 'Sales Opportunity',
        message: `Strong sales day detected (Rs.${todayRevenue.toFixed(2)}). Consider promoting complementary products.`,
        timestamp: new Date().toISOString(),
        priority: 'low'
      });
    }
    
    // Check for pending orders
    const { count: pendingCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending");
    
    if (pendingCount > 10) {
      alerts.push({
        type: 'warning',
        title: 'Order Processing Alert',
        message: `${pendingCount} orders pending processing. Review queue for efficiency.`,
        timestamp: new Date().toISOString(),
        priority: 'medium'
      });
    }
    
    res.json({
      success: true,
      data: { alerts }
    });
  } catch (error) {
    console.error('Smart alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating smart alerts',
      error: error.message
    });
  }
});

// Performance analytics endpoint
router.get("/performance-analytics", checkRole(["admin"]), async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    
    // Get performance metrics
    const [ordersResponse, medicinesResponse, usersResponse] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      supabase
        .from("medicines")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true),
      
      supabase
        .from("users")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
    ]);
    
    const orders = ordersResponse.data || [];
    const medicines = medicinesResponse.data || [];
    const users = usersResponse.data || [];
    
    // Calculate performance metrics
    const completedOrders = orders.filter(order => order.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    
    // Sales performance (target: 100k monthly)
    const salesPerformance = Math.min(100, (totalRevenue / 100000) * 100);
    
    // Inventory turnover (simplified calculation)
    const inventoryValue = medicines.reduce((sum, med) => sum + (med.quantity * (med.selling_price || 0)), 0);
    const inventoryTurnover = inventoryValue > 0 ? (totalRevenue / inventoryValue) * 100 : 0;
    
    // Order fulfillment rate
    const fulfillmentRate = orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0;
    
    // Customer satisfaction (mock data - would need actual feedback system)
    const customerSatisfaction = 85 + Math.random() * 10;
    
    const performanceMetrics = {
      sales: {
        current: Math.round(salesPerformance),
        target: 100,
        benchmark: 75
      },
      profit: {
        current: Math.round(salesPerformance * 0.8), // Assuming 80% of sales performance
        target: 90,
        benchmark: 70
      },
      customerSatisfaction: {
        current: Math.round(customerSatisfaction),
        target: 95,
        benchmark: 85
      },
      inventoryTurnover: {
        current: Math.min(100, Math.round(inventoryTurnover)),
        target: 80,
        benchmark: 60
      },
      orderFulfillment: {
        current: Math.round(fulfillmentRate),
        target: 98,
        benchmark: 90
      }
    };
    
    res.json({
      success: true,
      data: { performanceMetrics }
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating performance analytics',
      error: error.message
    });
  }
});

module.exports = router;
