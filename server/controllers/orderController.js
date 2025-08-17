const { supabase } = require("../config/supabase");

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      customerName,
    } = req.query;
    const organizationId = req.user.organization_id;

    let query = supabase
      .from("orders")
      .select(`
        *,
        order_items(
          *,
          medicines(name)
        )
      `)
      .eq("organization_id", organizationId);

    // Apply status filter
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Apply date range filter
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // Apply customer name filter
    if (customerName) {
      query = query.ilike("customer_name", `%${customerName}%`);
    }

    // Apply sorting and pagination
    query = query.order("created_at", { ascending: false });
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching orders",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: {
        orders: orders || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || orders?.length || 0,
          pages: Math.ceil((count || orders?.length || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
    });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(
          *,
          medicines(name)
        )
      `)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (error || !order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order",
    });
  }
};

// Create order
const createOrder = async (req, res) => {
  try {
    const {
      user_id,
      customer_name,
      customer_phone,
      customer_email,
      items,
      total_amount,
      tax_amount,
      tax_percent,
      subtotal,
      profit,
      discount,
      discount_percent,
      payment_method,
      payment_status,
      status,
      completed_at,
      notes,
    } = req.body;

    const organizationId = req.user.organization_id;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Start a transaction
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id,
        customer_name,
        customer_phone,
        customer_email,
        organization_id: organizationId,
        total_amount: parseFloat(total_amount),
        tax_amount: parseFloat(tax_amount || 0),
        tax_percent: parseFloat(tax_percent || 0),
        subtotal: parseFloat(subtotal),
        profit: parseFloat(profit || 0),
        discount: parseFloat(discount || 0),
        discount_percent: parseFloat(discount_percent || 0),
        payment_method,
        payment_status: payment_status || 'pending',
        status: status || 'pending',
        completed_at,
        notes,
      })
      .select()
      .single();

    if (orderError) {
      return res.status(400).json({
        success: false,
        message: "Error creating order",
        error: orderError.message,
      });
    }

    // Create order items
    if (items && items.length > 0) {
      const orderItems = items.map((item) => ({
        order_id: order.id,
        medicine_id: item.medicine_id,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        discount: parseFloat(item.discount || 0),
        discount_percent: parseFloat(item.discount_percent || 0),
        cost_price: parseFloat(item.cost_price),
        profit: parseFloat(item.profit || 0),
        gst_amount: parseFloat(item.gst_amount || 0),
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        // Rollback order creation if items fail
        await supabase.from("orders").delete().eq("id", order.id);
        return res.status(400).json({
          success: false,
          message: "Error creating order items",
          error: itemsError.message,
        });
      }

      // Update medicine quantities
      for (const item of items) {
        // First get the current quantity
        const { data: medicine } = await supabase
          .from("medicines")
          .select("quantity")
          .eq("id", item.medicine_id)
          .eq("organization_id", organizationId)
          .single();

        if (medicine) {
          const newQuantity = medicine.quantity - item.quantity;
          await supabase
            .from("medicines")
            .update({
              quantity: newQuantity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.medicine_id)
            .eq("organization_id", organizationId);
        }
      }
    }

    // Get the complete order with items
    const { data: completeOrder } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order.id)
      .single();

    res.status(201).json({
      success: true,
      data: { order: completeOrder },
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating order",
    });
  }
};

// Get dashboard data
const getDashboardData = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const { range = "daily" } = req.query; // Default to 'daily'

    const now = new Date();
    let startDate,
      endDate = now.toISOString();

    switch (range) {
      case "weekly":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7
        ).toISOString();
        break;
      case "monthly":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        ).toISOString();
        break;
      case "yearly":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        ).toISOString();
        break;
      case "daily":
      default:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ).toISOString();
        break;
    }

    // Get orders within the selected range
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("total_amount, status, created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (ordersError) {
      return res.status(500).json({
        success: false,
        message: "Error fetching dashboard data",
        error: ordersError.message,
      });
    }

    const dashboardData = {
      totalOrders: orders?.length || 0,
      totalRevenue:
        orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
      completedOrders:
        orders?.filter((order) => order.status === "completed").length || 0,
      pendingOrders:
        orders?.filter((order) => order.status === "pending").length || 0,
    };

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Get dashboard data error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
    });
  }
};

const PDFDocument = require("pdfkit");

// ... (existing code)

const getOrderPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const { data: order, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (error || !order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=order-${order.order_number}.pdf`
    );

    doc.pipe(res);

    // Add header
    doc.fontSize(20).text("Order Receipt", { align: "center" });
    doc.moveDown();

    // Add order details
    doc.fontSize(12).text(`Order Number: ${order.order_number}`);
    doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`);
    doc.text(`Customer: ${order.customer_name || 'Walk-in Customer'}`);
    doc.moveDown();

    // Add table header
    doc.font("Helvetica-Bold");
    doc.text("Item", 50, 200);
    doc.text("Quantity", 250, 200);
    doc.text("Unit Price", 350, 200);
    doc.text("Total", 450, 200);
    doc.font("Helvetica");
    doc.moveDown();

    // Add table rows
    let y = 220;
    order.order_items.forEach((item) => {
      doc.text(item.medicine_id, 50, y);
      doc.text(item.quantity, 250, y);
      doc.text(item.unit_price.toFixed(2), 350, y);
      doc.text(item.total_price.toFixed(2), 450, y);
      y += 20;
    });

    // Add totals
    doc.moveDown();
    doc.text(`Subtotal: ${order.subtotal.toFixed(2)}`, { align: "right" });
    doc.text(`Tax: ${order.tax_amount.toFixed(2)}`, { align: "right" });
    doc.text(`Discount: ${order.discount.toFixed(2)}`, {
      align: "right",
    });
    doc.font("Helvetica-Bold");
    doc.text(`Total: ${order.total_amount.toFixed(2)}`, { align: "right" });
    doc.font("Helvetica");

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Get order PDF error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating PDF",
    });
  }
};

const getSalesChartData = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    // Last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const { data: weeklyData, error: weeklyError } = await supabase
      .from("orders")
      .select("created_at, total_amount")
      .eq("organization_id", organizationId)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    if (weeklyError) throw weeklyError;

    const weeklySales = last7Days.map((day) => {
      const total = weeklyData
        .filter((order) => order.created_at.startsWith(day))
        .reduce((sum, order) => sum + order.total_amount, 0);
      return { date: day, sales: total };
    });

    // Last 12 months
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        name: d.toLocaleString("default", { month: "short" }),
      };
    }).reverse();

    const { data: monthlyData, error: monthlyError } = await supabase
      .from("orders")
      .select("created_at, total_amount")
      .eq("organization_id", organizationId)
      .gte("created_at", new Date(new Date().setFullYear(new Date().getFullYear() - 1)));

    if (monthlyError) throw monthlyError;

    const monthlySales = last12Months.map(({ year, month, name }) => {
      const total = monthlyData
        .filter((order) => {
          const orderDate = new Date(order.created_at);
          return (
            orderDate.getFullYear() === year && orderDate.getMonth() + 1 === month
          );
        })
        .reduce((sum, order) => sum + order.total_amount, 0);
      return { month: name, sales: total };
    });

    res.json({
      success: true,
      data: {
        weeklySales,
        monthlySales,
      },
    });
  } catch (error) {
    console.error("Get sales chart data error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sales chart data",
    });
  }
};

module.exports = {
  getAllOrders,
  getOrder,
  createOrder,
  getDashboardData,
  getOrderPdf,
  getSalesChartData,
};
