const express = require("express");
const router = express.Router();
const {
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
  applyPurchaseOrder,
} = require("../controllers/refactoredPurchaseOrderController");
const { auth, checkRole } = require("../middleware/auth");
const {
  validatePurchaseOrderInput,
  validatePurchaseOrderUpdate,
  validateReceiveItems,
  validatePurchaseOrderQuery,
  validateReportQuery,
} = require("../middleware/validation");
const { defaultLimiter, reportLimiter } = require("../middleware/rateLimiter");

// Apply authentication to all routes
router.use(auth);

// Apply role-based access control
router.use(checkRole(["admin", "manager", "warehouse"]));

// Get purchase order statistics
router.get("/stats", getPurchaseOrderStats);

// Get overdue purchase orders
router.get("/overdue", getOverduePurchaseOrders);

// Generate purchase order report
router.get(
  "/report",
  checkRole(["admin", "manager"]),
  generatePurchaseOrderReport
);

// Get purchase orders by supplier
router.get("/supplier/:supplierId", getPurchaseOrdersBySupplier);

// Get all purchase orders with pagination and filters
router.get("/", getAllPurchaseOrders);

// Get single purchase order
router.get("/:id", getPurchaseOrder);

// Create new purchase order
router.post(
  "/",
  checkRole(["admin", "manager", "warehouse"]),
  validatePurchaseOrderInput,
  createPurchaseOrder
);

// Update purchase order
router.put(
  "/:id",
  checkRole(["admin", "manager", "warehouse"]),
  validatePurchaseOrderUpdate,
  updatePurchaseOrder
);

// Approve purchase order
router.patch(
  "/:id/approve",
  checkRole(["admin", "manager"]),
  approvePurchaseOrder
);

// Mark purchase order as ordered
router.patch(
  "/:id/mark-ordered",
  checkRole(["admin", "manager", "warehouse"]),
  markAsOrdered
);

// Receive purchase order items (Universal endpoint for all receive operations)
router.patch(
  "/:id/receive",
  checkRole(["admin", "manager", "warehouse"]),
  validateReceiveItems,
  receivePurchaseOrder
);

// Cancel purchase order
router.patch(
  "/:id/cancel",
  checkRole(["admin", "manager"]),
  cancelPurchaseOrder
);

// Apply purchase order
router.patch("/:id/apply", checkRole(["admin", "manager"]), applyPurchaseOrder);

module.exports = router;
