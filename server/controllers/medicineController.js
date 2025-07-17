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
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    // Apply search filter
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,generic_name.ilike.%${search}%,manufacturer.ilike.%${search}%`
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
      .eq("organization_id", organizationId)
      .eq("is_active", true)
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
    const userSupabase = req.supabase || supabase;
    
    console.log('Creating medicine with user:', req.user.id, 'org:', organizationId);
    console.log('Using bypass function');
    console.log('Medicine data:', { name, generic_name, manufacturer });

    const medicineData = {
      name,
      generic_name,
      manufacturer,
      batch_number,
      selling_price: parseFloat(selling_price),
      cost_price: parseFloat(cost_price),
      gst_per_unit: parseFloat(gst_per_unit),
      gst_rate: parseFloat(gst_rate),
      quantity: parseInt(quantity),
      low_stock_threshold: parseInt(low_stock_threshold),
      expiry_date,
      category,
      description,
      is_active,
      organization_id: organizationId,
      supplier_id,
      created_by: req.user.id,
    };

    // Create a fresh service role client to bypass RLS
    const { createClient } = require('@supabase/supabase-js');
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
     
     const { data: medicine, error } = await serviceSupabase
       .from('medicines')
       .insert({
         name: medicineData.name,
         generic_name: medicineData.generic_name || null,
         manufacturer: medicineData.manufacturer || 'Unknown',
         batch_number: medicineData.batch_number || null,
         selling_price: medicineData.selling_price || 0,
         cost_price: medicineData.cost_price || 0,
         gst_per_unit: medicineData.gst_per_unit || 0,
         gst_rate: medicineData.gst_rate || 0,
         quantity: medicineData.quantity || 0,
         low_stock_threshold: medicineData.low_stock_threshold || 10,
         expiry_date: medicineData.expiry_date || '2025-12-31',
         category: medicineData.category || null,
         subcategory: medicineData.subcategory || null,
         description: medicineData.description || null,
         dosage_form: medicineData.dosage_form || null,
         strength: medicineData.strength || null,
         pack_size: medicineData.pack_size || null,
         storage_conditions: medicineData.storage_conditions || null,
         prescription_required: medicineData.prescription_required || false,
         is_active: medicineData.is_active !== undefined ? medicineData.is_active : true,
         supplier_id: medicineData.supplier_id || null,
         organization_id: req.user.organization_id,
         created_by: req.user.id
       })
       .select()
       .single();

    if (error) {
      console.error('Medicine creation error details:', error);
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
    
    console.log('Updating medicine:', id, 'for org:', organizationId);
    console.log('Update data:', updateData);

    // Map field names from frontend to database schema
    const mappedData = {};
    
    // Direct mappings
    if (updateData.name) mappedData.name = updateData.name;
    if (updateData.generic_name) mappedData.generic_name = updateData.generic_name;
    if (updateData.manufacturer) mappedData.manufacturer = updateData.manufacturer;
    if (updateData.category) mappedData.category = updateData.category;
    if (updateData.subcategory) mappedData.subcategory = updateData.subcategory;
    if (updateData.description) mappedData.description = updateData.description;
    if (updateData.dosage_form) mappedData.dosage_form = updateData.dosage_form;
    if (updateData.strength) mappedData.strength = updateData.strength;
    if (updateData.pack_size) mappedData.pack_size = updateData.pack_size;
    if (updateData.storage_conditions) mappedData.storage_conditions = updateData.storage_conditions;
    if (updateData.quantity !== undefined) mappedData.quantity = parseInt(updateData.quantity);
    if (updateData.is_active !== undefined) mappedData.is_active = updateData.is_active;
    if (updateData.prescription_required !== undefined) mappedData.prescription_required = updateData.prescription_required;
    if (updateData.supplier_id) mappedData.supplier_id = updateData.supplier_id;
    
    // Field name mappings (frontend -> database)
    if (updateData.batchNumber) mappedData.batch_number = updateData.batchNumber;
    if (updateData.batch_number) mappedData.batch_number = updateData.batch_number;
    if (updateData.retailPrice !== undefined) mappedData.selling_price = parseFloat(updateData.retailPrice);
    if (updateData.selling_price !== undefined) mappedData.selling_price = parseFloat(updateData.selling_price);
    if (updateData.tradePrice !== undefined) mappedData.cost_price = parseFloat(updateData.tradePrice);
    if (updateData.cost_price !== undefined) mappedData.cost_price = parseFloat(updateData.cost_price);
    if (updateData.gstPerUnit !== undefined) mappedData.gst_per_unit = parseFloat(updateData.gstPerUnit);
    if (updateData.gst_per_unit !== undefined) mappedData.gst_per_unit = parseFloat(updateData.gst_per_unit);
    if (updateData.gst_rate !== undefined) mappedData.gst_rate = parseFloat(updateData.gst_rate);
    if (updateData.expiryDate) mappedData.expiry_date = updateData.expiryDate;
    if (updateData.expiry_date) mappedData.expiry_date = updateData.expiry_date;
    if (updateData.reorderThreshold !== undefined) mappedData.low_stock_threshold = parseInt(updateData.reorderThreshold);
    if (updateData.low_stock_threshold !== undefined) mappedData.low_stock_threshold = parseInt(updateData.low_stock_threshold);
    
    console.log('Mapped update data:', mappedData);

    // Create a fresh service role client to bypass RLS
    const { createClient } = require('@supabase/supabase-js');
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    const { data: medicine, error } = await serviceSupabase
      .from("medicines")
      .update({
        ...mappedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
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
      .eq("organization_id", organizationId)
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
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

    // Create a fresh service role client to bypass RLS
    const { createClient } = require('@supabase/supabase-js');
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { error } = await serviceSupabase
      .from("medicines")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

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
        "id, name, generic_name, manufacturer, selling_price, quantity, low_stock_threshold"
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .or(
        `name.ilike.%${q}%,generic_name.ilike.%${q}%,manufacturer.ilike.%${q}%`
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
      data: { medicines: lowStockMedicines },
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
      .select("quantity, low_stock_threshold, selling_price, expiry_date")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

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
          (sum, med) => sum + med.quantity * med.selling_price,
          0
        ) || 0,
      lowStockItems:
        medicines?.filter((med) => med.quantity <= med.low_stock_threshold)
          .length || 0,
      outOfStockItems:
        medicines?.filter((med) => med.quantity === 0).length || 0,
      expiringSoon:
        medicines?.filter((med) => {
          const expiryDate = new Date(med.expiry_date);
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

    // Use a raw SQL query to compare quantity with low_stock_threshold
    const { data: medicines, error } = await supabase
      .from("medicines")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("quantity");

    // Filter in JavaScript since Supabase doesn't support column-to-column comparison directly
    const lowStockMedicines = medicines ? medicines.filter(medicine => 
      medicine.quantity <= medicine.low_stock_threshold
    ) : [];

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
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .lt("expiry_date", today)
      .order("expiry_date");

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
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .gte("expiry_date", today)
      .lte("expiry_date", futureDate)
      .order("expiry_date");

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
      generic_name: row.genericName,
      manufacturer: row.manufacturer,
      batch_number: row.batchNumber,
      selling_price: parseFloat(row.sellingPrice),
      cost_price: parseFloat(row.costPrice),
      gst_per_unit: parseFloat(row.gstPerUnit),
      gst_rate: parseFloat(row.gstRate),
      quantity: parseInt(row.quantity),
      low_stock_threshold: parseInt(row.lowStockThreshold),
      expiry_date: row.expiryDate,
      category: row.category,
      description: row.description,
      is_active: row.isActive,
       organization_id: organizationId,
       supplier_id: row.supplierId,
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
