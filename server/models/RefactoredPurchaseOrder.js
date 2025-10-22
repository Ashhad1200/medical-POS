const { query, withTransaction } = require("../config/database");
const { AppError } = require("../utils/errors");
const RefactoredSupplier = require("./RefactoredSupplier");

class RefactoredPurchaseOrder {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organization_id || data.organizationId;
    this.poNumber = data.po_number || data.poNumber;
    this.supplierId = data.supplier_id || data.supplierId;
    this.status = data.status || "pending";
    this.orderDate = data.order_date || data.orderDate;
    this.expectedDeliveryDate =
      data.expected_delivery_date || data.expectedDeliveryDate;
    this.actualDeliveryDate =
      data.actual_delivery_date || data.actualDeliveryDate;
    this.taxAmount = parseFloat(data.tax_amount || data.taxAmount || 0);
    this.discountAmount = parseFloat(data.discount || data.discountAmount || 0);
    this.totalAmount = parseFloat(data.total_amount || data.totalAmount || 0);
    this.notes = data.notes;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
    this.createdBy = data.created_by || data.createdBy;
    this.approvedBy = data.approved_by || data.approvedBy;
    this.approvedAt = data.approved_at || data.approvedAt;
    this.appliedAt = data.applied_at || data.appliedAt;

    // Related data
    this.supplier = data.supplier;
    this.items = data.items || [];
    this.creator = data.creator;
  }

  // Validation methods
  validate() {
    const errors = [];

    if (!this.organizationId) {
      errors.push("Organization ID is required");
    }

    if (!this.supplierId) {
      errors.push("Supplier ID is required");
    }

    if (!this.createdBy) {
      errors.push("Created by user ID is required");
    }

    if (!this.orderDate) {
      errors.push("Order date is required");
    }

    if (this.taxAmount < 0) {
      errors.push("Tax amount cannot be negative");
    }

    if (this.discountAmount < 0) {
      errors.push("Discount amount cannot be negative");
    }

    if (this.totalAmount < 0) {
      errors.push("Total amount cannot be negative");
    }

    // Validate status transitions
    if (this.id && !this.isValidStatusTransition()) {
      errors.push("Invalid status transition");
    }

    if (errors.length > 0) {
      throw new AppError("Validation failed: " + errors.join(", "), 400);
    }

    return true;
  }

  validateItems() {
    if (!this.items || this.items.length === 0) {
      throw new AppError("Purchase order must have at least one item", 400);
    }

    this.items.forEach((item, index) => {
      if (!item.medicine_id && !item.medicineId) {
        throw new AppError(`Item ${index + 1}: Medicine ID is required`, 400);
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new AppError(
          `Item ${index + 1}: Quantity must be greater than 0`,
          400
        );
      }
      if (
        (!item.unit_cost && !item.unitCost) ||
        parseFloat(item.unit_cost || item.unitCost) < 0
      ) {
        throw new AppError(
          `Item ${index + 1}: Unit cost must be 0 or greater`,
          400
        );
      }
    });
  }

  isValidStatusTransition() {
    const validTransitions = {
      pending: ["received", "cancelled", "applied"],
      received: [],
      cancelled: [],
      applied: [],
    };

    return validTransitions[this.status] || [];
  }

  canEdit() {
    return ["pending"].includes(this.status);
  }

  canCancel() {
    return ["pending"].includes(this.status);
  }

  canReceive() {
    return ["pending"].includes(this.status);
  }

  canApply() {
    return ["pending"].includes(this.status);
  }

  // Convert to database format
  toDbFormat() {
    return {
      id: this.id,
      organization_id: this.organizationId,
      po_number: this.poNumber,
      supplier_id: this.supplierId,
      status: this.status,
      order_date: this.orderDate,
      expected_delivery: this.expectedDeliveryDate,
      actual_delivery: this.actualDelivery,
      tax_amount: this.taxAmount,
      discount: this.discountAmount, // Map discountAmount to 'discount' column
      total_amount: this.totalAmount,
      notes: this.notes?.trim(),
      created_by: this.createdBy,
      approved_by: this.approvedBy,
      approved_at: this.approvedAt,
      // TODO: Add applied_at column to database schema
      // applied_at: this.appliedAt
    };
  }

  // Calculate totals from items
  calculateTotals() {
    const subtotal = this.items.reduce((sum, item) => {
      const unitCost = parseFloat(item.unit_cost || item.unitCost || 0);
      const quantity = parseInt(item.quantity || 0);
      return sum + unitCost * quantity;
    }, 0);

    this.totalAmount = subtotal + this.taxAmount - this.discountAmount;

    // Update item total costs
    this.items.forEach((item) => {
      const unitCost = parseFloat(item.unit_cost || item.unitCost || 0);
      const quantity = parseInt(item.quantity || 0);
      item.total_cost = unitCost * quantity;
      item.totalCost = item.total_cost;
    });
  }

  // Static methods for database operations
  static async findById(id, organizationId, includeItems = true) {
    try {
      const result = await query(
        `SELECT po.*, 
                    json_build_object(
                        'id', s.id,
                        'name', s.name,
                        'contact_person', s.contact_person,
                        'email', s.email
                    ) as supplier,
                    json_build_object(
                        'id', u.id,
                        'full_name', u.full_name,
                        'email', u.email
                    ) as creator
                 FROM purchase_orders po
                 LEFT JOIN suppliers s ON s.id = po.supplier_id
                 LEFT JOIN users u ON u.id = po.created_by
                 WHERE po.id = $1 AND po.organization_id = $2`,
        [id, organizationId]
      );

      if (result.rows.length === 0) {
        throw new AppError("Purchase order not found", 404);
      }

      const purchaseOrder = new RefactoredPurchaseOrder(result.rows[0]);

      if (includeItems) {
        await purchaseOrder.loadItems();
      }

      return purchaseOrder;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to fetch purchase order: " + error.message,
        500
      );
    }
  }

  static async findByOrganization(organizationId, options = {}) {
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
      } = options;

      let whereConditions = ["organization_id = $1"];
      let params = [organizationId];
      let paramCount = 2;

      if (status) {
        whereConditions.push(`status = $${paramCount}`);
        params.push(status);
        paramCount++;
      }

      if (supplierId) {
        whereConditions.push(`supplier_id = $${paramCount}`);
        params.push(supplierId);
        paramCount++;
      }

      if (startDate) {
        whereConditions.push(`order_date >= $${paramCount}`);
        params.push(startDate);
        paramCount++;
      }

      if (endDate) {
        whereConditions.push(`order_date <= $${paramCount}`);
        params.push(endDate);
        paramCount++;
      }

      const whereClause = whereConditions.join(" AND ");
      const validSortBy = [
        "order_date",
        "po_number",
        "status",
        "total_amount",
      ].includes(sortBy)
        ? sortBy
        : "order_date";
      const sortDirection = sortOrder === "asc" ? "ASC" : "DESC";
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM purchase_orders WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const result = await query(
        `SELECT po.*,
                    json_build_object(
                        'id', s.id,
                        'name', s.name,
                        'contact_person', s.contact_person
                    ) as supplier,
                    json_build_object(
                        'id', u.id,
                        'full_name', u.full_name
                    ) as creator
                 FROM purchase_orders po
                 LEFT JOIN suppliers s ON s.id = po.supplier_id
                 LEFT JOIN users u ON u.id = po.created_by
                 WHERE ${whereClause}
                 ORDER BY po.${validSortBy} ${sortDirection}
                 LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, offset]
      );

      const purchaseOrders = result.rows.map(
        (row) => new RefactoredPurchaseOrder(row)
      );

      return {
        purchaseOrders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to fetch purchase orders: " + error.message,
        500
      );
    }
  }

  static async getStats(organizationId) {
    try {
      const result = await query(
        `SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(total_amount), 0) as total_value,
                    status
                 FROM purchase_orders
                 WHERE organization_id = $1
                 GROUP BY status`,
        [organizationId]
      );

      const stats = {
        total: 0,
        totalValue: 0,
        statusBreakdown: {},
      };

      result.rows.forEach((row) => {
        stats.total += parseInt(row.total);
        stats.totalValue += parseFloat(row.total_value);
        stats.statusBreakdown[row.status] = parseInt(row.total);
      });

      return stats;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to get purchase order stats: " + error.message,
        500
      );
    }
  }

  static async generatePoNumber(organizationId) {
    try {
      // Get existing PO numbers for this organization to find the next number
      const result = await query(
        `SELECT po_number FROM purchase_orders 
                 WHERE organization_id = $1
                 ORDER BY created_at DESC
                 LIMIT 100`,
        [organizationId]
      );

      // Extract numbers from existing PO numbers and find the highest
      let maxNumber = 0;
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

      if (result.rows && result.rows.length > 0) {
        result.rows.forEach((row) => {
          if (row.po_number && row.po_number.startsWith("PO-")) {
            const parts = row.po_number.split("-");
            if (parts.length >= 3) {
              const numberPart = parseInt(parts[2]);
              if (!isNaN(numberPart)) {
                maxNumber = Math.max(maxNumber, numberPart);
              }
            } else if (parts.length === 2) {
              const numberPart = parseInt(parts[1]);
              if (!isNaN(numberPart)) {
                maxNumber = Math.max(maxNumber, numberPart % 100000);
              }
            }
          }
        });
      }

      const nextNumber = maxNumber + 1;
      const poNumber = `PO-${today}-${nextNumber.toString().padStart(5, "0")}`;

      return poNumber;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to generate PO number: " + error.message, 500);
    }
  }

  // Instance methods
  async loadItems() {
    try {
      const result = await query(
        `SELECT poi.*,
                    json_build_object(
                        'id', m.id,
                        'name', m.name,
                        'generic_name', m.generic_name,
                        'strength', m.strength
                    ) as medicine
                 FROM purchase_order_items poi
                 LEFT JOIN medicines m ON m.id = poi.medicine_id
                 WHERE poi.purchase_order_id = $1
                 ORDER BY poi.created_at`,
        [this.id]
      );

      this.items = result.rows;
      return this.items;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to load purchase order items: " + error.message,
        500
      );
    }
  }

  async save(userId) {
    try {
      this.validate();
      this.validateItems();
      this.calculateTotals();

      const dbData = this.toDbFormat();

      if (this.id) {
        // Update existing purchase order
        if (!this.canEdit()) {
          throw new AppError(
            "Cannot edit purchase order in current status",
            400
          );
        }

        delete dbData.id;
        delete dbData.created_by;

        const updates = [];
        const values = [];
        let paramCount = 1;

        Object.entries(dbData).forEach(([key, value]) => {
          if (value !== undefined) {
            updates.push(`${key} = $${paramCount++}`);
            values.push(value);
          }
        });

        values.push(this.id, this.organizationId);

        const result = await query(
          `UPDATE purchase_orders SET ${updates.join(", ")}, updated_at = NOW()
                     WHERE id = $${paramCount++} AND organization_id = $${paramCount++}
                     RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          throw new AppError("Failed to update purchase order", 500);
        }

        // Update items
        await this.saveItems();

        Object.assign(this, new RefactoredPurchaseOrder(result.rows[0]));
      } else {
        // Create new purchase order
        if (!this.poNumber) {
          this.poNumber = await RefactoredPurchaseOrder.generatePoNumber(
            this.organizationId
          );
          dbData.po_number = this.poNumber;
        }

        dbData.created_by = userId;

        const columns = Object.keys(dbData).filter(
          (k) => dbData[k] !== undefined
        );
        const values = columns.map((k) => dbData[k]);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

        const result = await query(
          `INSERT INTO purchase_orders (${columns.join(
            ", "
          )}, created_at, updated_at)
                     VALUES (${placeholders}, NOW(), NOW())
                     RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          throw new AppError("Failed to create purchase order", 500);
        }

        this.id = result.rows[0].id;

        // Preserve items before Object.assign overwrites them
        const itemsToSave = this.items;
        Object.assign(this, new RefactoredPurchaseOrder(result.rows[0]));
        this.items = itemsToSave;

        // Save items
        await this.saveItems();
      }

      return this;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to save purchase order: " + error.message,
        500
      );
    }
  }

  async saveItems() {
    try {
      if (!this.items || this.items.length === 0) {
        return true;
      }

      // Delete existing items
      await query(
        `DELETE FROM purchase_order_items WHERE purchase_order_id = $1`,
        [this.id]
      );

      // Insert new items
      for (const item of this.items) {
        const result = await query(
          `INSERT INTO purchase_order_items 
                     (purchase_order_id, medicine_id, quantity, unit_cost, total_cost, received_quantity, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     RETURNING id`,
          [
            this.id,
            item.medicine_id || item.medicineId,
            parseInt(item.quantity),
            parseFloat(item.unit_cost || item.unitCost),
            parseFloat(item.total_cost || item.totalCost),
            parseInt(item.received_quantity || item.receivedQuantity || 0),
          ]
        );

        if (result.rows.length === 0) {
          throw new AppError("Failed to save item", 500);
        }
      }

      // Compensate for the automatic inventory update caused by the trigger (if any)
      // The trigger might add full quantity to inventory when items are created,
      // but we only want inventory updated when items are received
      for (const item of this.items) {
        const medicineResult = await query(
          `SELECT quantity FROM medicines WHERE id = $1`,
          [item.medicine_id || item.medicineId]
        );

        if (medicineResult.rows.length === 0) {
          throw new AppError(`Medicine not found for item`, 500);
        }

        // Subtract the quantity that was automatically added by the trigger
        const currentQuantity = medicineResult.rows[0].quantity;
        const newStock = currentQuantity - parseInt(item.quantity);

        await query(
          `UPDATE medicines SET quantity = $1, updated_at = NOW() WHERE id = $2`,
          [newStock, item.medicine_id || item.medicineId]
        );
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to save purchase order items: " + error.message,
        500
      );
    }
  }

  async updateStatus(newStatus, userId, notes = null) {
    try {
      const oldStatus = this.status;

      if (!this.isValidStatusTransition().includes(newStatus)) {
        throw new AppError(
          `Cannot transition from ${oldStatus} to ${newStatus}`,
          400
        );
      }

      this.status = newStatus;

      // Set delivery date if marking as received
      if (newStatus === "received") {
        this.actualDeliveryDate = new Date().toISOString().split("T")[0];
      }

      // Prepare update data
      const updateData = {
        status: this.status,
      };

      if (this.actualDeliveryDate) {
        updateData.actual_delivery = this.actualDeliveryDate;
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      });

      values.push(this.id, this.organizationId);

      await query(
        `UPDATE purchase_orders SET ${updates.join(", ")}, updated_at = NOW()
                 WHERE id = $${paramCount++} AND organization_id = $${paramCount++}`,
        values
      );

      // Log status change
      await this.logStatusChange(oldStatus, newStatus, userId, notes);

      return this;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to update purchase order status: " + error.message,
        500
      );
    }
  }

  async receiveItems(receivedItems, userId) {
    try {
      if (!this.canReceive()) {
        throw new AppError(
          "Purchase order cannot be received in current status",
          400
        );
      }

      // Process each received item
      for (const item of receivedItems) {
        const receivedQty = parseInt(item.received_quantity);
        if (receivedQty <= 0) continue;

        // Get current item data first
        const itemResult = await query(
          `SELECT medicine_id, unit_cost, received_quantity FROM purchase_order_items WHERE id = $1`,
          [item.id]
        );

        if (itemResult.rows.length === 0) {
          throw new AppError(`Item not found: ${item.id}`, 500);
        }

        const itemData = itemResult.rows[0];

        // Calculate new received quantity
        const currentReceived = itemData.received_quantity || 0;
        const newReceivedQuantity = currentReceived + receivedQty;

        // Update purchase order item with received quantity
        await query(
          `UPDATE purchase_order_items SET received_quantity = $1 WHERE id = $2`,
          [newReceivedQuantity, item.id]
        );

        // Get current medicine stock
        const medicineResult = await query(
          `SELECT quantity FROM medicines WHERE id = $1`,
          [itemData.medicine_id]
        );

        if (medicineResult.rows.length === 0) {
          throw new AppError(`Medicine not found`, 500);
        }

        // Calculate new medicine stock
        const currentStock = medicineResult.rows[0].quantity || 0;
        const newStock = currentStock + receivedQty;

        // Update medicine stock
        await query(
          `UPDATE medicines SET quantity = $1, updated_at = NOW() WHERE id = $2`,
          [newStock, itemData.medicine_id]
        );

        // Create inventory transaction
        await query(
          `INSERT INTO inventory_transactions 
                     (medicine_id, organization_id, transaction_type, quantity, unit_price, total_amount, reference_id, reference_type, created_by, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            itemData.medicine_id,
            this.organizationId,
            "purchase_receive",
            receivedQty,
            itemData.unit_cost,
            itemData.unit_cost * receivedQty,
            this.id,
            "purchase_order",
            userId,
          ]
        );
      }

      // Calculate totals to determine new status
      const totalsResult = await query(
        `SELECT SUM(quantity) as total_ordered, SUM(received_quantity) as total_received 
                 FROM purchase_order_items
                 WHERE purchase_order_id = $1`,
        [this.id]
      );

      const totals = totalsResult.rows[0];
      const totalOrdered = parseInt(totals.total_ordered || 0);
      const totalReceived = parseInt(totals.total_received || 0);

      // Update purchase order status
      const newStatus =
        totalReceived >= totalOrdered ? "received" : "partially_received";
      const updateData = {
        status: newStatus,
        actual_delivery:
          newStatus === "received" ? new Date().toISOString() : null,
      };

      const updates = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== null) {
          updates.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      });

      values.push(this.id);

      if (updates.length > 0) {
        await query(
          `UPDATE purchase_orders SET ${updates.join(
            ", "
          )}, updated_at = NOW() WHERE id = $${paramCount}`,
          values
        );
      }

      // Reload the purchase order to get updated status
      const updatedPO = await RefactoredPurchaseOrder.findById(
        this.id,
        this.organizationId
      );
      Object.assign(this, updatedPO);

      return { success: true, message: "Items received successfully" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to receive purchase order items: " + error.message,
        500
      );
    }
  }

  async cancel(userId, reason = null) {
    try {
      if (!this.canCancel()) {
        throw new AppError(
          "Cannot cancel purchase order in current status",
          400
        );
      }

      await this.updateStatus("cancelled", userId, reason);
      return this;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to cancel purchase order: " + error.message,
        500
      );
    }
  }

  async logStatusChange(oldStatus, newStatus, userId, notes = null) {
    try {
      await query(
        `INSERT INTO purchase_order_status_history 
                 (purchase_order_id, old_status, new_status, changed_by, notes, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
        [this.id, oldStatus, newStatus, userId, notes]
      );
    } catch (error) {
      console.error("Failed to log status change:", error);
    }
  }

  async getStatusHistory() {
    try {
      const result = await query(
        `SELECT posh.*,
                    json_build_object(
                        'id', u.id,
                        'full_name', u.full_name
                    ) as user
                 FROM purchase_order_status_history posh
                 LEFT JOIN users u ON u.id = posh.changed_by
                 WHERE posh.purchase_order_id = $1
                 ORDER BY posh.created_at DESC`,
        [this.id]
      );

      return result.rows;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to get status history: " + error.message, 500);
    }
  }
}

module.exports = RefactoredPurchaseOrder;
