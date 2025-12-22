const { query, withTransaction } = require("../config/database");

/**
 * Get inventory summary
 */
const getInventorySummary = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT 
        COUNT(*) as total_items,
        SUM(quantity_in_stock) as total_quantity,
        SUM(CAST(reorder_level AS DECIMAL)) as total_value,
        COUNT(CASE WHEN quantity_in_stock < reorder_level THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN expiry_date <= CURRENT_DATE THEN 1 END) as expired_count,
        COUNT(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND expiry_date > CURRENT_DATE THEN 1 END) as expiring_soon_count
       FROM medicines
       WHERE organization_id = $1 AND is_active = true`,
      [organizationId]
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalItems: parseInt(result.rows[0].total_items || 0),
          totalQuantity: parseInt(result.rows[0].total_quantity || 0),
          lowStockCount: parseInt(result.rows[0].low_stock_count || 0),
          expiredCount: parseInt(result.rows[0].expired_count || 0),
          expiringSoonCount: parseInt(result.rows[0].expiring_soon_count || 0),
        },
      },
    });
  } catch (error) {
    console.error("Get inventory summary error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inventory summary",
    });
  }
};

/**
 * Get inventory adjustments
 */
const getInventoryAdjustments = async (req, res) => {
  try {
    const { page = 1, limit = 10, medicineId } = req.query;
    const organizationId = req.user.organization_id;

    let whereCondition = "ia.organization_id = $1";
    let params = [organizationId];
    let paramIndex = 2;

    if (medicineId) {
      whereCondition += ` AND ia.medicine_id = $${paramIndex}`;
      params.push(medicineId);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM inventory_adjustments ia WHERE ${whereCondition}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total);

    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT ia.*, m.name as medicine_name, u.username as adjusted_by_user
       FROM inventory_adjustments ia
       LEFT JOIN medicines m ON ia.medicine_id = m.id
       LEFT JOIN users u ON ia.adjusted_by = u.id
       WHERE ${whereCondition}
       ORDER BY ia.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        adjustments: result.rows || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Get inventory adjustments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inventory adjustments",
    });
  }
};

/**
 * Create inventory adjustment
 */
const createInventoryAdjustment = async (req, res) => {
  try {
    const {
      medicine_id,
      adjustment_type,
      quantity,
      reason,
      notes,
    } = req.body;

    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    if (!medicine_id || !adjustment_type || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Medicine, adjustment type, and quantity are required",
      });
    }

    // Validate adjustment type
    const validTypes = ['add', 'subtract', 'correction'];
    if (!validTypes.includes(adjustment_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid adjustment type",
      });
    }

    // Create adjustment and update medicine stock with transaction
    await withTransaction(async (client) => {
      // Create adjustment record
      const adjResult = await client.query(
        `INSERT INTO inventory_adjustments (
          medicine_id, organization_id, adjustment_type, quantity, reason, notes,
          adjusted_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *`,
        [medicine_id, organizationId, adjustment_type, quantity, reason || null, notes || null, userId]
      );

      // Update medicine quantity
      let quantityChange = quantity;
      if (adjustment_type === 'subtract') {
        quantityChange = -quantity;
      }

      const medicineResult = await client.query(
        `UPDATE medicines 
         SET quantity_in_stock = quantity_in_stock + $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3
         RETURNING *`,
        [quantityChange, medicine_id, organizationId]
      );

      if (medicineResult.rows.length === 0) {
        throw new Error("Medicine not found");
      }

      res.status(201).json({
        success: true,
        message: "Inventory adjustment created",
        data: {
          adjustment: adjResult.rows[0],
          medicine: medicineResult.rows[0],
        },
      });
    });
  } catch (error) {
    console.error("Create inventory adjustment error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating inventory adjustment",
    });
  }
};

/**
 * Get stock movements
 */
const getStockMovements = async (req, res) => {
  try {
    const { page = 1, limit = 10, medicineId, startDate, endDate } = req.query;
    const organizationId = req.user.organization_id;

    let whereCondition = "sm.organization_id = $1";
    let params = [organizationId];
    let paramIndex = 2;

    if (medicineId) {
      whereCondition += ` AND sm.medicine_id = $${paramIndex}`;
      params.push(medicineId);
      paramIndex++;
    }

    if (startDate) {
      whereCondition += ` AND sm.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereCondition += ` AND sm.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM stock_movements sm WHERE ${whereCondition}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total);

    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT sm.*, m.name as medicine_name, u.username as user_name
       FROM stock_movements sm
       LEFT JOIN medicines m ON sm.medicine_id = m.id
       LEFT JOIN users u ON sm.user_id = u.id
       WHERE ${whereCondition}
       ORDER BY sm.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        movements: result.rows || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Get stock movements error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching stock movements",
    });
  }
};

/**
 * Get expiry report (Phase 2: Batch-aware)
 * Returns batches that are expired, expiring soon, or expiring within 90 days
 */
const getExpiryReport = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT 
        b.id as batch_id, 
        p.id as product_id,
        p.name, 
        b.batch_number, 
        b.quantity, 
        b.expiry_date,
        b.selling_price,
        CASE 
          WHEN b.expiry_date <= CURRENT_DATE THEN 'expired'
          WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
          WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
          ELSE 'valid'
        END as status
       FROM inventory_batches b
       JOIN products p ON b.product_id = p.id
       WHERE b.organization_id = $1 AND b.is_active = true
       AND b.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
       ORDER BY b.expiry_date ASC`,
      [organizationId]
    );

    const expired = result.rows.filter(m => m.status === 'expired');
    const critical = result.rows.filter(m => m.status === 'critical');
    const expiringSoon = result.rows.filter(m => m.status === 'expiring_soon');
    const valid = result.rows.filter(m => m.status === 'valid');

    res.json({
      success: true,
      data: {
        expired,
        critical, // NEW: Expiring within 7 days
        expiringSoon,
        valid,
        summary: {
          expiredCount: expired.length,
          criticalCount: critical.length,
          expiringSoonCount: expiringSoon.length,
          validCount: valid.length,
        },
      },
    });
  } catch (error) {
    console.error("Get expiry report error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching expiry report",
    });
  }
};

/**
 * Update reorder level
 */
const updateReorderLevel = async (req, res) => {
  try {
    const { medicineId, reorderLevel } = req.body;
    const organizationId = req.user.organization_id;

    if (!medicineId || reorderLevel === undefined) {
      return res.status(400).json({
        success: false,
        message: "Medicine ID and reorder level are required",
      });
    }

    const result = await query(
      `UPDATE medicines SET reorder_level = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [reorderLevel, medicineId, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.json({
      success: true,
      message: "Reorder level updated",
      data: { medicine: result.rows[0] },
    });
  } catch (error) {
    console.error("Update reorder level error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating reorder level",
    });
  }
};

module.exports = {
  getInventorySummary,
  getInventoryAdjustments,
  createInventoryAdjustment,
  getStockMovements,
  getExpiryReport,
  updateReorderLevel,
};
