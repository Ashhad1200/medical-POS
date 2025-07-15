const { supabase } = require("../config/supabase");

// Get all suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const organizationId = req.user.organization_id;

    let query = supabase
      .from("suppliers")
      .select("*")
      .eq("organization_id", organizationId);

    // Apply search filter
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    // Apply status filter
    if (status && status !== "all") {
      query = query.eq("is_active", status === "active");
    }

    // Apply sorting and pagination
    query = query.order("name");
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: suppliers, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching suppliers",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: {
        suppliers: suppliers || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || suppliers?.length || 0,
          pages: Math.ceil((count || suppliers?.length || 0) / limit),
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

// Get single supplier
const getSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (error || !supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      data: { supplier },
    });
  } catch (error) {
    console.error("Get supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching supplier",
    });
  }
};

// Create supplier
const createSupplier = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      contact_person,
      tax_number,
      payment_terms,
      notes,
    } = req.body;

    const organizationId = req.user.organization_id;

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .insert({
        name,
        email,
        phone,
        address,
        contact_person,
        tax_number,
        payment_terms,
        notes,
        organization_id: organizationId,
        is_active: true,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Error creating supplier",
        error: error.message,
      });
    }

    res.status(201).json({
      success: true,
      data: { supplier },
    });
  } catch (error) {
    console.error("Create supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating supplier",
    });
  }
};

// Update supplier
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.organization_id;
    delete updateData.created_at;
    delete updateData.updated_at;

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .update({
        ...updateData,
        updated_by: req.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error || !supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      data: { supplier },
    });
  } catch (error) {
    console.error("Update supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating supplier",
    });
  }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const { error } = await supabase
      .from("suppliers")
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error deleting supplier",
        error: error.message,
      });
    }

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

// Search suppliers
const searchSuppliers = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const organizationId = req.user.organization_id;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("id, name, email, phone, contact_person")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("name")
      .limit(parseInt(limit));

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error searching suppliers",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: { suppliers: suppliers || [] },
    });
  } catch (error) {
    console.error("Search suppliers error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching suppliers",
    });
  }
};

// Get supplier statistics
const getSupplierStats = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("is_active")
      .eq("organization_id", organizationId);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching supplier stats",
        error: error.message,
      });
    }

    const stats = {
      totalSuppliers: suppliers?.length || 0,
      activeSuppliers: suppliers?.filter((s) => s.is_active).length || 0,
      inactiveSuppliers: suppliers?.filter((s) => !s.is_active).length || 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get supplier stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching supplier stats",
    });
  }
};

// Toggle supplier status
const toggleSupplierStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const { is_active } = req.body;

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .update({ is_active })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error || !supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      data: { supplier },
      message: `Supplier status toggled to ${is_active ? "active" : "inactive"} successfully`,
    });
  } catch (error) {
    console.error("Toggle supplier status error:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling supplier status",
    });
  }
};

// Get suppliers by city
const getSuppliersByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const organizationId = req.user.organization_id;

    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("organization_id", organizationId)
      .ilike("address", `%${city}%`) // Assuming 'address' contains city information
      .order("name");

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching suppliers by city",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: { suppliers: suppliers || [] },
    });
  } catch (error) {
    console.error("Get suppliers by city error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching suppliers by city",
    });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus,
  searchSuppliers,
  getSupplierStats,
  getSuppliersByCity,
};
