const { query, withTransaction } = require("../config/database");
const PDFDocument = require("pdfkit");

/**
 * Get all orders with pagination and filters
 */
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

    // Build WHERE clause with filters
    let whereConditions = ["o.organization_id = $1"];
    let params = [organizationId];
    let paramIndex = 2;

    if (status && status !== "all") {
      whereConditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`o.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`o.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (customerName) {
      whereConditions.push(`o.customer_name ILIKE $${paramIndex}`);
      params.push(`%${customerName}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated data
    const offset = (page - 1) * limit;
    const ordersResult = await query(
      `SELECT o.*, json_agg(
        json_build_object(
          'id', oi.id,
          'medicine_id', oi.medicine_id,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'discount', oi.discount,
          'cost_price', oi.cost_price,
          'medicine_name', m.name
        )
      ) as order_items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN medicines m ON oi.medicine_id = m.id
       WHERE ${whereClause}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = parseInt(page);

    res.json({
      success: true,
      data: {
        orders: ordersResult.rows || [],
        pagination: {
          page: currentPage,
          limit: parseInt(limit),
          total: totalCount,
          pages: totalPages,
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

/**
 * Get single order with items
 */
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT o.*, json_agg(
        json_build_object(
          'id', oi.id,
          'medicine_id', oi.medicine_id,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'discount', oi.discount,
          'cost_price', oi.cost_price,
          'medicine_name', m.name
        )
      ) as order_items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN medicines m ON oi.medicine_id = m.id
       WHERE o.id = $1 AND o.organization_id = $2
       GROUP BY o.id`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: { order: result.rows[0] },
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order",
    });
  }
};

/**
 * Create order with items and update medicine quantities
 */
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

    // Use transaction for atomicity
    await withTransaction(async (client) => {
      // Insert order
      const orderResult = await client.query(
        `INSERT INTO orders (
          order_number, user_id, customer_name, customer_phone, customer_email,
          organization_id, total_amount, tax_amount, tax_percent, subtotal,
          profit, discount, discount_percent, payment_method, payment_status,
          status, completed_at, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
        RETURNING *`,
        [
          orderNumber,
          user_id,
          customer_name,
          customer_phone,
          customer_email,
          organizationId,
          parseFloat(total_amount) || 0,
          parseFloat(tax_amount) || 0,
          parseFloat(tax_percent) || 0,
          parseFloat(subtotal) || 0,
          parseFloat(profit) || 0,
          parseFloat(discount) || 0,
          parseFloat(discount_percent) || 0,
          payment_method,
          payment_status || 'pending',
          status || 'pending',
          completed_at || null,
          notes || null,
        ]
      );

      const order = orderResult.rows[0];

      // Insert order items and update medicine quantities
      if (items && items.length > 0) {
        for (const item of items) {
          // Insert order item
          await client.query(
            `INSERT INTO order_items (
              order_id, medicine_id, quantity, unit_price, total_price,
              discount, discount_percent, cost_price, profit, gst_amount,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
            [
              order.id,
              item.medicine_id,
              parseInt(item.quantity),
              parseFloat(item.unit_price),
              parseFloat(item.total_price),
              parseFloat(item.discount || 0),
              parseFloat(item.discount_percent || 0),
              parseFloat(item.cost_price),
              parseFloat(item.profit || 0),
              parseFloat(item.gst_amount || 0),
            ]
          );

          // Update medicine quantity
          await client.query(
            `UPDATE medicines 
             SET quantity = quantity - $1, updated_at = NOW()
             WHERE id = $2 AND organization_id = $3`,
            [parseInt(item.quantity), item.medicine_id, organizationId]
          );
        }
      }

      // Return complete order with items
      const completeOrderResult = await client.query(
        `SELECT o.*, json_agg(
          json_build_object(
            'id', oi.id,
            'medicine_id', oi.medicine_id,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'discount', oi.discount
          )
        ) as order_items
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.id = $1
         GROUP BY o.id`,
        [order.id]
      );

      res.status(201).json({
        success: true,
        data: { order: completeOrderResult.rows[0] },
      });
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating order",
    });
  }
};

/**
 * Get dashboard data with sales metrics
 */
const getDashboardData = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const { range = "daily" } = req.query;

    const now = new Date();
    let startDate;

    switch (range) {
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "monthly":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "yearly":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "daily":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        break;
    }

    const result = await query(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(total_amount) as total_revenue
       FROM orders
       WHERE organization_id = $1 AND created_at >= $2`,
      [organizationId, startDate]
    );

    const dashboardData = {
      totalOrders: parseInt(result.rows[0].total_orders) || 0,
      totalRevenue: parseFloat(result.rows[0].total_revenue) || 0,
      completedOrders: parseInt(result.rows[0].completed_orders) || 0,
      pendingOrders: parseInt(result.rows[0].pending_orders) || 0,
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

/**
 * Generate PDF for an order
 */
const getOrderPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT o.*, json_agg(
        json_build_object(
          'id', oi.id,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'medicine_name', m.name
        )
      ) as order_items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN medicines m ON oi.medicine_id = m.id
       WHERE o.id = $1 AND o.organization_id = $2
       GROUP BY o.id`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = result.rows[0];
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
    if (order.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach((item) => {
        if (item && item.id) {
          doc.text(item.medicine_name || "N/A", 50, y);
          doc.text(item.quantity || 0, 250, y);
          doc.text((item.unit_price || 0).toFixed(2), 350, y);
          doc.text((item.total_price || 0).toFixed(2), 450, y);
          y += 20;
        }
      });
    }

    // Add totals
    doc.moveDown();
    doc.text(`Subtotal: ${(order.subtotal || 0).toFixed(2)}`, { align: "right" });
    doc.text(`Tax: ${(order.tax_amount || 0).toFixed(2)}`, { align: "right" });
    doc.text(`Discount: ${(order.discount || 0).toFixed(2)}`, { align: "right" });
    doc.font("Helvetica-Bold");
    doc.text(`Total: ${(order.total_amount || 0).toFixed(2)}`, { align: "right" });

    doc.end();
  } catch (error) {
    console.error("Get order PDF error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating PDF",
    });
  }
};

/**
 * Get sales chart data for weekly and monthly trends
 */
const getSalesChartData = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    // Last 7 days
    const weeklySalesResult = await query(
      `SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as sales
       FROM orders
       WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at)`,
      [organizationId]
    );

    // Last 12 months
    const monthlySalesResult = await query(
      `SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        SUM(total_amount) as sales
       FROM orders
       WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon')
       ORDER BY DATE_TRUNC('month', created_at)`,
      [organizationId]
    );

    const weeklySales = weeklySalesResult.rows.map(row => ({
      date: row.date,
      sales: parseFloat(row.sales) || 0,
    }));

    const monthlySales = monthlySalesResult.rows.map(row => ({
      month: row.month,
      sales: parseFloat(row.sales) || 0,
    }));

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
