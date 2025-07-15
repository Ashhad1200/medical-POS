const { supabase } = require("../config/supabase");

// Get all medicines
const getAllMedicines = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      manufacturer,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;
    const organizationId = req.user.organization_id;

    let query = supabase
      .from("medicines")
      .select("*")
      .eq("organizationId", organizationId)
      .eq("isActive", true);

    // Apply search filter
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,genericName.ilike.%${search}%,manufacturer.ilike.%${search}%`
      );
    }

    // Apply category filter
    if (category) {
      query = query.eq("category", category);
    }

    // Apply manufacturer filter
    if (manufacturer) {
      query = query.eq("manufacturer", manufacturer);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: medicines, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching medicines",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: {
        medicines: medicines || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || medicines?.length || 0,
          pages: Math.ceil((count || medicines?.length || 0) / limit),
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

// Get single medicine
const getMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const { data: medicine, error } = await supabase
      .from("medicines")
      .select("*")
      .eq("id", id)
      .eq("organizationId", organizationId)
      .eq("isActive", true)
      .single();

    if (error || !medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.json({
      success: true,
      data: { medicine },
    });
  } catch (error) {
    console.error("Get medicine error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching medicine",
    });
  }
};

// Create medicine
const createMedicine = async (req, res) => {
  try {
    const {
      name,
      genericName,
      manufacturer,
      batchNumber,
      sellingPrice,
      costPrice,
      gstPerUnit,
      gstRate,
      quantity,
      lowStockThreshold,
      expiryDate,
      category,
      description,
      isActive,
      supplierId,
    } = req.body;

    const organizationId = req.user.organization_id;

    const { data: medicine, error } = await supabase
      .from("medicines")
      .insert({
        name,
        genericName,
        manufacturer,
        batchNumber,
        sellingPrice: parseFloat(sellingPrice),
        costPrice: parseFloat(costPrice),
        gstPerUnit: parseFloat(gstPerUnit),
        gstRate: parseFloat(gstRate),
        quantity: parseInt(quantity),
        lowStockThreshold: parseInt(lowStockThreshold),
        expiryDate,
        category,
        description,
        isActive: isActive,
        organizationId: organizationId,
        supplierId: supplierId,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Error creating medicine",
        error: error.message,
      });
    }

    res.status(201).json({
      success: true,
      data: { medicine },
    });
  } catch (error) {
    console.error("Create medicine error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating medicine",
    });
  }
};

// Update medicine
const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const { data: medicine, error } = await supabase
      .from("medicines")
      .update({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organizationId", organizationId)
      .select()
      .single();

    if (error || !medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.json({
      success: true,
      data: { medicine },
    });
  } catch (error) {
    console.error("Update medicine error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating medicine",
    });
  }
};

// Update stock
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation = "add" } = req.body;
    const organizationId = req.user.organization_id;

    // Get current medicine
    const { data: medicine, error: fetchError } = await supabase
      .from("medicines")
      .select("quantity")
      .eq("id", id)
      .eq("organizationId", organizationId)
      .single();

    if (fetchError || !medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    // Calculate new quantity
    let newQuantity = medicine.quantity;
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
    const { data: updatedMedicine, error } = await supabase
      .from("medicines")
      .update({
        quantity: newQuantity,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organizationId", organizationId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error updating stock",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: { medicine: updatedMedicine },
    });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating stock",
    });
  }
};

// Delete medicine
const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const { error } = await supabase
      .from("medicines")
      .update({ isActive: false })
      .eq("id", id)
      .eq("organizationId", organizationId);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error deleting medicine",
        error: error.message,
      });
    }

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

// Search medicines
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

    const { data: medicines, error } = await supabase
      .from("medicines")
      .select(
        "id, name, genericName, manufacturer, sellingPrice, quantity, lowStockThreshold"
      )
      .eq("organizationId", organizationId)
      .eq("isActive", true)
      .or(
        `name.ilike.%${q}%,genericName.ilike.%${q}%,manufacturer.ilike.%${q}%`
      )
      .order("name")
      .limit(parseInt(limit));

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error searching medicines",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: { medicines: medicines || [] },
    });
  } catch (error) {
    console.error("Search medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching medicines",
    });
  }
};

// Get inventory stats
const getInventoryStats = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const { data: medicines, error } = await supabase
      .from("medicines")
      .select("quantity, lowStockThreshold, sellingPrice, expiryDate")
      .eq("organizationId", organizationId)
      .eq("isActive", true);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching inventory stats",
        error: error.message,
      });
    }

    const stats = {
      totalMedicines: medicines?.length || 0,
      totalValue:
        medicines?.reduce(
          (sum, med) => sum + med.quantity * med.sellingPrice,
          0
        ) || 0,
      lowStockItems:
        medicines?.filter((med) => med.quantity <= med.lowStockThreshold)
          .length || 0,
      outOfStockItems:
        medicines?.filter((med) => med.quantity === 0).length || 0,
      expiringSoon:
        medicines?.filter((med) => {
          const expiryDate = new Date(med.expiryDate);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
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

// Get low stock medicines
const getLowStockMedicines = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const { data: medicines, error } = await supabase
      .from("medicines")
      .select("*")
      .eq("organizationId", organizationId)
      .eq("isActive", true)
      .lte("quantity", "lowStockThreshold")
      .order("quantity");

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching low stock medicines",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: { medicines: medicines || [] },
    });
  } catch (error) {
    console.error("Get low stock medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching low stock medicines",
    });
  }
};

// Get expired medicines
const getExpiredMedicines = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const today = new Date().toISOString().split("T")[0];

    const { data: medicines, error } = await supabase
      .from("medicines")
      .select("*")
      .eq("organizationId", organizationId)
      .eq("isActive", true)
      .lt("expiryDate", today)
      .order("expiryDate");

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching expired medicines",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: { medicines: medicines || [] },
    });
  } catch (error) {
    console.error("Get expired medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching expired medicines",
    });
  }
};

// Get expiring soon medicines
const getExpiringSoonMedicines = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const futureDate = thirtyDaysFromNow.toISOString().split("T")[0];

    const { data: medicines, error } = await supabase
      .from("medicines")
      .select("*")
      .eq("organizationId", organizationId)
      .eq("isActive", true)
      .gte("expiryDate", today)
      .lte("expiryDate", futureDate)
      .order("expiryDate");

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching expiring soon medicines",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: { medicines: medicines || [] },
    });
  } catch (error) {
    console.error("Get expiring soon medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching expiring soon medicines",
    });
  }
};

const xlsx = require("xlsx");

// ... (existing code)

const bulkImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const organizationId = req.user.organization_id;
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const medicinesToInsert = data.map((row) => ({
      name: row.name,
      genericName: row.genericName,
      manufacturer: row.manufacturer,
      batchNumber: row.batchNumber,
      sellingPrice: parseFloat(row.sellingPrice),
      costPrice: parseFloat(row.costPrice),
      gstPerUnit: parseFloat(row.gstPerUnit),
      gstRate: parseFloat(row.gstRate),
      quantity: parseInt(row.quantity),
      lowStockThreshold: parseInt(row.lowStockThreshold),
      expiryDate: row.expiryDate,
      category: row.category,
      description: row.description,
      isActive: row.isActive,
      organizationId: organizationId,
      supplierId: row.supplierId,
    }));

    const { data: insertedMedicines, error } = await supabase
      .from("medicines")
      .insert(medicinesToInsert)
      .select();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error importing medicines",
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: `${insertedMedicines.length} medicines imported successfully`,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({
      success: false,
      message: "Error importing medicines",
    });
  }
};

const exportInventory = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const { data: medicines, error } = await supabase
      .from("medicines")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching medicines for export",
        error: error.message,
      });
    }

    const worksheet = xlsx.utils.json_to_sheet(medicines);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Medicines");

    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventory.xlsx"
    );
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
