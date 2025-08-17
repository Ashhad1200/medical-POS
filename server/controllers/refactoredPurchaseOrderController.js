const RefactoredPurchaseOrder = require('../models/RefactoredPurchaseOrder');
const RefactoredSupplier = require('../models/RefactoredSupplier');
const { asyncHandler, createSuccessResponse, createErrorResponse, AppError } = require('../utils/errors');
const { validateRequiredFields, sanitizeString, validateDate } = require('../utils/validators');
const { supabase } = require('../config/supabase');

// Get all purchase orders with pagination and filters
const getAllPurchaseOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status = null,
    supplierId = null,
    startDate = null,
    endDate = null,
    sortBy = 'order_date',
    sortOrder = 'desc'
  } = req.query;
  
  const organizationId = req.user.organization_id;
  
  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100),
    status,
    supplierId,
    startDate,
    endDate,
    sortBy,
    sortOrder
  };
  
  const result = await RefactoredPurchaseOrder.findByOrganization(organizationId, options);
  
  res.json(createSuccessResponse(
    result.purchaseOrders,
    'Purchase orders fetched successfully',
    { pagination: result.pagination }
  ));
});

// Get single purchase order
const getPurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  
  const purchaseOrder = await RefactoredPurchaseOrder.findById(id, organizationId, true);
  
  // Get status history
  const statusHistory = await purchaseOrder.getStatusHistory();
  
  res.json(createSuccessResponse({
    ...purchaseOrder,
    statusHistory
  }, 'Purchase order fetched successfully'));
});

// Create new purchase order
const createPurchaseOrder = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;
  const userId = req.user.id;
  
  console.log('Received purchase order data:', JSON.stringify(req.body, null, 2));
  
  // Validate required fields
  const requiredFields = ['supplierId', 'items'];
  const missingFields = validateRequiredFields(req.body, requiredFields);
  
  if (missingFields.length > 0) {
    return res.status(400).json(createErrorResponse(
      `Missing required fields: ${missingFields.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    ));
  }
  
  // Validate supplier exists
  const supplier = await RefactoredSupplier.findById(req.body.supplierId, organizationId);
  if (!supplier.isActive) {
    throw new AppError('Cannot create purchase order for inactive supplier', 400);
  }
  
  // Validate medicines exist
  const medicineIds = req.body.items.map(item => item.medicineId || item.medicine_id);
  const { data: medicines, error: medicineError } = await supabase
    .from('medicines')
    .select('id, name')
    .eq('organization_id', organizationId)
    .in('id', medicineIds);
  
  if (medicineError) {
    throw new AppError('Failed to validate medicines: ' + medicineError.message, 500);
  }
  
  if (medicines.length !== medicineIds.length) {
    throw new AppError('One or more medicines not found', 400);
  }
  
  const purchaseOrderData = {
    ...req.body,
    organizationId,
    orderDate: req.body.orderDate || new Date().toISOString().split('T')[0],
    createdBy: userId
  };
  
  const purchaseOrder = new RefactoredPurchaseOrder(purchaseOrderData);
  await purchaseOrder.save(userId);
  
  res.status(201).json(createSuccessResponse(
    purchaseOrder,
    'Purchase order created successfully'
  ));
});

// Update purchase order
const updatePurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const userId = req.user.id;
  
  const purchaseOrder = await RefactoredPurchaseOrder.findById(id, organizationId, true);
  
  if (!purchaseOrder.canEdit()) {
    throw new AppError('Cannot edit purchase order in current status', 400);
  }
  
  // If supplier is being changed, validate it
  if (req.body.supplierId && req.body.supplierId !== purchaseOrder.supplierId) {
    const supplier = await RefactoredSupplier.findById(req.body.supplierId, organizationId);
    if (!supplier.isActive) {
      throw new AppError('Cannot assign inactive supplier', 400);
    }
  }
  
  // If items are being updated, validate medicines
  if (req.body.items) {
    const medicineIds = req.body.items.map(item => item.medicineId || item.medicine_id);
    const { data: medicines, error: medicineError } = await supabase
      .from('medicines')
      .select('id, name')
      .eq('organization_id', organizationId)
      .in('id', medicineIds);
    
    if (medicineError) {
      throw new AppError('Failed to validate medicines: ' + medicineError.message, 500);
    }
    
    if (medicines.length !== medicineIds.length) {
      throw new AppError('One or more medicines not found', 400);
    }
  }
  
  // Update purchase order properties
  Object.assign(purchaseOrder, req.body);
  await purchaseOrder.save(userId);
  
  res.json(createSuccessResponse(
    purchaseOrder,
    'Purchase order updated successfully'
  ));
});

// Approve purchase order
const approvePurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const userId = req.user.id;
  const { notes } = req.body;
  
  const purchaseOrder = await RefactoredPurchaseOrder.findById(id, organizationId);
  
  await purchaseOrder.updateStatus('approved', userId, notes);
  
  res.json(createSuccessResponse(
    purchaseOrder,
    'Purchase order approved successfully'
  ));
});

// Mark purchase order as ordered
const markAsOrdered = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const userId = req.user.id;
  const { notes, expectedDeliveryDate } = req.body;
  
  const purchaseOrder = await RefactoredPurchaseOrder.findById(id, organizationId);
  
  // Update expected delivery date if provided
  if (expectedDeliveryDate) {
    if (!validateDate(expectedDeliveryDate, { allowPast: false })) {
      throw new AppError('Expected delivery date must be in the future', 400);
    }
    purchaseOrder.expectedDeliveryDate = expectedDeliveryDate;
    await purchaseOrder.save(userId);
  }
  
  await purchaseOrder.updateStatus('ordered', userId, notes);
  
  res.json(createSuccessResponse(
    purchaseOrder,
    'Purchase order marked as ordered successfully'
  ));
});

// Receive purchase order items
const receivePurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const userId = req.user.id;
  const { items, notes } = req.body;
  
  if (!items || !Array.isArray(items)) {
    throw new AppError('Items array is required', 400);
  }
  
  const purchaseOrder = await RefactoredPurchaseOrder.findById(id, organizationId, true);
  
  let itemsToReceive = items;
  
  // If empty items array, mark all items as fully received
  if (items.length === 0) {
    itemsToReceive = purchaseOrder.items.map(poItem => ({
      id: poItem.id,
      received_quantity: poItem.quantity - (poItem.received_quantity || 0)
    })).filter(item => item.received_quantity > 0);
  }
  
  // Validate received quantities
  for (const item of itemsToReceive) {
    const poItem = purchaseOrder.items.find(poi => poi.id === item.id);
    if (!poItem) {
      throw new AppError(`Purchase order item ${item.id} not found`, 400);
    }
    
    const totalReceived = (poItem.received_quantity || 0) + (item.received_quantity || 0);
    if (totalReceived > poItem.quantity) {
      throw new AppError(
        `Cannot receive more than ordered quantity for item ${poItem.medicine?.name}`,
        400
      );
    }
    
    if (item.received_quantity < 0) {
      throw new AppError('Received quantity cannot be negative', 400);
    }
  }
  
  const result = await purchaseOrder.receiveItems(itemsToReceive, userId);
  
  // Add notes if provided
  if (notes) {
    await purchaseOrder.updateStatus(purchaseOrder.status, userId, notes);
  }
  
  res.json(createSuccessResponse(
    { purchaseOrder, receivedItems: result },
    'Purchase order items received successfully'
  ));
});

// Cancel purchase order
const cancelPurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const userId = req.user.id;
  const { reason } = req.body;
  
  const purchaseOrder = await RefactoredPurchaseOrder.findById(id, organizationId);
  
  await purchaseOrder.cancel(userId, reason);
  
  res.json(createSuccessResponse(
    purchaseOrder,
    'Purchase order cancelled successfully'
  ));
});

// Get purchase order statistics
const getPurchaseOrderStats = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;
  
  const stats = await RefactoredPurchaseOrder.getStats(organizationId);
  
  res.json(createSuccessResponse(
    stats,
    'Purchase order statistics fetched successfully'
  ));
});

// Get overdue purchase orders
const getOverduePurchaseOrders = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;
  const { page = 1, limit = 10 } = req.query;
  
  const today = new Date().toISOString().split('T')[0];
  
  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100),
    status: 'ordered',
    endDate: today,
    sortBy: 'expected_delivery_date',
    sortOrder: 'asc'
  };
  
  const result = await RefactoredPurchaseOrder.findByOrganization(organizationId, options);
  
  // Filter to only include overdue orders
  const overdueOrders = result.purchaseOrders.filter(po => 
    po.expectedDeliveryDate && po.expectedDeliveryDate < today
  );
  
  res.json(createSuccessResponse(
    overdueOrders,
    'Overdue purchase orders fetched successfully',
    { 
      pagination: {
        ...result.pagination,
        total: overdueOrders.length
      }
    }
  ));
});

// Get purchase orders by supplier
const getPurchaseOrdersBySupplier = asyncHandler(async (req, res) => {
  const { supplierId } = req.params;
  const organizationId = req.user.organization_id;
  const { page = 1, limit = 10, status = null } = req.query;
  
  // Validate supplier exists
  await RefactoredSupplier.findById(supplierId, organizationId);
  
  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100),
    supplierId,
    status,
    sortBy: 'order_date',
    sortOrder: 'desc'
  };
  
  const result = await RefactoredPurchaseOrder.findByOrganization(organizationId, options);
  
  res.json(createSuccessResponse(
    result.purchaseOrders,
    'Purchase orders by supplier fetched successfully',
    { pagination: result.pagination }
  ));
});

// Generate purchase order report
const generatePurchaseOrderReport = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;
  const {
    startDate,
    endDate,
    supplierId = null,
    status = null,
    format = 'json'
  } = req.query;
  
  if (!startDate || !endDate) {
    throw new AppError('Start date and end date are required', 400);
  }
  
  if (!validateDate(startDate) || !validateDate(endDate)) {
    throw new AppError('Invalid date format', 400);
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    throw new AppError('Start date cannot be after end date', 400);
  }
  
  const options = {
    page: 1,
    limit: 10000, // Large limit for report
    supplierId,
    status,
    startDate,
    endDate,
    sortBy: 'order_date',
    sortOrder: 'desc'
  };
  
  const result = await RefactoredPurchaseOrder.findByOrganization(organizationId, options);
  
  // Calculate summary statistics
  const summary = {
    totalOrders: result.purchaseOrders.length,
    totalValue: result.purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0),
    statusBreakdown: {},
    supplierBreakdown: {}
  };
  
  result.purchaseOrders.forEach(po => {
    // Status breakdown
    summary.statusBreakdown[po.status] = (summary.statusBreakdown[po.status] || 0) + 1;
    
    // Supplier breakdown
    const supplierName = po.supplier?.name || 'Unknown';
    if (!summary.supplierBreakdown[supplierName]) {
      summary.supplierBreakdown[supplierName] = { count: 0, totalValue: 0 };
    }
    summary.supplierBreakdown[supplierName].count += 1;
    summary.supplierBreakdown[supplierName].totalValue += po.totalAmount;
  });
  
  if (format === 'csv') {
    // Generate CSV report
    const csvHeaders = [
      'PO Number',
      'Supplier',
      'Status',
      'Order Date',
      'Expected Delivery',
      'Actual Delivery',
      'Subtotal',
      'Tax',
      'Discount',
      'Shipping',
      'Total',
      'Payment Status',
      'Created By'
    ];
    
    const csvRows = result.purchaseOrders.map(po => [
      po.poNumber,
      po.supplier?.name || '',
      po.status,
      po.orderDate,
      po.expectedDeliveryDate || '',
      po.actualDeliveryDate || '',
      po.subtotal,
      po.taxAmount,
      po.discountAmount,
      po.shippingCost,
      po.totalAmount,
      po.paymentStatus,
      po.creator?.name || ''
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=purchase-orders-${startDate}-to-${endDate}.csv`);
    res.send(csvContent);
  } else {
    res.json(createSuccessResponse({
      purchaseOrders: result.purchaseOrders,
      summary,
      filters: { startDate, endDate, supplierId, status }
    }, 'Purchase order report generated successfully'));
  }
});

// Mark purchase order as received (for pending/draft orders)
const markAsReceived = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const userId = req.user.id;

  // Get purchase order with items
  const purchaseOrder = await RefactoredPurchaseOrder.findById(id, organizationId, true);
  
  if (!purchaseOrder.canReceive()) {
    throw new AppError('Purchase order cannot be marked as received in current status', 400);
  }

  // Automatically receive all items at full quantity
  const itemsToReceive = purchaseOrder.items.map(item => ({
    id: item.id,
    received_quantity: item.quantity - (item.received_quantity || 0)
  })).filter(item => item.received_quantity > 0);

  if (itemsToReceive.length > 0) {
    // Receive items and update inventory
    await purchaseOrder.receiveItems(itemsToReceive, userId);
  } else {
    // If no items to receive, just update status
    await purchaseOrder.updateStatus('received', userId);
  }

  res.json(createSuccessResponse(
    purchaseOrder,
    'Purchase order marked as received and inventory updated successfully'
  ));
});

// Apply purchase order
const applyPurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const userId = req.user.id;
  const { notes } = req.body;

  // Get purchase order
  const purchaseOrder = await RefactoredPurchaseOrder.findById(id, organizationId);
  
  if (!purchaseOrder.canApply()) {
    throw new AppError('Purchase order cannot be applied in current status', 400);
  }

  // Update status to applied
  await purchaseOrder.updateStatus('applied', userId, notes);

  res.json(createSuccessResponse(
    purchaseOrder,
    'Purchase order applied successfully'
  ));
});

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  markAsOrdered,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderStats,
  getOverduePurchaseOrders,
  getPurchaseOrdersBySupplier,
  generatePurchaseOrderReport,
  markAsReceived,
  applyPurchaseOrder
};