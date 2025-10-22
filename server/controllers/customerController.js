const { query, withTransaction } = require("../config/database");

/**
 * Search customers with pagination and filtering
 */
const searchCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      q = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;
    const organizationId = req.user.organization_id;

    // Build WHERE clause with search
    let whereCondition = "organization_id = $1";
    let params = [organizationId];

    if (q && q.trim()) {
      whereCondition += ` AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)`;
      params.push(`%${q}%`);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM customers WHERE ${whereCondition}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated data
    const offset = (page - 1) * limit;
    const sortColumn = ["name", "phone", "email", "created_at"].includes(sortBy) ? sortBy : "name";
    const sortDirection = sortOrder === "asc" ? "ASC" : "DESC";

    const paramCount = params.length + 1;
    const result = await query(
      `SELECT * FROM customers WHERE ${whereCondition}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        customers: result.rows || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: totalPages
        }
      }
    });
  } catch (error) {
    console.error("Error searching customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search customers"
    });
  }
};

/**
 * Get customer by ID
 */
const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const result = await query(
      "SELECT * FROM customers WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    res.json({
      success: true,
      data: { customer: result.rows[0] }
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer"
    });
  }
};

/**
 * Create new customer
 */
const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, date_of_birth, gender, allergies, emergency_contact, emergency_phone } = req.body;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required"
      });
    }

    // Check if customer with same phone already exists
    const existingResult = await query(
      "SELECT id FROM customers WHERE phone = $1 AND organization_id = $2",
      [phone, organizationId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Customer with this phone number already exists"
      });
    }

    // Create customer
    const result = await query(
      `INSERT INTO customers (
        name, phone, email, address, date_of_birth, gender, allergies,
        emergency_contact, emergency_phone, organization_id, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        name,
        phone,
        email || null,
        address || null,
        date_of_birth || null,
        gender || null,
        allergies || null,
        emergency_contact || null,
        emergency_phone || null,
        organizationId,
        userId
      ]
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: { customer: result.rows[0] }
    });
  } catch (error) {
    console.error("Error creating customer:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Customer with this phone already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create customer"
    });
  }
};

/**
 * Update customer
 */
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, date_of_birth, gender, allergies, emergency_contact, emergency_phone } = req.body;
    const organizationId = req.user.organization_id;

    // Check if customer exists
    const checkResult = await query(
      "SELECT id FROM customers WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Update customer
    const result = await query(
      `UPDATE customers SET
        name = $1, phone = $2, email = $3, address = $4, date_of_birth = $5,
        gender = $6, allergies = $7, emergency_contact = $8, emergency_phone = $9,
        updated_at = NOW()
       WHERE id = $10 AND organization_id = $11
       RETURNING *`,
      [
        name,
        phone,
        email || null,
        address || null,
        date_of_birth || null,
        gender || null,
        allergies || null,
        emergency_contact || null,
        emergency_phone || null,
        id,
        organizationId
      ]
    );

    res.json({
      success: true,
      message: "Customer updated successfully",
      data: { customer: result.rows[0] }
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer"
    });
  }
};

/**
 * Delete customer
 */
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Check if customer has any orders
    const ordersResult = await query(
      "SELECT id FROM orders WHERE customer_id = $1 LIMIT 1",
      [id]
    );

    if (ordersResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete customer with existing orders"
      });
    }

    // Delete customer
    await query(
      "DELETE FROM customers WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    res.json({
      success: true,
      message: "Customer deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete customer"
    });
  }
};

/**
 * Get customer order history
 */
const getCustomerOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const organizationId = req.user.organization_id;

    // Verify customer exists
    const customerResult = await query(
      "SELECT id FROM customers WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Get total count
    const countResult = await query(
      "SELECT COUNT(*) as total FROM orders WHERE customer_id = $1",
      [id]
    );
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated orders
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT o.*, json_agg(
        json_build_object(
          'id', oi.id,
          'medicine_id', oi.medicine_id,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'medicine_name', m.name
        )
      ) as order_items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN medicines m ON oi.medicine_id = m.id
       WHERE o.customer_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        orders: result.rows || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: totalPages
        }
      }
    });
  } catch (error) {
    console.error("Error fetching customer order history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer order history"
    });
  }
};

/**
 * Get customer pending balance
 */
const getCustomerPendingBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Verify customer exists
    const customerResult = await query(
      "SELECT id FROM customers WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Calculate pending balance from unpaid/pending orders
    const result = await query(
      `SELECT SUM(total_amount) as pending_balance FROM orders
       WHERE customer_id = $1 AND status IN ('pending', 'unpaid')`,
      [id]
    );

    const pendingBalance = parseFloat(result.rows[0].pending_balance || 0);

    res.json({
      success: true,
      data: {
        pendingBalance: pendingBalance.toFixed(2)
      }
    });
  } catch (error) {
    console.error("Error calculating pending balance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate pending balance"
    });
  }
};

/**
 * Get customer statistics
 */
const getCustomerStats = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Verify customer exists
    const customerResult = await query(
      "SELECT id, created_at FROM customers WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Get order statistics
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(total_amount) as total_spent,
        MAX(created_at) as last_order_date
       FROM orders WHERE customer_id = $1`,
      [id]
    );

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders: parseInt(stats.total_orders) || 0,
          completedOrders: parseInt(stats.completed_orders) || 0,
          pendingOrders: parseInt(stats.pending_orders) || 0,
          totalSpent: parseFloat(stats.total_spent) || 0,
          lastOrderDate: stats.last_order_date,
          customerSince: customerResult.rows[0].created_at
        }
      }
    });
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer statistics"
    });
  }
};

/**
 * Get customer medication history
 */
const getCustomerMedicationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const organizationId = req.user.organization_id;

    // Verify customer exists
    const customerResult = await query(
      "SELECT id FROM customers WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.customer_id = $1 AND o.status != 'cancelled'`,
      [id]
    );
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated medication history
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT oi.medicine_id, oi.quantity, oi.unit_price, oi.total_price,
              m.name as medicine_name, m.generic_name, m.manufacturer,
              o.created_at, o.status
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN medicines m ON oi.medicine_id = m.id
       WHERE o.customer_id = $1 AND o.status != 'cancelled'
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        medications: result.rows || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: totalPages
        }
      }
    });
  } catch (error) {
    console.error("Error fetching medication history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch medication history"
    });
  }
};

module.exports = {
  searchCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrderHistory,
  getCustomerPendingBalance,
  getCustomerStats,
  getCustomerMedicationHistory
};
