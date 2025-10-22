const { query, withTransaction } = require("../config/database");
const xlsx = require("xlsx");

/**
 * Get all medicines with pagination and filters
 * Supports search, category, manufacturer, stock filters, and sorting
 */
const getAllMedicines = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      manufacturer,
      stockFilter = "all",
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;
    const organizationId = req.user.organization_id;

    // Build WHERE clause with filters
    let whereConditions = ["organization_id = $1", "is_active = true"];
    let params = [organizationId];
    let paramIndex = 2;

    if (search) {
      whereConditions.push(
        `(name ILIKE $${paramIndex} OR generic_name ILIKE $${paramIndex} OR manufacturer ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (manufacturer) {
      whereConditions.push(`manufacturer = $${paramIndex}`);
      params.push(manufacturer);
      paramIndex++;
    }

    if (stockFilter && stockFilter !== "all") {
      switch (stockFilter) {
        case "in-stock":
          whereConditions.push("quantity > low_stock_threshold");
          break;
        case "low-stock":
          whereConditions.push(
            "quantity <= low_stock_threshold AND quantity > 0"
          );
          break;
        case "out-of-stock":
          whereConditions.push("quantity = 0");
          break;
        case "expired":
          whereConditions.push(`expiry_date < CURRENT_DATE`);
          break;
        case "expiring-soon":
          whereConditions.push(
            `expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'`
          );
          break;
      }
    }

    const whereClause = whereConditions.join(" AND ");
    const sortColumn = [
      "name",
      "manufacturer",
      "quantity",
      "selling_price",
      "expiry_date",
    ].includes(sortBy)
      ? sortBy
      : "name";
    const sortDirection = sortOrder === "asc" ? "ASC" : "DESC";

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM medicines WHERE ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated data
    const offset = (page - 1) * limit;
    const medicinesResult = await query(
      `SELECT * FROM medicines WHERE ${whereClause} ORDER BY ${sortColumn} ${sortDirection} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = parseInt(page);

    res.json({
      success: true,
      data: {
        medicines: medicinesResult.rows || [],
        pagination: {
          currentPage,
          itemsPerPage: parseInt(limit),
          totalItems: totalCount,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching medicines",
    });
  }
};

/**
 * Get a single medicine by ID
 */
const getMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const result = await query(
      "SELECT * FROM medicines WHERE id = $1 AND organization_id = $2 AND is_active = true",
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.json({
      success: true,
      data: { medicine: result.rows[0] },
    });
  } catch (error) {
    console.error("Get medicine error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching medicine",
    });
  }
};

/**
 * Create a new medicine
 */
const createMedicine = async (req, res) => {
  try {
    const {
      name,
      generic_name,
      manufacturer,
      batch_number,
      selling_price,
      cost_price,
      gst_per_unit,
      gst_rate,
      quantity,
      low_stock_threshold,
      expiry_date,
      category,
      description,
      is_active,
      supplier_id,
    } = req.body;

    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    console.log("Creating medicine with user:", userId, "org:", organizationId);

    // Validate required fields
    if (!name || !manufacturer) {
      return res.status(400).json({
        success: false,
        message: "Name and manufacturer are required fields",
      });
    }

    // Prepare medicine data
    const medicineData = {
      name,
      generic_name: generic_name || null,
      manufacturer: manufacturer || "Unknown",
      batch_number: batch_number || null,
      selling_price: selling_price ? parseFloat(selling_price) : 0,
      cost_price: cost_price ? parseFloat(cost_price) : 0,
      gst_per_unit: gst_per_unit ? parseFloat(gst_per_unit) : 0,
      gst_rate: gst_rate ? parseFloat(gst_rate) : 0,
      quantity: quantity ? parseInt(quantity) : 0,
      low_stock_threshold: low_stock_threshold ? parseInt(low_stock_threshold) : 10,
      expiry_date: expiry_date || "2025-12-31",
      category: category || null,
      description: description || null,
      is_active: is_active !== undefined ? is_active : true,
      supplier_id: supplier_id || null,
      organization_id: organizationId,
      created_by: userId,
    };

    // Insert medicine into PostgreSQL
    const result = await query(
      `INSERT INTO medicines (
        name, generic_name, manufacturer, batch_number, selling_price, cost_price,
        gst_per_unit, gst_rate, quantity, low_stock_threshold, expiry_date, category,
        description, is_active, supplier_id, organization_id, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      RETURNING *`,
      [
        medicineData.name,
        medicineData.generic_name,
        medicineData.manufacturer,
        medicineData.batch_number,
        medicineData.selling_price,
        medicineData.cost_price,
        medicineData.gst_per_unit,
        medicineData.gst_rate,
        medicineData.quantity,
        medicineData.low_stock_threshold,
        medicineData.expiry_date,
        medicineData.category,
        medicineData.description,
        medicineData.is_active,
        medicineData.supplier_id,
        medicineData.organization_id,
        medicineData.created_by,
      ]
    );

    const medicine = result.rows[0];
    console.log("Medicine created successfully:", medicine.id);

    res.status(201).json({
      success: true,
      data: { medicine },
    });
  } catch (error) {
    console.error("Create medicine error:", error);

    // Check for duplicate key error
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A medicine with this name already exists in your organization",
        code: "DUPLICATE_MEDICINE",
      });
    }

    res.status(400).json({
      success: false,
      message: "Error creating medicine: " + error.message,
      error: error.message,
    });
  }
};

/**
 * Update a medicine
 */
const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const updateData = req.body;

    console.log("Updating medicine:", id, "for org:", organizationId);

    // Define allowed fields for update
    const allowedFields = [
      "name",
      "generic_name",
      "manufacturer",
      "category",
      "subcategory",
      "description",
      "dosage_form",
      "strength",
      "pack_size",
      "storage_conditions",
      "quantity",
      "is_active",
      "prescription_required",
      "supplier_id",
      "batch_number",
      "selling_price",
      "cost_price",
      "gst_per_unit",
      "gst_rate",
      "expiry_date",
    ];

    const fieldMappings = {
      batchNumber: "batch_number",
      retailPrice: "selling_price",
      tradePrice: "cost_price",
      gstPerUnit: "gst_per_unit",
      expiryDate: "expiry_date",
      reorderThreshold: "low_stock_threshold",
    };

    // Build SET clause
    const setFields = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      let dbField = fieldMappings[key] || key;

      if (allowedFields.includes(dbField)) {
        let setValue = value;

        // Type conversions
        if (
          ["quantity", "low_stock_threshold"].includes(dbField) &&
          value !== undefined
        ) {
          setValue = parseInt(value);
        } else if (
          ["selling_price", "cost_price", "gst_per_unit", "gst_rate"].includes(
            dbField
          ) &&
          value !== undefined
        ) {
          setValue = parseFloat(value);
        }

        setFields.push(`${dbField} = $${paramIndex}`);
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

    // Add updated_at
    setFields.push(`updated_at = NOW()`);

    // Add where conditions
    params.push(id, organizationId);
    const whereIndex1 = paramIndex;
    const whereIndex2 = paramIndex + 1;

    const result = await query(
      `UPDATE medicines SET ${setFields.join(", ")} 
       WHERE id = $${whereIndex1} AND organization_id = $${whereIndex2}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.json({
      success: true,
      data: { medicine: result.rows[0] },
    });
  } catch (error) {
    console.error("Update medicine error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating medicine",
    });
  }
};

/**
 * Update medicine stock quantity
 */
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation = "add" } = req.body;
    const organizationId = req.user.organization_id;

    // Get current medicine
    const result = await query(
      "SELECT quantity FROM medicines WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    const currentQuantity = result.rows[0].quantity;

    // Calculate new quantity
    let newQuantity = currentQuantity;
    if (operation === "add") {
      newQuantity += parseInt(quantity);
    } else if (operation === "subtract") {
      newQuantity -= parseInt(quantity);
    } else if (operation === "set") {
      newQuantity = parseInt(quantity);
    }

    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity cannot be negative",
      });
    }

    // Update quantity
    const updateResult = await query(
      `UPDATE medicines SET quantity = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3 RETURNING *`,
      [newQuantity, id, organizationId]
    );

    res.json({
      success: true,
      data: { medicine: updateResult.rows[0] },
    });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating stock",
    });
  }
};

/**
 * Delete a medicine (soft delete or archive if has related records)
 */
const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Check if medicine has any related records
    const orderItemsResult = await query(
      "SELECT id FROM order_items WHERE medicine_id = $1 LIMIT 1",
      [id]
    );

    const purchaseOrderItemsResult = await query(
      "SELECT id FROM purchase_order_items WHERE medicine_id = $1 LIMIT 1",
      [id]
    );

    const inventoryTransactionsResult = await query(
      "SELECT id FROM inventory_transactions WHERE medicine_id = $1 LIMIT 1",
      [id]
    );

    // If medicine has related records, archive instead of delete
    if (
      orderItemsResult.rows.length > 0 ||
      purchaseOrderItemsResult.rows.length > 0 ||
      inventoryTransactionsResult.rows.length > 0
    ) {
      // Archive the medicine by setting is_active to false
      await query(
        "UPDATE medicines SET is_active = false, updated_at = NOW() WHERE id = $1 AND organization_id = $2",
        [id, organizationId]
      );

      return res.json({
        success: true,
        message:
          "Medicine archived successfully (cannot be deleted due to existing transactions)",
        archived: true,
      });
    }

    // If no related records, proceed with deletion
    await query(
      "DELETE FROM medicines WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

    res.json({
      success: true,
      message: "Medicine deleted successfully",
    });
  } catch (error) {
    console.error("Delete medicine error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting medicine",
    });
  }
};

/**
 * Search medicines by name, generic name, manufacturer, or batch number
 */
const searchMedicines = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const organizationId = req.user.organization_id;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const result = await query(
      `SELECT id, name, generic_name, manufacturer, batch_number, selling_price, cost_price,
              gst_per_unit, quantity, low_stock_threshold, expiry_date
       FROM medicines WHERE organization_id = $1 AND is_active = true
       AND (name ILIKE $2 OR generic_name ILIKE $2 OR manufacturer ILIKE $2 OR batch_number ILIKE $2)
       ORDER BY name LIMIT $3`,
      [organizationId, `%${q}%`, limit]
    );

    res.json({
      success: true,
      data: { medicines: result.rows || [] },
    });
  } catch (error) {
    console.error("Search medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching medicines",
    });
  }
};

/**
 * Get inventory statistics
 */
const getInventoryStats = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT quantity, low_stock_threshold, selling_price, expiry_date
       FROM medicines WHERE organization_id = $1 AND is_active = true`,
      [organizationId]
    );

    const medicines = result.rows;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const stats = {
      total: medicines?.length || 0,
      totalValue:
        medicines?.reduce((sum, med) => sum + med.quantity * med.selling_price, 0) ||
        0,
      lowStock:
        medicines?.filter((med) => med.quantity <= med.low_stock_threshold)
          .length || 0,
      inStock:
        medicines?.filter((med) => med.quantity > med.low_stock_threshold)
          .length || 0,
      outOfStock: medicines?.filter((med) => med.quantity === 0).length || 0,
      expired:
        medicines?.filter((med) => {
          const expiryDate = new Date(med.expiry_date);
          return expiryDate <= now;
        }).length || 0,
      expiringSoon:
        medicines?.filter((med) => {
          const expiryDate = new Date(med.expiry_date);
          return expiryDate <= thirtyDaysFromNow && expiryDate > now;
        }).length || 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get inventory stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inventory stats",
    });
  }
};

/**
 * Get low stock medicines
 */
const getLowStockMedicines = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT * FROM medicines WHERE organization_id = $1 AND is_active = true
       AND quantity <= low_stock_threshold ORDER BY quantity`,
      [organizationId]
    );

    res.json({
      success: true,
      data: { medicines: result.rows || [] },
    });
  } catch (error) {
    console.error("Get low stock medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching low stock medicines",
    });
  }
};

/**
 * Get expired medicines
 */
const getExpiredMedicines = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT * FROM medicines WHERE organization_id = $1 AND is_active = true
       AND expiry_date < CURRENT_DATE ORDER BY expiry_date`,
      [organizationId]
    );

    res.json({
      success: true,
      data: { medicines: result.rows || [] },
    });
  } catch (error) {
    console.error("Get expired medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching expired medicines",
    });
  }
};

/**
 * Get medicines expiring in the next 30 days
 */
const getExpiringSoonMedicines = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT * FROM medicines WHERE organization_id = $1 AND is_active = true
       AND expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY expiry_date`,
      [organizationId]
    );

    res.json({
      success: true,
      data: { medicines: result.rows || [] },
    });
  } catch (error) {
    console.error("Get expiring soon medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching expiring soon medicines",
    });
  }
};

/**
 * Bulk import medicines from Excel file
 */
const bulkImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let insertedCount = 0;

    for (const row of data) {
      try {
        await query(
          `INSERT INTO medicines (
            name, generic_name, manufacturer, batch_number, selling_price, cost_price,
            gst_per_unit, gst_rate, quantity, low_stock_threshold, expiry_date, category,
            description, is_active, organization_id, supplier_id, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())`,
          [
            row.name,
            row.genericName || null,
            row.manufacturer,
            row.batchNumber || null,
            parseFloat(row.sellingPrice) || 0,
            parseFloat(row.costPrice) || 0,
            parseFloat(row.gstPerUnit) || 0,
            parseFloat(row.gstRate) || 0,
            parseInt(row.quantity) || 0,
            parseInt(row.lowStockThreshold) || 10,
            row.expiryDate || "2025-12-31",
            row.category || null,
            row.description || null,
            row.isActive !== false,
            organizationId,
            row.supplierId || null,
            userId,
          ]
        );
        insertedCount++;
      } catch (error) {
        console.error("Error inserting medicine from bulk import:", error.message);
      }
    }

    res.json({
      success: true,
      message: `${insertedCount} medicines imported successfully`,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({
      success: false,
      message: "Error importing medicines",
    });
  }
};

/**
 * Export medicines to Excel file
 */
const exportInventory = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const result = await query(
      "SELECT * FROM medicines WHERE organization_id = $1 AND is_active = true",
      [organizationId]
    );

    const medicines = result.rows;

    const worksheet = xlsx.utils.json_to_sheet(medicines);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Medicines");

    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", "attachment; filename=inventory.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Export inventory error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting inventory",
    });
  }
};

module.exports = {
  getAllMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  updateStock,
  deleteMedicine,
  searchMedicines,
  getInventoryStats,
  getLowStockMedicines,
  getExpiredMedicines,
  getExpiringSoonMedicines,
  bulkImport,
  exportInventory,
};
