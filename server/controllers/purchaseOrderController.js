const { query, withTransaction } = require("../config/database");

/**
 * Get all purchase orders
 */
const getAllPurchaseOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, supplierId } = req.query;
    const organizationId = req.user.organization_id;

    // Build WHERE clause
    let whereCondition = "po.organization_id = $1";
    let params = [organizationId];
    let paramIndex = 2;

    if (status) {
      whereCondition += ` AND po.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (supplierId) {
      whereCondition += ` AND po.supplier_id = $${paramIndex}`;
      params.push(supplierId);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM purchase_orders po WHERE ${whereCondition}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated data
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT po.*, s.name as supplier_name, u.username as created_by_user
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN users u ON po.created_by = u.id
       WHERE ${whereCondition}
       ORDER BY po.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        purchaseOrders: result.rows || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Get all purchase orders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching purchase orders",
    });
  }
};

/**
 * Get single purchase order
 */
const getPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT po.*, s.name as supplier_name, u.username as created_by_user,
              json_agg(json_build_object('id', poi.id, 'medicine_id', poi.medicine_id, 'quantity', poi.quantity, 'unit_price', poi.unit_price, 'total_price', poi.total_price, 'medicine_name', m.name)) as items
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN users u ON po.created_by = u.id
       LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
       LEFT JOIN medicines m ON poi.medicine_id = m.id
       WHERE po.id = $1 AND po.organization_id = $2
       GROUP BY po.id, s.name, u.username`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      data: { purchaseOrder: result.rows[0] },
    });
  } catch (error) {
    console.error("Get purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching purchase order",
    });
  }
};

/**
 * Create purchase order
 */
const createPurchaseOrder = async (req, res) => {
  try {
    console.log(
      "🔍 Received purchase order request body:",
      JSON.stringify(req.body, null, 2)
    );

    // Handle both camelCase (from validation middleware) and snake_case
    const {
      supplierId,
      supplier_id,
      items,
      expectedDeliveryDate,
      expected_delivery_date,
      notes,
      taxPercent,
      tax_percent = 0,
      discountAmount,
      discount_amount = 0,
    } = req.body;

    // Use camelCase values if provided (from validation middleware), else fall back to snake_case
    const finalSupplierId = supplierId || supplier_id;
    const finalExpectedDeliveryDate =
      expectedDeliveryDate || expected_delivery_date;
    const finalTaxPercent = taxPercent !== undefined ? taxPercent : tax_percent;
    const finalDiscountAmount =
      discountAmount !== undefined ? discountAmount : discount_amount;

    console.log("📋 Extracted values:", {
      supplierId,
      supplier_id,
      finalSupplierId,
      items,
      itemsLength: items?.length,
      expectedDeliveryDate,
      expected_delivery_date,
      finalExpectedDeliveryDate,
    });

    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    if (!finalSupplierId || !items || items.length === 0) {
      console.error("❌ Validation failed:", {
        finalSupplierId: !!finalSupplierId,
        items: !!items,
        itemsLength: items?.length,
      });
      return res.status(400).json({
        success: false,
        message: "Supplier and items are required",
      });
    }

    // Generate unique PO number
    const poNumber = `PO-${organizationId.substring(0, 8)}-${Date.now()}`;

    // Convert items to use snake_case field names
    const processedItems = items.map((item) => ({
      medicineId: item.medicineId || item.medicine_id,
      quantity: item.quantity,
      unitCost: item.unitCost || item.unit_price,
    }));

    // Calculate totals
    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );
    const tax_amount = (subtotal * finalTaxPercent) / 100;
    const total_amount = subtotal + tax_amount - finalDiscountAmount;

    // Create purchase order with transaction
    await withTransaction(async (client) => {
      const poResult = await client.query(
        `INSERT INTO purchase_orders (
          po_number, supplier_id, organization_id, status, expected_delivery_date, notes,
          total_amount, tax_amount, discount, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          poNumber,
          finalSupplierId,
          organizationId,
          "pending",
          finalExpectedDeliveryDate || null,
          notes || null,
          total_amount,
          tax_amount,
          finalDiscountAmount,
          userId,
        ]
      );

      const po = poResult.rows[0];

      // Insert items
      for (const item of processedItems) {
        await client.query(
          `INSERT INTO purchase_order_items (
            purchase_order_id, medicine_id, quantity, unit_cost, total_cost, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [
            po.id,
            item.medicineId,
            item.quantity,
            item.unitCost,
            item.quantity * item.unitCost,
          ]
        );
      }

      res.status(201).json({
        success: true,
        message: "Purchase order created successfully",
        data: { purchaseOrder: po },
      });
    });
  } catch (error) {
    console.error("Create purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating purchase order",
    });
  }
};

/**
 * Update purchase order status
 */
const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const organizationId = req.user.organization_id;

    const result = await query(
      `UPDATE purchase_orders SET status = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [status, id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      message: "Purchase order status updated",
      data: { purchaseOrder: result.rows[0] },
    });
  } catch (error) {
    console.error("Update purchase order status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating purchase order",
    });
  }
};

/**
 * Delete purchase order (if pending)
 */
const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Only delete if pending
    const checkResult = await query(
      "SELECT status FROM purchase_orders WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (checkResult.rows[0].status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete non-pending purchase orders",
      });
    }

    // Delete items first
    await query(
      "DELETE FROM purchase_order_items WHERE purchase_order_id = $1",
      [id]
    );

    // Delete purchase order
    await query("DELETE FROM purchase_orders WHERE id = $1", [id]);

    res.json({
      success: true,
      message: "Purchase order deleted successfully",
    });
  } catch (error) {
    console.error("Delete purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting purchase order",
    });
  }
};

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
};
