const { supabase } = require("../config/supabase");

// Search customers
const searchCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      query = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;
    const organizationId = req.user.organization_id;
    const client = req.supabase || supabase;

    let supabaseQuery = client
      .from("customers")
      .select("*")
      .eq("organization_id", organizationId);

    // Apply search filter
    if (query && query.trim()) {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`
      );
    }

    // Apply sorting
    supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (page - 1) * limit;
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

    const { data: customers, error, count } = await supabaseQuery;

    if (error) {
      console.error("Error searching customers:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to search customers",
        error: error.message,
      });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from("customers")
      .select("*", { count: 'exact', head: true })
      .eq("organization_id", organizationId);

    res.json({
      success: true,
      data: {
        customers: customers || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error("Error in searchCustomers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get customer by ID
const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const client = req.supabase || supabase;

    const { data: customer, error } = await client
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }
      console.error("Error fetching customer:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch customer",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: { customer }
    });
  } catch (error) {
    console.error("Error in getCustomer:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, date_of_birth, gender, allergies, emergency_contact, emergency_phone } = req.body;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const client = req.supabase || supabase;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required"
      });
    }

    // Check if customer with same phone already exists
    const { data: existingCustomer } = await client
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .eq("organization_id", organizationId)
      .single();

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer with this phone number already exists"
      });
    }

    const customerData = {
      name,
      phone,
      email: email || null,
      address: address || null,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      allergies: allergies || null,
      emergency_contact: emergency_contact || null,
      emergency_phone: emergency_phone || null,
      organization_id: organizationId,
      created_by: userId
    };

    const { data: customer, error } = await client
      .from("customers")
      .insert(customerData)
      .select()
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create customer",
        error: error.message,
      });
    }

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: { customer }
    });
  } catch (error) {
    console.error("Error in createCustomer:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, date_of_birth, gender, allergies, emergency_contact, emergency_phone } = req.body;
    const organizationId = req.user.organization_id;
    const client = req.supabase || supabase;

    // Check if customer exists
    const { data: existingCustomer, error: fetchError } = await client
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const updateData = {
      name,
      phone,
      email: email || null,
      address: address || null,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      allergies: allergies || null,
      emergency_contact: emergency_contact || null,
      emergency_phone: emergency_phone || null,
      updated_at: new Date().toISOString()
    };

    const { data: customer, error } = await client
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating customer:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update customer",
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Customer updated successfully",
      data: { customer }
    });
  } catch (error) {
    console.error("Error in updateCustomer:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const client = req.supabase || supabase;

    // Check if customer has any orders (using customer name and phone since customer_id doesn't exist)
    const { data: customerData } = await client
      .from("customers")
      .select("name, phone")
      .eq("id", id)
      .single();

    const { data: orders, error: ordersError } = await client
      .from("orders")
      .select("id")
      .eq("customer_name", customerData?.name)
      .eq("customer_phone", customerData?.phone)
      .eq("organization_id", organizationId)
      .limit(1);

    if (ordersError) {
      console.error("Error checking customer orders:", ordersError);
      return res.status(500).json({
        success: false,
        message: "Failed to check customer orders",
        error: ordersError.message,
      });
    }

    if (orders && orders.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete customer with existing orders"
      });
    }

    const { error } = await client
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      console.error("Error deleting customer:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete customer",
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Customer deleted successfully"
    });
  } catch (error) {
    console.error("Error in deleteCustomer:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get customer order history
const getCustomerOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const organizationId = req.user.organization_id;
    const client = req.supabase || supabase;

    // Verify customer exists and belongs to organization
    const { data: customer, error: customerError } = await client
      .from("customers")
      .select("id, name, phone")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const offset = (page - 1) * limit;

    const { data: orders, error } = await client
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          medicine_id,
          quantity,
          unit_price,
          total_price,
          medicines (name, generic_name)
        )
      `)
      .eq("customer_name", customer.name)
      .eq("customer_phone", customer.phone)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching customer order history:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch customer order history",
        error: error.message,
      });
    }

    // Get total count
    const { count: totalCount } = await client
      .from("orders")
      .select("*", { count: 'exact', head: true })
      .eq("customer_name", customer.name)
      .eq("customer_phone", customer.phone)
      .eq("organization_id", organizationId);

    res.json({
      success: true,
      data: {
        orders: orders || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error("Error in getCustomerOrderHistory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get customer pending balance
const getCustomerPendingBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const client = req.supabase || supabase;

    // Verify customer exists
    const { data: customer, error: customerError } = await client
      .from("customers")
      .select("id, name, phone")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Calculate pending balance from unpaid orders (using customer name/phone since customer_id doesn't exist)
    // Since paid_amount column doesn't exist, we'll consider all non-completed orders as pending
    const { data: pendingOrders, error } = await client
      .from("orders")
      .select("total_amount")
      .eq("customer_name", customer.name)
      .eq("customer_phone", customer.phone)
      .eq("organization_id", organizationId)
      .neq("status", "cancelled")
      .neq("status", "completed");

    if (error) {
      console.error("Error calculating pending balance:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to calculate pending balance",
        error: error.message,
      });
    }

    let pendingBalance = 0;
    if (pendingOrders) {
      pendingBalance = pendingOrders.reduce((total, order) => {
        return total + (order.total_amount || 0);
      }, 0);
    }

    res.json({
      success: true,
      data: {
        pendingBalance: parseFloat(pendingBalance.toFixed(2))
      }
    });
  } catch (error) {
    console.error("Error in getCustomerPendingBalance:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get customer statistics
const getCustomerStats = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const client = req.supabase || supabase;

    // Verify customer exists
    const { data: customer, error: customerError } = await client
      .from("customers")
      .select("id, name, phone, created_at")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Get order statistics (using customer_name and customer_phone since customer_id doesn't exist)
    const { data: orderStats, error: orderError } = await client
      .from("orders")
      .select("total_amount, status, created_at")
      .eq("customer_name", customer.name)
      .eq("customer_phone", customer.phone)
      .eq("organization_id", organizationId);

    if (orderError) {
      console.error("Error fetching order stats:", orderError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch customer statistics",
        error: orderError.message,
      });
    }

    const stats = {
      totalOrders: orderStats?.length || 0,
      totalSpent: orderStats?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
      completedOrders: orderStats?.filter(order => order.status === 'completed').length || 0,
      pendingOrders: orderStats?.filter(order => order.status === 'pending').length || 0,
      lastOrderDate: orderStats?.length > 0 ? 
        orderStats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at : null,
      customerSince: customer.created_at
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error("Error in getCustomerStats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get customer medication history
const getCustomerMedicationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const organizationId = req.user.organization_id;
    const client = req.supabase || supabase;

    // Verify customer exists
    const { data: customer, error: customerError } = await client
      .from("customers")
      .select("id, name, phone")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const offset = (page - 1) * limit;

    // Get medication history from order items (using customer_name and customer_phone since customer_id doesn't exist)
    const { data: medicationHistory, error } = await client
      .from("order_items")
      .select(`
        medicine_id,
        quantity,
        unit_price,
        total_price,
        medicines (name, generic_name, manufacturer, strength),
        orders!inner (customer_name, customer_phone, created_at, status)
      `)
      .eq("orders.customer_name", customer.name)
      .eq("orders.customer_phone", customer.phone)
      .eq("orders.organization_id", organizationId)
      .neq("orders.status", "cancelled")
      .order("orders.created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching medication history:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch medication history",
        error: error.message,
      });
    }

    // Get total count (using customer_name and customer_phone since customer_id doesn't exist)
    const { count: totalCount } = await client
      .from("order_items")
      .select("*, orders!inner (customer_name, customer_phone)", { count: 'exact', head: true })
      .eq("orders.customer_name", customer.name)
      .eq("orders.customer_phone", customer.phone)
      .eq("orders.organization_id", organizationId)
      .neq("orders.status", "cancelled");

    res.json({
      success: true,
      data: {
        medications: medicationHistory || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error("Error in getCustomerMedicationHistory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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