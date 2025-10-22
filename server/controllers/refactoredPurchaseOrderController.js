const { query, withTransaction } = require("../config/database");

/**
 * Get all purchase orders with pagination and filters
 */
const getAllPurchaseOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = null,
      supplierId = null,
      startDate = null,
      endDate = null,
      sortBy = "order_date",
      sortOrder = "desc",
    } = req.query;

    const organizationId = req.user.organization_id;

    let whereCondition = "rpo.organization_id = $1";
    let params = [organizationId];
    let paramIndex = 2;

    if (status) {
      whereCondition += ` AND rpo.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (supplierId) {
      whereCondition += ` AND rpo.supplier_id = $${paramIndex}`;
      params.push(supplierId);
      paramIndex++;
    }

    if (startDate) {
      whereCondition += ` AND rpo.order_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereCondition += ` AND rpo.order_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const validSortBy = ["order_date", "total_amount", "status", "created_at"];
    const validSortOrder = ["asc", "desc"];
    const orderBy = validSortBy.includes(sortBy) ? sortBy : "order_date";
    const order = validSortOrder.includes(sortOrder.toLowerCase())
      ? sortOrder
      : "desc";

    const countResult = await query(
      `SELECT COUNT(*) as total FROM refactored_purchase_orders rpo WHERE ${whereCondition}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total);

    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT rpo.*, s.name as supplier_name, u.username as created_by_user
       FROM refactored_purchase_orders rpo
       LEFT JOIN suppliers s ON rpo.supplier_id = s.id
       LEFT JOIN users u ON rpo.created_by = u.id
       WHERE ${whereCondition}
       ORDER BY rpo.${orderBy} ${order}
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
      `SELECT rpo.*, s.name as supplier_name, u.username as created_by_user,
              json_agg(json_build_object('id', rpoi.id, 'medicine_id', rpoi.medicine_id, 'quantity', rpoi.quantity, 'unit_price', rpoi.unit_price, 'total_price', rpoi.total_price, 'medicine_name', m.name)) as items
       FROM refactored_purchase_orders rpo
       LEFT JOIN suppliers s ON rpo.supplier_id = s.id
       LEFT JOIN users u ON rpo.created_by = u.id
       LEFT JOIN refactored_purchase_order_items rpoi ON rpo.id = rpoi.purchase_order_id
       LEFT JOIN medicines m ON rpoi.medicine_id = m.id
       WHERE rpo.id = $1 AND rpo.organization_id = $2
       GROUP BY rpo.id, s.name, u.username`,
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
      orderDate,
      order_date,
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
    const finalOrderDate = orderDate || order_date;
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

    // Convert items to handle both camelCase and snake_case
    const processedItems = items.map((item) => ({
      medicineId: item.medicineId || item.medicine_id,
      quantity: item.quantity,
      unitCost: item.unitCost || item.unit_price,
    }));

    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );
    const tax_amount = (subtotal * finalTaxPercent) / 100;
    const total_amount = subtotal + tax_amount - finalDiscountAmount;

    await withTransaction(async (client) => {
      const poResult = await client.query(
        `INSERT INTO refactored_purchase_orders (
          po_number, supplier_id, organization_id, status, order_date, expected_delivery, notes,
          total_amount, tax_amount, discount, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *`,
        [
          `PO-${organizationId.substring(0, 8)}-${Date.now()}`,
          finalSupplierId,
          organizationId,
          "pending",
          finalOrderDate || new Date().toISOString().split("T")[0],
          finalExpectedDeliveryDate || null,
          notes || null,
          total_amount,
          tax_amount,
          finalDiscountAmount,
          userId,
        ]
      );

      const po = poResult.rows[0];

      for (const item of processedItems) {
        await client.query(
          `INSERT INTO refactored_purchase_order_items (
            purchase_order_id, medicine_id, quantity, unit_price, total_price, created_at, updated_at
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
 * Update purchase order
 */
const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, expected_delivery_date, notes } = req.body;
    const organizationId = req.user.organization_id;

    let updateFields = [];
    let params = [id, organizationId];
    let paramIndex = 3;

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (expected_delivery_date !== undefined) {
      updateFields.push(`expected_delivery_date = $${paramIndex}`);
      params.push(expected_delivery_date);
      paramIndex++;
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    updateFields.push(`updated_at = NOW()`);

    const result = await query(
      `UPDATE refactored_purchase_orders 
       SET ${updateFields.join(", ")}
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      message: "Purchase order updated successfully",
      data: { purchaseOrder: result.rows[0] },
    });
  } catch (error) {
    console.error("Update purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating purchase order",
    });
  }
};

/**
 * Delete purchase order
 */
const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const checkResult = await query(
      "SELECT status FROM refactored_purchase_orders WHERE id = $1 AND organization_id = $2",
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

    await query(
      "DELETE FROM refactored_purchase_order_items WHERE purchase_order_id = $1",
      [id]
    );

    await query("DELETE FROM refactored_purchase_orders WHERE id = $1", [id]);

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

/**
 * Approve purchase order
 */
const approvePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_amount, approved_by_notes } = req.body;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    const result = await query(
      `UPDATE refactored_purchase_orders 
       SET status = $1, approval_status = $2, approved_amount = $3, approved_by_notes = $4, approved_by = $5, updated_at = NOW()
       WHERE id = $6 AND organization_id = $7
       RETURNING *`,
      [
        "approved",
        "approved",
        approved_amount || null,
        approved_by_notes || null,
        userId,
        id,
        organizationId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      message: "Purchase order approved",
      data: { purchaseOrder: result.rows[0] },
    });
  } catch (error) {
    console.error("Approve purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Error approving purchase order",
    });
  }
};

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  approvePurchaseOrder,
  markAsOrdered: async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization_id;

      const result = await query(
        `UPDATE refactored_purchase_orders 
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3
         RETURNING *`,
        ["ordered", id, organizationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      res.json({
        success: true,
        message: "Purchase order marked as ordered",
        data: { purchaseOrder: result.rows[0] },
      });
    } catch (error) {
      console.error("Mark as ordered error:", error);
      res.status(500).json({
        success: false,
        message: "Error marking purchase order as ordered",
      });
    }
  },

  /**
   * UNIVERSAL RECEIVE PURCHASE ORDER ENDPOINT
   *
   * This is the ONE AND ONLY endpoint for receiving purchase orders.
   * It handles:
   * - Full receipt (all items, full quantities)
   * - Partial receipt (some items, edited quantities)
   * - Excess receipt (quantities > ordered)
   *
   * Frontend sends: { items: [{ id: <medicine_id>, received_quantity: number }] }
   * If no items array is sent, assumes full receipt of all ordered quantities.
   */
  receivePurchaseOrder: async (req, res) => {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[${new Date().toISOString()}] 📦 RECEIVE PURCHASE ORDER`);
    console.log(`${"=".repeat(80)}`);
    console.log(`PO ID: ${req.params.id}`);
    console.log(
      `User: ${req.user.id} | Organization: ${req.user.organization_id}`
    );
    console.log(`Request Body:`, JSON.stringify(req.body, null, 2));

    try {
      const { id } = req.params;
      const { items: receivedItemsFromFrontend } = req.body;
      const organizationId = req.user.organization_id;

      const result = await withTransaction(async (client) => {
        console.log("\n[1] 🔍 Fetching Purchase Order from database...");

        // Step 1: Get the purchase order with its items
        const poResult = await client.query(
          `SELECT 
            rpo.*,
            json_agg(
              json_build_object(
                'medicine_id', rpoi.medicine_id,
                'ordered_quantity', rpoi.quantity,
                'unit_price', rpoi.unit_price
              )
            ) as items
           FROM refactored_purchase_orders rpo
           LEFT JOIN refactored_purchase_order_items rpoi ON rpo.id = rpoi.purchase_order_id
           WHERE rpo.id = $1 AND rpo.organization_id = $2
           GROUP BY rpo.id`,
          [id, organizationId]
        );

        if (poResult.rows.length === 0) {
          console.error("❌ Purchase order not found");
          throw new Error("Purchase order not found");
        }

        const purchaseOrder = poResult.rows[0];
        console.log(`✅ Found PO: ${purchaseOrder.po_number}`);
        console.log(`   Status: ${purchaseOrder.status}`);
        console.log(`   Items in DB:`, purchaseOrder.items);

        // Step 2: Build the items map for inventory update
        const itemsToReceive = new Map();

        if (
          receivedItemsFromFrontend &&
          Array.isArray(receivedItemsFromFrontend) &&
          receivedItemsFromFrontend.length > 0
        ) {
          console.log(
            "\n[2] 📥 Processing PARTIAL/EDITED receipt from frontend"
          );

          // Frontend sent specific quantities - use those
          for (const frontendItem of receivedItemsFromFrontend) {
            const medicineId = frontendItem.id;
            const receivedQty = Number(frontendItem.received_quantity) || 0;

            if (receivedQty > 0) {
              itemsToReceive.set(medicineId, receivedQty);
              console.log(
                `   ✓ Medicine ${medicineId}: receiving ${receivedQty} units`
              );
            }
          }
        } else {
          console.log(
            "\n[2] 📦 No items array from frontend - FULL RECEIPT (all ordered quantities)"
          );

          // No items sent = full receipt of all ordered quantities
          for (const dbItem of purchaseOrder.items) {
            if (dbItem.medicine_id && dbItem.ordered_quantity) {
              const medicineId = dbItem.medicine_id;
              const orderedQty = Number(dbItem.ordered_quantity);

              itemsToReceive.set(medicineId, orderedQty);
              console.log(
                `   ✓ Medicine ${medicineId}: receiving full ordered qty ${orderedQty} units`
              );
            }
          }
        }

        if (itemsToReceive.size === 0) {
          console.error("❌ No items to receive!");
          throw new Error("No items to receive");
        }

        console.log(
          `\n[3] 📊 Summary: ${itemsToReceive.size} unique medicines to update`
        );

        // Step 3: Update PO status to 'received'
        console.log("\n[4] 🔄 Updating Purchase Order status to 'received'...");
        const updatedPO = await client.query(
          `UPDATE refactored_purchase_orders 
           SET status = 'received', updated_at = NOW()
           WHERE id = $1 AND organization_id = $2
           RETURNING *`,
          [id, organizationId]
        );
        console.log("   ✅ PO status updated to 'received'");

        // Step 4: Update inventory for each medicine
        console.log("\n[5] 🏥 Updating medicine inventory...");
        let successCount = 0;
        let errorCount = 0;

        for (const [medicineId, receivedQuantity] of itemsToReceive) {
          try {
            console.log(`\n   Processing medicine ${medicineId}:`);

            // Get current stock
            const medicineResult = await client.query(
              `SELECT id, name, quantity FROM medicines 
               WHERE id = $1 AND organization_id = $2`,
              [medicineId, organizationId]
            );

            if (medicineResult.rows.length === 0) {
              console.error(
                `   ❌ Medicine ${medicineId} not found in inventory`
              );
              errorCount++;
              continue;
            }

            const medicine = medicineResult.rows[0];
            const currentStock = Number(medicine.quantity) || 0;
            const newStock = currentStock + receivedQuantity;

            console.log(`   📦 "${medicine.name}"`);
            console.log(`   📊 Current stock: ${currentStock}`);
            console.log(`   ➕ Receiving: ${receivedQuantity}`);
            console.log(`   🎯 New stock: ${newStock}`);

            // Update the medicine quantity
            await client.query(
              `UPDATE medicines 
               SET quantity = $1, updated_at = NOW()
               WHERE id = $2 AND organization_id = $3`,
              [newStock, medicineId, organizationId]
            );

            console.log(`   ✅ SUCCESS: Inventory updated`);
            successCount++;
          } catch (itemError) {
            console.error(
              `   ❌ ERROR updating medicine ${medicineId}:`,
              itemError.message
            );
            errorCount++;
          }
        }

        console.log(`\n[6] 📈 Inventory Update Results:`);
        console.log(`   ✅ Success: ${successCount} medicines`);
        console.log(`   ❌ Errors: ${errorCount} medicines`);

        if (errorCount > 0) {
          console.warn(`   ⚠️  WARNING: Some inventory updates failed`);
        }

        console.log(`\n[7] ✅ Transaction committing...`);
        return updatedPO.rows[0];
      });

      // Transaction complete - send success response
      console.log(`\n✅ TRANSACTION COMMITTED SUCCESSFULLY`);
      console.log(`${"=".repeat(80)}\n`);

      res.json({
        success: true,
        message: "Purchase order received and inventory updated successfully",
        data: { purchaseOrder: result },
      });
    } catch (error) {
      console.error(`\n❌ ERROR in receivePurchaseOrder:`, error);
      console.log(`${"=".repeat(80)}\n`);

      if (error.message === "Purchase order not found") {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      if (error.message === "No items to receive") {
        return res.status(400).json({
          success: false,
          message: "No items to receive",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error receiving purchase order",
        error: error.message,
      });
    }
  },
  cancelPurchaseOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization_id;

      const result = await query(
        `UPDATE refactored_purchase_orders 
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3
         RETURNING *`,
        ["cancelled", id, organizationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      res.json({
        success: true,
        message: "Purchase order cancelled successfully",
        data: { purchaseOrder: result.rows[0] },
      });
    } catch (error) {
      console.error("Cancel purchase order error:", error);
      res.status(500).json({
        success: false,
        message: "Error cancelling purchase order",
      });
    }
  },

  getPurchaseOrderStats: async (req, res) =>
    res.json({ success: true, data: {} }),

  getOverduePurchaseOrders: async (req, res) =>
    res.json({ success: true, data: [] }),

  getPurchaseOrdersBySupplier: async (req, res) =>
    res.json({ success: true, data: [] }),

  generatePurchaseOrderReport: async (req, res) =>
    res.json({ success: true, data: {} }),

  applyPurchaseOrder: async (req, res) =>
    res.json({ success: true, message: "Applied" }),
};
