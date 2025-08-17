const { supabase } = require("../config/supabase");

// Get all purchase orders
const getAllPurchaseOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, supplierId } = req.query;
    const organizationId = req.user.organization_id;

    let query = supabase
      .from("purchase_orders")
      .select("*, supplier:suppliers(name, contact_person), created_by_user:users!created_by(username, full_name), purchase_order_items(*, medicine:medicines(id, name, manufacturer, unit, category))", { count: 'exact' })
      .eq("organization_id", organizationId);

    if (status) {
      query = query.eq("status", status);
    }

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: purchaseOrders, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching purchase orders",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: {
        purchaseOrders: purchaseOrders || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || purchaseOrders?.length || 0,
          pages: Math.ceil((count || purchaseOrders?.length || 0) / limit),
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

// Get single purchase order
const getPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const { data: purchaseOrder, error } = await supabase
      .from("purchase_orders")
      .select("*, supplier:suppliers(*), created_by_user:users!created_by(*), purchase_order_items(*, medicine:medicines(id, name, manufacturer, unit, category))")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (error || !purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      data: { purchaseOrder },
    });
  } catch (error) {
    console.error("Get purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching purchase order",
    });
  }
};

// Create purchase order
const createPurchaseOrder = async (req, res) => {
  try {
    const {
      supplier_id,
      items,
      expected_delivery_date,
      notes,
      tax_percent = 0,
      discount_amount = 0,
    } = req.body;
    const organizationId = req.user.organization_id;

    // Validate supplier exists (only if supplier_id is provided)
    let supplier = null;
    if (supplier_id) {
      const { data: supplierData, error: supplierError } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("id", supplier_id)
        .eq("organization_id", organizationId)
        .single();

      if (supplierError || !supplierData) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }
      supplier = supplierData;
    }

    // Validate and process items
    let subtotal = 0;
    const processedItems = [];
    
    for (const item of items) {
      let medicineId = item.medicine_id;
      
      // If medicine_id is null or undefined, create a new medicine
      if (!medicineId && item.medicineName) {
        const { data: newMedicine, error: createError } = await supabase
          .from("medicines")
          .insert({
            name: item.medicineName,
            manufacturer: "Unknown",
            category: "General",
            unit: "Piece",
            trade_price: item.unit_cost || 0,
            mrp: (item.unit_cost || 0) * 1.2, // 20% markup as default
            stock_quantity: 0,
            min_stock_level: 10,
            organization_id: organizationId,
            created_by: req.user.id
          })
          .select("id")
          .single();
          
        if (createError) {
          return res.status(400).json({
            success: false,
            message: `Error creating medicine ${item.medicineName}: ${createError.message}`,
          });
        }
        
        medicineId = newMedicine.id;
      } else if (medicineId) {
        // Validate existing medicine
        const { data: medicine, error: medicineError } = await supabase
          .from("medicines")
          .select("id, name, manufacturer")
          .eq("id", medicineId)
          .eq("organization_id", organizationId)
          .single();

        if (medicineError || !medicine) {
          return res.status(404).json({
            success: false,
            message: `Medicine with ID ${medicineId} not found`,
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Either medicine_id or medicineName must be provided",
        });
      }
      
      processedItems.push({
        ...item,
        medicine_id: medicineId,
        unit_price: item.unit_cost || item.unit_price
      });
      
      subtotal += item.quantity * (item.unit_cost || item.unit_price);
    }

    // Calculate totals
    const taxAmount = (subtotal * parseFloat(tax_percent)) / 100;
    const total = subtotal + taxAmount - parseFloat(discount_amount);

    // Create purchase order
    const { data: purchaseOrder, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: `PO-${Date.now()}`,
        supplier_id: supplier_id || null,
        total_amount: total,
        tax_amount: taxAmount,
        discount: parseFloat(discount_amount),
        status: 'pending', // Default to pending status
        expected_delivery: expected_delivery_date,
        notes,
        organization_id: organizationId,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (poError) {
      return res.status(400).json({
        success: false,
        message: "Error creating purchase order",
        error: poError.message,
      });
    }

    // Create purchase order items
    const purchaseOrderItems = processedItems.map((item) => ({
      purchase_order_id: purchaseOrder.id,
      medicine_id: item.medicine_id,
      quantity: item.quantity,
      unit_cost: item.unit_price,
      total_cost: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase
      .from("purchase_order_items")
      .insert(purchaseOrderItems);

    if (itemsError) {
      // Rollback purchase order creation if items fail
      await supabase.from("purchase_orders").delete().eq("id", purchaseOrder.id);
      return res.status(400).json({
        success: false,
        message: "Error creating purchase order items",
        error: itemsError.message,
      });
    }

    res.status(201).json({
      success: true,
      data: { purchaseOrder },
    });
  } catch (error) {
    console.error("Create purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating purchase order",
    });
  }
};

// Update purchase order
const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier_id,
      items,
      expected_delivery_date,
      notes,
      tax_percent,
      discount_amount,
      status,
    } = req.body;
    const organizationId = req.user.organization_id;

    // Fetch the existing purchase order
    const { data: existingOrder, error: fetchError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (existingOrder.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a purchase order that is not pending",
      });
    }

    // Prepare update data
    const updateData = {
      supplier_id,
      expected_delivery: expected_delivery_date,
      notes,
      discount: discount_amount,
      status,
    };

    // If items are being updated, recalculate totals
    if (items) {
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.quantity * item.unit_price;
      }
      const taxAmount = (subtotal * parseFloat(tax_percent)) / 100;
      const total = subtotal + taxAmount - parseFloat(discount_amount);
      updateData.subtotal = subtotal;
      updateData.tax_amount = taxAmount;
      updateData.total_amount = total;
    }

    // Update the purchase order
    const { data: purchaseOrder, error: updateError } = await supabase
      .from("purchase_orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({
        success: false,
        message: "Error updating purchase order",
        error: updateError.message,
      });
    }

    // Update purchase order items
    if (items) {
      // Delete existing items
      await supabase.from("purchase_order_items").delete().eq("purchase_order_id", id);

      // Insert new items
      const purchaseOrderItems = items.map((item) => ({
        purchase_order_id: id,
        medicine_id: item.medicine_id,
        quantity: item.quantity,
        unit_cost: item.unit_price,
        total_cost: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(purchaseOrderItems);

      if (itemsError) {
        return res.status(400).json({
          success: false,
          message: "Error updating purchase order items",
          error: itemsError.message,
        });
      }
    }

    res.json({
      success: true,
      data: { purchaseOrder },
    });
  } catch (error) {
    console.error("Update purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating purchase order",
    });
  }
};

// Mark purchase order as received and update inventory
const receivePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const organizationId = req.user.organization_id;

    const { data: purchaseOrder, error: fetchError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (purchaseOrder.status !== "ordered") {
      return res.status(400).json({
        success: false,
        message: "Purchase order must be ordered to be received",
      });
    }

    for (const item of items) {
      await supabase.rpc("update_medicine_stock", {
        med_id: item.medicine_id,
        org_id: organizationId,
        quantity_change: item.quantity,
      });
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("purchase_orders")
      .update({ status: "received", received_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: "Error updating purchase order status",
        error: updateError.message,
      });
    }

    res.json({
      success: true,
      data: { purchaseOrder: updatedOrder },
    });
  } catch (error) {
    console.error("Receive purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Error receiving purchase order",
    });
  }
};

// Cancel purchase order
const cancelPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const { data: updatedOrder, error } = await supabase
      .from("purchase_orders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error || !updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found or could not be cancelled",
      });
    }

    res.json({
      success: true,
      data: { purchaseOrder: updatedOrder },
    });
  } catch (error) {
    console.error("Cancel purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling purchase order",
    });
  }
};

// Mark purchase order as ordered
const markAsOrdered = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const { data: updatedOrder, error } = await supabase
      .from("purchase_orders")
      .update({ status: "ordered" })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .select()
      .single();

    if (error || !updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found or not in pending state",
      });
    }

    res.json({
      success: true,
      data: { purchaseOrder: updatedOrder },
    });
  } catch (error) {
    console.error("Mark as ordered error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking purchase order as ordered",
    });
  }
};

// Get overdue purchase orders
const getOverduePurchaseOrders = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const today = new Date().toISOString();

    const { data: purchaseOrders, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .lt("expected_delivery_date", today);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching overdue purchase orders",
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: { purchaseOrders: purchaseOrders || [] },
    });
  } catch (error) {
    console.error("Get overdue purchase orders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching overdue purchase orders",
    });
  }
};

// Create purchase order without supplier
const createPurchaseOrderWithoutSupplier = async (req, res) => {
  try {
    const {
      items,
      expected_delivery_date,
      notes,
      tax_percent = 0,
      discount_amount = 0,
    } = req.body;
    const organizationId = req.user.organization_id;

    // Validate and process items
    let subtotal = 0;
    const processedItems = [];
    
    for (const item of items) {
      let medicineId = item.medicine_id;
      
      // If medicine_id is null or undefined, create a new medicine
      if (!medicineId && item.medicineName) {
        const { data: newMedicine, error: createError } = await supabase
          .from("medicines")
          .insert({
            name: item.medicineName,
            manufacturer: "Unknown",
            category: "General",
            unit: "Piece",
            trade_price: item.unit_cost || 0,
            mrp: (item.unit_cost || 0) * 1.2, // 20% markup as default
            stock_quantity: 0,
            min_stock_level: 10,
            organization_id: organizationId,
            created_by: req.user.id
          })
          .select("id")
          .single();
          
        if (createError) {
          return res.status(400).json({
            success: false,
            message: `Error creating medicine ${item.medicineName}: ${createError.message}`,
          });
        }
        
        medicineId = newMedicine.id;
      } else if (medicineId) {
        // Validate existing medicine
        const { data: medicine, error: medicineError } = await supabase
          .from("medicines")
          .select("id, name, manufacturer")
          .eq("id", medicineId)
          .eq("organization_id", organizationId)
          .single();

        if (medicineError || !medicine) {
          return res.status(404).json({
            success: false,
            message: `Medicine with ID ${medicineId} not found`,
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Either medicine_id or medicineName must be provided",
        });
      }
      
      processedItems.push({
        ...item,
        medicine_id: medicineId,
        unit_price: item.unit_cost || item.unit_price
      });
      
      subtotal += item.quantity * (item.unit_cost || item.unit_price);
    }

    // Calculate totals
    const taxAmount = (subtotal * parseFloat(tax_percent)) / 100;
    const total = subtotal + taxAmount - parseFloat(discount_amount);

    // Create purchase order without supplier
    const { data: purchaseOrder, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: `PO-${Date.now()}`,
        supplier_id: null,
        total_amount: total,
        tax_amount: taxAmount,
        discount: parseFloat(discount_amount),
        status: 'pending', // Always start with pending status
        expected_delivery: expected_delivery_date,
        notes: notes || 'Order created without supplier',
        organization_id: organizationId,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (poError) {
      return res.status(400).json({
        success: false,
        message: "Error creating purchase order",
        error: poError.message,
      });
    }

    // Create purchase order items
    const purchaseOrderItems = processedItems.map((item) => ({
      purchase_order_id: purchaseOrder.id,
      medicine_id: item.medicine_id,
      quantity: item.quantity,
      unit_cost: item.unit_price,
      total_cost: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase
      .from("purchase_order_items")
      .insert(purchaseOrderItems);

    if (itemsError) {
      // Rollback purchase order creation if items fail
      await supabase.from("purchase_orders").delete().eq("id", purchaseOrder.id);
      return res.status(400).json({
        success: false,
        message: "Error creating purchase order items",
        error: itemsError.message,
      });
    }

    res.status(201).json({
      success: true,
      data: { purchaseOrder },
    });
  } catch (error) {
    console.error("Create purchase order without supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating purchase order without supplier",
    });
  }
};

// Mark purchase order as received (simplified workflow)
const markAsReceived = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Get purchase order
    const { data: purchaseOrder, error: fetchError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (purchaseOrder.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Purchase order must be pending to be marked as received",
      });
    }

    // Update status to received
    const { data: updatedOrder, error: updateError } = await supabase
      .from("purchase_orders")
      .update({ 
        status: "received", 
        actual_delivery: new Date().toISOString().split('T')[0] // Set delivery date to today
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: "Error updating purchase order status",
        error: updateError.message,
      });
    }

    res.json({
      success: true,
      data: { purchaseOrder: updatedOrder },
      message: "Purchase order marked as received successfully",
    });
  } catch (error) {
    console.error("Mark as received error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking purchase order as received",
    });
  }
};

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  markAsOrdered,
  getOverduePurchaseOrders,
  createPurchaseOrderWithoutSupplier,
  markAsReceived,
};
