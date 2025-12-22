const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");
const { query } = require("../config/database");

// Protected routes - only admin role
router.use(auth);
router.use(checkRole(["admin"]));

// GET /api/reports/sales
router.get("/sales", (req, res) => {
  res.json({ message: "Get sales report" });
});

// GET /api/reports/inventory
router.get("/inventory", (req, res) => {
  res.json({ message: "Get inventory report" });
});

// GET /api/reports/profit
router.get("/profit", (req, res) => {
  res.json({ message: "Get profit report" });
});

// GET /api/reports/suppliers
router.get("/suppliers", (req, res) => {
  res.json({ message: "Get supplier report" });
});

/**
 * GET /api/reports/schedule-h
 * Schedule H/H1 Drug Sales Report (Regulatory Compliance)
 * Returns all sales of prescription-required drugs with patient/doctor info
 */
router.get("/schedule-h", async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const { startDate, endDate } = req.query;

    // Default to last 30 days if no dates provided
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    // Query: Get all orders containing prescription-required products
    const result = await query(
      `SELECT 
        o.id as order_id,
        o.order_number,
        o.customer_name as patient_name,
        o.customer_phone as patient_phone,
        o.notes as prescription_info,
        o.created_at as sale_date,
        o.total_amount,
        p.id as product_id,
        p.name as drug_name,
        p.manufacturer,
        oi.quantity as quantity_sold,
        oi.unit_price,
        b.batch_number,
        b.expiry_date
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.medicine_id = p.id
       LEFT JOIN inventory_batches b ON p.id = b.product_id AND b.organization_id = $1
       WHERE o.organization_id = $1 
       AND p.prescription_required = true
       AND o.created_at >= $2 
       AND o.created_at <= $3
       ORDER BY o.created_at DESC`,
      [organizationId, start, end]
    );

    // Group by order for cleaner report
    const ordersMap = new Map();
    for (const row of result.rows) {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          orderId: row.order_id,
          orderNumber: row.order_number,
          patientName: row.patient_name || 'N/A',
          patientPhone: row.patient_phone || 'N/A',
          prescriptionInfo: row.prescription_info || 'N/A',
          saleDate: row.sale_date,
          totalAmount: row.total_amount,
          drugs: []
        });
      }
      ordersMap.get(row.order_id).drugs.push({
        productId: row.product_id,
        drugName: row.drug_name,
        manufacturer: row.manufacturer,
        quantitySold: row.quantity_sold,
        unitPrice: row.unit_price,
        batchNumber: row.batch_number || 'N/A',
        expiryDate: row.expiry_date
      });
    }

    const report = Array.from(ordersMap.values());

    res.json({
      success: true,
      data: {
        reportType: "Schedule H/H1 Drug Sales",
        generatedAt: new Date().toISOString(),
        period: { start, end },
        totalTransactions: report.length,
        transactions: report
      }
    });
  } catch (error) {
    console.error("Schedule H report error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating Schedule H report"
    });
  }
});

/**
 * GET /api/reports/rtv-suggestions
 * Return-to-Vendor Suggestions (Near-Expiry Stock)
 * Identifies batches expiring within 60 days that should be returned to suppliers
 */
router.get("/rtv-suggestions", async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const { daysThreshold = 60 } = req.query;

    const result = await query(
      `SELECT 
        b.id as batch_id,
        p.id as product_id,
        p.name as product_name,
        p.manufacturer,
        b.batch_number,
        b.quantity,
        b.cost_price,
        b.selling_price,
        b.expiry_date,
        s.id as supplier_id,
        s.name as supplier_name,
        s.phone as supplier_phone,
        s.email as supplier_email,
        (b.quantity * b.cost_price) as potential_loss,
        CASE 
          WHEN b.expiry_date <= CURRENT_DATE THEN 'expired'
          WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'critical'
          WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'urgent'
          ELSE 'warning'
        END as urgency
       FROM inventory_batches b
       JOIN products p ON b.product_id = p.id
       LEFT JOIN suppliers s ON b.supplier_id = s.id
       WHERE b.organization_id = $1 
       AND b.is_active = true
       AND b.quantity > 0
       AND b.expiry_date <= CURRENT_DATE + INTERVAL '${parseInt(daysThreshold)} days'
       ORDER BY b.expiry_date ASC`,
      [organizationId]
    );

    const batches = result.rows;

    // Group by supplier for easier RTV processing
    const supplierGroups = new Map();
    let totalPotentialLoss = 0;

    for (const batch of batches) {
      const supplierId = batch.supplier_id || 'unknown';
      if (!supplierGroups.has(supplierId)) {
        supplierGroups.set(supplierId, {
          supplierId: batch.supplier_id,
          supplierName: batch.supplier_name || 'Unknown Supplier',
          supplierPhone: batch.supplier_phone,
          supplierEmail: batch.supplier_email,
          batches: [],
          totalValue: 0
        });
      }
      const group = supplierGroups.get(supplierId);
      group.batches.push({
        batchId: batch.batch_id,
        productId: batch.product_id,
        productName: batch.product_name,
        manufacturer: batch.manufacturer,
        batchNumber: batch.batch_number,
        quantity: batch.quantity,
        costPrice: parseFloat(batch.cost_price),
        expiryDate: batch.expiry_date,
        urgency: batch.urgency,
        potentialLoss: parseFloat(batch.potential_loss)
      });
      group.totalValue += parseFloat(batch.potential_loss);
      totalPotentialLoss += parseFloat(batch.potential_loss);
    }

    res.json({
      success: true,
      data: {
        reportType: "Return-to-Vendor Suggestions",
        generatedAt: new Date().toISOString(),
        daysThreshold: parseInt(daysThreshold),
        summary: {
          totalBatches: batches.length,
          totalPotentialLoss: totalPotentialLoss,
          supplierCount: supplierGroups.size,
          expired: batches.filter(b => b.urgency === 'expired').length,
          critical: batches.filter(b => b.urgency === 'critical').length,
          urgent: batches.filter(b => b.urgency === 'urgent').length
        },
        supplierGroups: Array.from(supplierGroups.values())
      }
    });
  } catch (error) {
    console.error("RTV suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating RTV suggestions"
    });
  }
});

module.exports = router;

