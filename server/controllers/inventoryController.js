const { supabase } = require('../config/supabase');
const RefactoredPurchaseOrder = require('../models/RefactoredPurchaseOrder');
const RefactoredSupplier = require('../models/RefactoredSupplier');
const { asyncHandler, createSuccessResponse, createErrorResponse, AppError } = require('../utils/errors');
const { validateRequiredFields, sanitizeString } = require('../utils/validators');

// Get all inventory items with low stock filtering
const getInventory = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    stockFilter = 'all', // all, low-stock, out-of-stock, critical
    sortBy = 'name',
    sortOrder = 'asc',
    supplierId = null
  } = req.query;
  
  const organizationId = req.user.organization_id;
  
  let query = supabase
    .from('medicines')
    .select(`
      *,
      supplier:suppliers(id, name, contact_person, phone, email)
    `, { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('is_active', true);
  
  // Apply search filter
  if (search) {
    const searchTerm = sanitizeString(search, { trim: true, removeHtml: true });
    query = query.or(`
      name.ilike.%${searchTerm}%,
      generic_name.ilike.%${searchTerm}%,
      manufacturer.ilike.%${searchTerm}%,
      batch_number.ilike.%${searchTerm}%
    `);
  }
  
  // Apply supplier filter
  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }
  
  // Apply stock filters
  switch (stockFilter) {
    case 'out-of-stock':
      query = query.eq('quantity', 0);
      break;
    case 'low-stock':
      query = query.filter('quantity', 'gt', 0)
                   .filter('quantity', 'lte', 'low_stock_threshold');
      break;
    case 'critical':
      query = query.filter('quantity', 'lte', 5); // Critical threshold
      break;
    case 'needs-reorder':
      query = query.filter('quantity', 'lte', 'low_stock_threshold');
      break;
  }
  
  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  
  // Apply pagination
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);
  
  const { data: medicines, error, count } = await query;
  
  if (error) {
    throw new AppError('Failed to fetch inventory: ' + error.message, 500);
  }
  
  // Calculate inventory statistics
  const stats = await getInventoryStats(organizationId);
  
  const pagination = {
    page: parseInt(page),
    limit: parseInt(limit),
    total: count,
    totalPages: Math.ceil(count / limit)
  };
  
  res.json(createSuccessResponse(
    medicines || [],
    'Inventory fetched successfully',
    { pagination, stats }
  ));
});

// Get inventory statistics
const getInventoryStats = async (organizationId) => {
  try {
    const { data: stats, error } = await supabase
      .from('medicines')
      .select('quantity, low_stock_threshold, expiry_date')
      .eq('organization_id', organizationId)
      .eq('is_active', true);
    
    if (error) throw error;
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const totalItems = stats.length;
    const outOfStock = stats.filter(item => item.quantity === 0).length;
    const lowStock = stats.filter(item => 
      item.quantity > 0 && item.quantity <= item.low_stock_threshold
    ).length;
    const critical = stats.filter(item => item.quantity <= 5).length;
    const expiringSoon = stats.filter(item => {
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= thirtyDaysFromNow && expiryDate > now;
    }).length;
    const expired = stats.filter(item => {
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= now;
    }).length;
    
    return {
      totalItems,
      outOfStock,
      lowStock,
      critical,
      expiringSoon,
      expired,
      needsReorder: outOfStock + lowStock
    };
  } catch (error) {
    console.error('Error calculating inventory stats:', error);
    return {
      totalItems: 0,
      outOfStock: 0,
      lowStock: 0,
      critical: 0,
      expiringSoon: 0,
      expired: 0,
      needsReorder: 0
    };
  }
};

// Get low stock items
const getLowStockItems = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;
  const organizationId = req.user.organization_id;
  
  const { data: lowStockItems, error } = await supabase
    .rpc('get_low_stock_medicines', { org_id: organizationId })
    .limit(parseInt(limit));
  
  if (error) {
    throw new AppError('Failed to fetch low stock items: ' + error.message, 500);
  }
  
  res.json(createSuccessResponse(
    lowStockItems || [],
    'Low stock items fetched successfully'
  ));
});

// Get expiring items
const getExpiringItems = asyncHandler(async (req, res) => {
  const { days = 30, limit = 50 } = req.query;
  const organizationId = req.user.organization_id;
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + parseInt(days));
  
  const { data: expiringItems, error } = await supabase
    .from('medicines')
    .select(`
      *,
      supplier:suppliers(id, name, contact_person)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .lte('expiry_date', futureDate.toISOString().split('T')[0])
    .gte('expiry_date', new Date().toISOString().split('T')[0])
    .order('expiry_date', { ascending: true })
    .limit(parseInt(limit));
  
  if (error) {
    throw new AppError('Failed to fetch expiring items: ' + error.message, 500);
  }
  
  res.json(createSuccessResponse(
    expiringItems || [],
    'Expiring items fetched successfully'
  ));
});

// Generate automatic purchase orders for low stock items
const generateAutoPurchaseOrders = asyncHandler(async (req, res) => {
  const { 
    groupBySupplier = true,
    minOrderValue = 100,
    autoApprove = false 
  } = req.body;
  
  const organizationId = req.user.organization_id;
  const userId = req.user.id;
  
  try {
    // Get low stock items with supplier information
    const { data: lowStockItems, error: lowStockError } = await supabase
      .from('medicines')
      .select(`
        *,
        supplier:suppliers!inner(*)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .filter('quantity', 'lte', 'low_stock_threshold')
      .eq('suppliers.is_active', true);
    
    if (lowStockError) {
      throw new AppError('Failed to fetch low stock items: ' + lowStockError.message, 500);
    }
    
    if (!lowStockItems || lowStockItems.length === 0) {
      return res.json(createSuccessResponse(
        [],
        'No low stock items found that require reordering'
      ));
    }
    
    const createdOrders = [];
    
    if (groupBySupplier) {
      // Group items by supplier
      const supplierGroups = lowStockItems.reduce((groups, item) => {
        const supplierId = item.supplier.id;
        if (!groups[supplierId]) {
          groups[supplierId] = {
            supplier: item.supplier,
            items: []
          };
        }
        groups[supplierId].items.push(item);
        return groups;
      }, {});
      
      // Create purchase orders for each supplier
      for (const [supplierId, group] of Object.entries(supplierGroups)) {
        const orderItems = group.items.map(item => ({
          medicineId: item.id,
          quantity: calculateReorderQuantity(item),
          unitCost: item.cost_price || 0,
          totalCost: (item.cost_price || 0) * calculateReorderQuantity(item)
        }));
        
        const totalValue = orderItems.reduce((sum, item) => sum + item.totalCost, 0);
        
        // Only create order if it meets minimum value threshold
        if (totalValue >= minOrderValue) {
          const purchaseOrderData = {
            supplierId: supplierId,
            items: orderItems,
            notes: `Auto-generated purchase order for low stock items. Generated on ${new Date().toLocaleDateString()}`,
            status: autoApprove ? 'approved' : 'pending',
            organizationId,
            orderDate: new Date().toISOString().split('T')[0],
            createdBy: userId,
            expectedDeliveryDate: calculateExpectedDeliveryDate(group.supplier.payment_terms || 7)
          };
          
          const purchaseOrder = new RefactoredPurchaseOrder(purchaseOrderData);
          await purchaseOrder.save(userId);
          
          createdOrders.push({
            id: purchaseOrder.id,
            poNumber: purchaseOrder.poNumber,
            supplier: group.supplier.name,
            totalAmount: purchaseOrder.totalAmount,
            itemCount: orderItems.length,
            status: purchaseOrder.status
          });
        }
      }
    } else {
      // Create individual orders for each item
      for (const item of lowStockItems) {
        const orderItems = [{
          medicineId: item.id,
          quantity: calculateReorderQuantity(item),
          unitCost: item.cost_price || 0,
          totalCost: (item.cost_price || 0) * calculateReorderQuantity(item)
        }];
        
        const totalValue = orderItems[0].totalCost;
        
        if (totalValue >= minOrderValue) {
          const purchaseOrderData = {
            supplierId: item.supplier.id,
            items: orderItems,
            notes: `Auto-generated purchase order for ${item.name} (Low Stock Alert)`,
            status: autoApprove ? 'approved' : 'pending',
            organizationId,
            orderDate: new Date().toISOString().split('T')[0],
            createdBy: userId,
            expectedDeliveryDate: calculateExpectedDeliveryDate(item.supplier.payment_terms || 7)
          };
          
          const purchaseOrder = new RefactoredPurchaseOrder(purchaseOrderData);
          await purchaseOrder.save(userId);
          
          createdOrders.push({
            id: purchaseOrder.id,
            poNumber: purchaseOrder.poNumber,
            supplier: item.supplier.name,
            totalAmount: purchaseOrder.totalAmount,
            itemCount: 1,
            status: purchaseOrder.status
          });
        }
      }
    }
    
    res.json(createSuccessResponse(
      createdOrders,
      `Successfully generated ${createdOrders.length} automatic purchase orders`,
      {
        totalItemsProcessed: lowStockItems.length,
        ordersCreated: createdOrders.length,
        groupedBySupplier: groupBySupplier,
        autoApproved: autoApprove
      }
    ));
    
  } catch (error) {
    console.error('Error generating auto purchase orders:', error);
    throw new AppError('Failed to generate automatic purchase orders: ' + error.message, 500);
  }
});

// Helper function to calculate reorder quantity
const calculateReorderQuantity = (item) => {
  // Calculate reorder quantity based on:
  // 1. Current stock level
  // 2. Low stock threshold
  // 3. Average monthly sales (if available)
  // 4. Lead time considerations
  
  const currentStock = item.quantity || 0;
  const lowStockThreshold = item.low_stock_threshold || 10;
  const safetyStock = Math.max(lowStockThreshold * 2, 50); // 2x threshold or minimum 50
  
  // Calculate how much we need to reach safety stock level
  const reorderQuantity = Math.max(safetyStock - currentStock, lowStockThreshold);
  
  // Round up to nearest 10 for practical ordering
  return Math.ceil(reorderQuantity / 10) * 10;
};

// Helper function to calculate expected delivery date
const calculateExpectedDeliveryDate = (paymentTerms) => {
  const deliveryDays = paymentTerms || 7; // Default 7 days
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + deliveryDays);
  return expectedDate.toISOString().split('T')[0];
};

// Get reorder suggestions
const getReorderSuggestions = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;
  
  const { data: suggestions, error } = await supabase
    .from('medicines')
    .select(`
      *,
      supplier:suppliers(*)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .filter('quantity', 'lte', 'low_stock_threshold')
    .eq('suppliers.is_active', true)
    .order('quantity', { ascending: true });
  
  if (error) {
    throw new AppError('Failed to fetch reorder suggestions: ' + error.message, 500);
  }
  
  // Group suggestions by supplier and calculate totals
  const supplierSuggestions = suggestions.reduce((groups, item) => {
    const supplierId = item.supplier?.id;
    if (!supplierId) return groups;
    
    if (!groups[supplierId]) {
      groups[supplierId] = {
        supplier: item.supplier,
        items: [],
        totalValue: 0,
        totalItems: 0
      };
    }
    
    const reorderQty = calculateReorderQuantity(item);
    const itemValue = (item.cost_price || 0) * reorderQty;
    
    groups[supplierId].items.push({
      ...item,
      suggestedQuantity: reorderQty,
      estimatedCost: itemValue
    });
    groups[supplierId].totalValue += itemValue;
    groups[supplierId].totalItems += 1;
    
    return groups;
  }, {});
  
  res.json(createSuccessResponse(
    Object.values(supplierSuggestions),
    'Reorder suggestions fetched successfully'
  ));
});

// Update inventory item
const updateInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    quantity, 
    low_stock_threshold, 
    cost_price, 
    selling_price,
    notes 
  } = req.body;
  
  const organizationId = req.user.organization_id;
  const userId = req.user.id;
  
  // Validate the medicine exists and belongs to the organization
  const { data: existingMedicine, error: fetchError } = await supabase
    .from('medicines')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();
  
  if (fetchError || !existingMedicine) {
    throw new AppError('Medicine not found', 404);
  }
  
  const updateData = {
    updated_at: new Date().toISOString()
  };
  
  if (quantity !== undefined) updateData.quantity = quantity;
  if (low_stock_threshold !== undefined) updateData.low_stock_threshold = low_stock_threshold;
  if (cost_price !== undefined) updateData.cost_price = cost_price;
  if (selling_price !== undefined) updateData.selling_price = selling_price;
  
  const { data: updatedMedicine, error: updateError } = await supabase
    .from('medicines')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();
  
  if (updateError) {
    throw new AppError('Failed to update inventory item: ' + updateError.message, 500);
  }
  
  // Log inventory transaction if quantity changed
  if (quantity !== undefined && quantity !== existingMedicine.quantity) {
    const quantityChange = quantity - existingMedicine.quantity;
    
    await supabase
      .from('inventory_transactions')
      .insert({
        medicine_id: id,
        organization_id: organizationId,
        transaction_type: quantityChange > 0 ? 'adjustment_in' : 'adjustment_out',
        quantity: Math.abs(quantityChange),
        unit_price: cost_price || existingMedicine.cost_price,
        total_amount: Math.abs(quantityChange) * (cost_price || existingMedicine.cost_price),
        reference_type: 'manual_adjustment',
        notes: notes || 'Manual inventory adjustment',
        created_by: userId
      });
  }
  
  res.json(createSuccessResponse(
    updatedMedicine,
    'Inventory item updated successfully'
  ));
});

module.exports = {
  getInventory,
  getLowStockItems,
  getExpiringItems,
  generateAutoPurchaseOrders,
  getReorderSuggestions,
  updateInventoryItem,
  getInventoryStats
};