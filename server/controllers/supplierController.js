const { query, withTransaction } = require("../config/database");

/**
 * Get all suppliers with pagination and filters
 */
const getAllSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const organizationId = req.user.organization_id;

    // Build WHERE clause
    let whereCondition = "organization_id = $1 AND is_active = true";
    let params = [organizationId];
    let paramIndex = 2;

    // Override if status is explicitly requested
    if (status && status !== "all") {
      whereCondition = "organization_id = $1 AND is_active = $" + paramIndex;
      params.push(status === "active");
      paramIndex++;
    }

    if (search) {
      whereCondition += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM suppliers WHERE ${whereCondition}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated data
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT * FROM suppliers WHERE ${whereCondition}
       ORDER BY name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        suppliers: result.rows || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Get all suppliers error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching suppliers",
    });
  }
};

/**
 * Get single supplier
 */
const getSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const result = await query(
      "SELECT * FROM suppliers WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      data: { supplier: result.rows[0] },
    });
  } catch (error) {
    console.error("Get supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching supplier",
    });
  }
};

/**
 * Create supplier
 */
const createSupplier = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      contact_person,
      tax_id,
      payment_terms,
      city,
      state,
      country,
      postal_code,
      website,
      credit_limit,
    } = req.body;

    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Supplier name and phone are required",
      });
    }

    // Create supplier
    const result = await query(
      `INSERT INTO suppliers (
        name, email, phone, address, contact_person, tax_id, payment_terms,
        city, state, country, postal_code, website, credit_limit, current_balance,
        organization_id, is_active, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      RETURNING *`,
      [
        name,
        email || null,
        phone,
        address || null,
        contact_person || null,
        tax_id || null,
        payment_terms || null,
        city || null,
        state || null,
        country || null,
        postal_code || null,
        website || null,
        credit_limit ? parseFloat(credit_limit) : 0,
        0,
        organizationId,
        true,
        userId,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: { supplier: result.rows[0] },
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Supplier with this email/phone already exists",
      });
    }

    res.status(400).json({
      success: false,
      message: "Error creating supplier",
    });
  }
};

/**
 * Update supplier
 */
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const organizationId = req.user.organization_id;

    // Check if supplier exists
    const checkResult = await query(
      "SELECT id FROM suppliers WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Build dynamic SET clause
    const setFields = [];
    const params = [];
    let paramIndex = 1;

    const allowedFields = [
      "name", "email", "phone", "address", "contact_person", "tax_id",
      "payment_terms", "city", "state", "country", "postal_code",
      "website", "credit_limit", "is_active"
    ];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        let setValue = value;
        if (key === "credit_limit" && value) {
          setValue = parseFloat(value);
        }
        setFields.push(`${key} = $${paramIndex}`);
        params.push(setValue);
        paramIndex++;
      }
    }

    if (setFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    setFields.push(`updated_at = NOW()`);
    params.push(id, organizationId);

    const result = await query(
      `UPDATE suppliers SET ${setFields.join(", ")}
       WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
       RETURNING *`,
      params
    );

    res.json({
      success: true,
      message: "Supplier updated successfully",
      data: { supplier: result.rows[0] },
    });
  } catch (error) {
    console.error("Update supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating supplier",
    });
  }
};

/**
 * Delete supplier
 */
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Check if supplier has active purchase orders
    const ordersResult = await query(
      "SELECT id FROM purchase_orders WHERE supplier_id = $1 AND status != 'cancelled' LIMIT 1",
      [id]
    );

    if (ordersResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete supplier with active purchase orders",
      });
    }

    // Soft delete by setting is_active to false
    await query(
      "UPDATE suppliers SET is_active = false, updated_at = NOW() WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    res.json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting supplier",
    });
  }
};

/**
 * Get supplier purchase order history
 */
const getSupplierHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const organizationId = req.user.organization_id;

    // Verify supplier exists
    const supplierResult = await query(
      "SELECT id FROM suppliers WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (supplierResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Get total count
    const countResult = await query(
      "SELECT COUNT(*) as total FROM purchase_orders WHERE supplier_id = $1",
      [id]
    );
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated purchase orders
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT * FROM purchase_orders WHERE supplier_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        purchase_orders: result.rows || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Get supplier history error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching supplier history",
    });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierHistory,
};
