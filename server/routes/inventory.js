const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");
const {
  getInventorySummary,
  getInventoryAdjustments,
  createInventoryAdjustment,
  getStockMovements,
  getExpiryReport,
  updateReorderLevel,
} = require("../controllers/inventoryController");

// Protected routes
router.use(auth);

// GET /api/inventory/stats - Get inventory statistics
router.get(
  "/stats",
  checkRole(["admin", "warehouse", "manager"]),
  getInventorySummary
);

// GET /api/inventory/adjustments - Get inventory adjustments
router.get(
  "/adjustments",
  checkRole(["admin", "warehouse", "manager"]),
  getInventoryAdjustments
);

// POST /api/inventory/adjustments - Create inventory adjustment
router.post(
  "/adjustments",
  checkRole(["admin", "warehouse", "manager"]),
  createInventoryAdjustment
);

// GET /api/inventory/stock-movements - Get stock movements
router.get(
  "/stock-movements",
  checkRole(["admin", "warehouse", "manager"]),
  getStockMovements
);

// GET /api/inventory/expiry-report - Get expiry report
router.get(
  "/expiry-report",
  checkRole(["admin", "warehouse", "manager"]),
  getExpiryReport
);

// PUT /api/inventory/reorder-level - Update reorder level
router.put(
  "/reorder-level",
  checkRole(["admin", "warehouse", "manager"]),
  updateReorderLevel
);

module.exports = router;
