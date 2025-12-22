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
      payment_status: requestedPaymentStatus,
      status,
      completed_at,
      notes,
      amount_paid: rawAmountPaid, // NEW: Amount received from customer
    } = req.body;

    // Parse amounts for partial payment logic
    const parsedTotal = parseFloat(total_amount) || 0;
    const parsedAmountPaid = parseFloat(rawAmountPaid);

    // Default: if amount_paid not provided, assume full payment
    const amountPaid = isNaN(parsedAmountPaid) ? parsedTotal : parsedAmountPaid;

    // Calculate due or change
    let amountDue = 0;
    let changeGiven = 0;
    let computedPaymentStatus = requestedPaymentStatus || 'pending';

    if (amountPaid >= parsedTotal) {
      // Full payment or overpayment
      changeGiven = amountPaid - parsedTotal;
      amountDue = 0;
      computedPaymentStatus = 'paid';
    } else if (amountPaid > 0) {
      // Partial payment
      amountDue = parsedTotal - amountPaid;
      changeGiven = 0;
      computedPaymentStatus = 'partial';
    } else {
      // No payment (full credit)
      amountDue = parsedTotal;
      changeGiven = 0;
      computedPaymentStatus = 'unpaid';
    }

    const organizationId = req.user.organization_id;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Use transaction for atomicity
    await withTransaction(async (client) => {
      // === PHASE 2: PRESCRIPTION ENFORCEMENT ===
      // Check if any product in the order requires a prescription
      if (items && items.length > 0) {
        const productIds = items.map((i) => i.medicine_id);

        const rxCheckResult = await client.query(
          `SELECT id, name, prescription_required FROM products 
           WHERE id = ANY($1) AND prescription_required = true`,
          [productIds]
        );

        const rxProducts = rxCheckResult.rows;

        if (rxProducts.length > 0) {
          // Prescription-required products found. Validate doctor/patient info.
          // We check if customer_name (Patient) and notes contains "Dr." or doctor_name field exists
          const hasDoctorInfo = notes && (notes.toLowerCase().includes('dr.') || notes.toLowerCase().includes('doctor'));
          const hasPatientInfo = customer_name && customer_name.trim().length > 0;

          if (!hasPatientInfo || !hasDoctorInfo) {
            const rxNames = rxProducts.map(p => p.name).join(', ');
            throw new Error(
              `PRESCRIPTION REQUIRED: The following items require a valid prescription: [${rxNames}]. ` +
              `Please provide Patient Name and Doctor information in the Notes field (e.g., "Prescribed by Dr. Smith").`
            );
          }
        }
      }

      // 1. Validate & Allocate Stock (FEFO Logic)
      if (items && items.length > 0) {
        // Collect all Product IDs
        const productIds = items.map((i) => i.medicine_id);

        // Fetch all active batches for these products, sorted by Expiry (Oldest First)
        // We lock rows with FOR UPDATE to prevent race conditions
        const batchesResult = await client.query(
          `SELECT * FROM inventory_batches 
           WHERE product_id = ANY($1) 
           AND organization_id = $2 
           AND is_active = true 
           AND quantity > 0
           ORDER BY expiry_date ASC
           FOR UPDATE`,
          [productIds, organizationId]
        );

        const allBatches = batchesResult.rows;
        const batchUpdates = []; // Stores { id, newQuantity }

        for (const item of items) {
          const productId = item.medicine_id;
          let qtyNeeded = parseInt(item.quantity);

          // Get batches for this specific product
          const productBatches = allBatches.filter(b => b.product_id === productId);

          let availableQty = productBatches.reduce((sum, b) => sum + b.quantity, 0);

          if (availableQty < qtyNeeded) {
            throw new Error(`Insufficient stock for product ID: ${productId}. Available: ${availableQty}, Requested: ${qtyNeeded}`);
          }

          // FEFO Allocation
          for (const batch of productBatches) {
            if (qtyNeeded <= 0) break;

            const deduct = Math.min(batch.quantity, qtyNeeded);

            // Add to update list
            batchUpdates.push({
              id: batch.id,
              deduction: deduct
            });

            // Update local memory for next iteration checks (if any)
            batch.quantity -= deduct;
            qtyNeeded -= deduct;
          }
        }

        // Apply Batch Updates
        // Optimization: We could batch these too, but a simple loop is robust enough for typical cart sizes
        for (const update of batchUpdates) {
          await client.query(
            `UPDATE inventory_batches SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2`,
            [update.deduction, update.id]
          );
        }
      }

      // 2. Insert order (with partial payment fields)
      const orderResult = await client.query(
        `INSERT INTO orders (
          order_number, user_id, customer_name, customer_phone, customer_email,
          organization_id, total_amount, tax_amount, tax_percent, subtotal,
          profit, discount, discount_percent, payment_method, payment_status,
          status, completed_at, notes, amount_paid, amount_due, change_given,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
        RETURNING *`,
        [
          orderNumber,
          user_id,
          customer_name,
          customer_phone,
          customer_email,
          organizationId,
          parsedTotal,
          parseFloat(tax_amount) || 0,
          parseFloat(tax_percent) || 0,
          parseFloat(subtotal) || 0,
          parseFloat(profit) || 0,
          parseFloat(discount) || 0,
          parseFloat(discount_percent) || 0,
          payment_method,
          computedPaymentStatus,
          status || "pending",
          completed_at || null,
          notes || null,
          amountPaid,
          amountDue,
          changeGiven,
        ]
      );

      const order = orderResult.rows[0];

      // 3. Insert Order Items
      if (items && items.length > 0) {
        // Optimized Batch Insert for Order Items (same as before)
        const itemValues = [];
        const itemParams = [];
        let paramCount = 1;

        items.forEach((item) => {
          itemValues.push(
            `($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, NOW(), NOW())`
          );
          itemParams.push(
            order.id,
            item.medicine_id, // This is Product ID
            parseInt(item.quantity),
            parseFloat(item.unit_price),
            parseFloat(item.total_price),
            parseFloat(item.discount || 0),
            parseFloat(item.discount_percent || 0),
            parseFloat(item.cost_price),
            parseFloat(item.profit || 0),
            parseFloat(item.gst_amount || 0)
          );
        });

        const insertQuery = `
          INSERT INTO order_items (
            order_id, medicine_id, quantity, unit_price, total_price,
            discount, discount_percent, cost_price, profit, gst_amount,
            created_at, updated_at
          ) VALUES ${itemValues.join(", ")}`;

        await client.query(insertQuery, itemParams);
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
      message: "Error creating order: " + error.message,
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
          doc.text(String(item.quantity || 0), 250, y);
          doc.text(parseFloat(item.unit_price || 0).toFixed(2), 350, y);
          doc.text(parseFloat(item.total_price || 0).toFixed(2), 450, y);
          y += 20;
        }
      });
    }

    // Add totals (parse as float since DB returns strings)
    doc.moveDown();
    doc.text(`Subtotal: ${parseFloat(order.subtotal || 0).toFixed(2)}`, { align: "right" });
    doc.text(`Tax: ${parseFloat(order.tax_amount || 0).toFixed(2)}`, { align: "right" });
    doc.text(`Discount: ${parseFloat(order.discount || 0).toFixed(2)}`, { align: "right" });
    doc.font("Helvetica-Bold");
    doc.text(`Total: ${parseFloat(order.total_amount || 0).toFixed(2)}`, { align: "right" });

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

/**
 * Get all orders with outstanding dues (partial or unpaid)
 */
const getDuedOrders = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT o.*, 
              u.name as cashier_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.organization_id = $1 
         AND o.payment_status IN ('partial', 'unpaid')
         AND o.amount_due > 0
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, parseInt(limit), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM orders 
       WHERE organization_id = $1 
         AND payment_status IN ('partial', 'unpaid')
         AND amount_due > 0`,
      [organizationId]
    );

    res.json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get dued orders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dued orders",
    });
  }
};

/**
 * Get customers with outstanding dues (grouped by customer)
 */
const getCustomersWithDues = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT 
         COALESCE(customer_name, 'Walk-in Customer') as customer_name,
         COALESCE(customer_phone, '') as customer_phone,
         COUNT(*) as order_count,
         SUM(amount_due) as total_due,
         MAX(created_at) as last_order_date,
         json_agg(
           json_build_object(
             'id', id,
             'order_number', order_number,
             'total_amount', total_amount,
             'amount_paid', amount_paid,
             'amount_due', amount_due,
             'payment_status', payment_status,
             'created_at', created_at
           ) ORDER BY created_at DESC
         ) as orders
       FROM orders
       WHERE organization_id = $1 
         AND payment_status IN ('partial', 'unpaid')
         AND amount_due > 0
       GROUP BY COALESCE(customer_name, 'Walk-in Customer'), COALESCE(customer_phone, '')
       ORDER BY SUM(amount_due) DESC`,
      [organizationId]
    );

    // Calculate grand total
    const totalDue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_due || 0), 0);

    res.json({
      success: true,
      data: {
        customers: result.rows,
        summary: {
          totalCustomers: result.rows.length,
          totalOutstanding: totalDue,
        },
      },
    });
  } catch (error) {
    console.error("Get customers with dues error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customers with dues",
    });
  }
};

/**
 * Record payment against an existing due
 */
const payDue = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_amount, payment_method, notes } = req.body;
    const organizationId = req.user.organization_id;

    if (!payment_amount || parseFloat(payment_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid payment amount is required",
      });
    }

    // Get current order
    const orderResult = await query(
      `SELECT * FROM orders WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orderResult.rows[0];
    const currentDue = parseFloat(order.amount_due) || 0;
    const currentPaid = parseFloat(order.amount_paid) || 0;
    const paymentAmt = parseFloat(payment_amount);

    if (currentDue <= 0) {
      return res.status(400).json({
        success: false,
        message: "This order has no outstanding due",
      });
    }

    // Calculate new values
    const newAmountPaid = currentPaid + paymentAmt;
    let newAmountDue = currentDue - paymentAmt;
    let newChangeGiven = 0;
    let newPaymentStatus = 'partial';

    if (newAmountDue <= 0) {
      // Overpayment or exact payment
      newChangeGiven = Math.abs(newAmountDue);
      newAmountDue = 0;
      newPaymentStatus = 'paid';
    }

    // Append to notes
    const paymentNote = `[${new Date().toISOString()}] Payment received: Rs.${paymentAmt.toFixed(2)} via ${payment_method || 'cash'}${notes ? ' - ' + notes : ''}`;
    const updatedNotes = order.notes ? `${order.notes}\n${paymentNote}` : paymentNote;

    // Update order
    const updateResult = await query(
      `UPDATE orders 
       SET amount_paid = $1, 
           amount_due = $2, 
           change_given = $3,
           payment_status = $4,
           payment_method = COALESCE($5, payment_method),
           notes = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [newAmountPaid, newAmountDue, newChangeGiven, newPaymentStatus, payment_method, updatedNotes, id]
    );

    res.json({
      success: true,
      message: newPaymentStatus === 'paid'
        ? `Payment complete! Change to return: Rs.${newChangeGiven.toFixed(2)}`
        : `Payment recorded. Remaining due: Rs.${newAmountDue.toFixed(2)}`,
      data: {
        order: updateResult.rows[0],
        payment: {
          amount: paymentAmt,
          previousDue: currentDue,
          newDue: newAmountDue,
          changeGiven: newChangeGiven,
        },
      },
    });
  } catch (error) {
    console.error("Pay due error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing payment",
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
  getDuedOrders,
  getCustomersWithDues,
  payDue,
};
